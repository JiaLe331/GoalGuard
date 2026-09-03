import "server-only";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { getAddress, isAddress, isHexString, ZeroAddress } from "ethers";

import { readServerEnvironment } from "@/lib/config/env";
import type { CandidateRejection, CoverageMode, Goal, ProtectionCandidate, ScenarioResult } from "@/lib/contracts";
import { ApiRouteError } from "@/lib/server/http";
import { fetchEthPutOrders, parseThetanutsMarketData, type ThetanutsOrder, type ThetanutsReadClient, withConfiguredThetanutsRead } from "./client";
import {
  assertSelectableCandidate,
  calculateNormalizedProtectionFloor,
  calculateRequiredGoalQuantity,
  compareProtectionCandidates,
  normalizeGoalTiming,
  P0_GOAL_PROTECTION_POLICY,
  type GoalProtectionPolicy,
} from "@/lib/protection/scoring";
import {
  USDC_DECIMALS,
  decimalToBaseUnits,
  premiumForContracts,
  putCollateralForContracts,
  underlyingFromContractBaseUnits,
  usdFromPriceBaseUnits,
} from "./units";

const decimal = (value: Decimal.Value) => new Decimal(value).toFixed();
const ONE_USDC_BASE_UNITS = 1_000_000n;

function validAddress(value: unknown): value is string {
  return typeof value === "string" && isAddress(value);
}

function timestampMilliseconds(value: bigint): number | null {
  if (value <= 0n || value > BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000))) return null;
  return Number(value * 1000n);
}

function nonNegativeBigInt(value: unknown): bigint | null {
  try {
    const parsed = typeof value === "bigint" || typeof value === "string" || typeof value === "number" ? BigInt(value) : null;
    return parsed === null || parsed < 0n ? null : parsed;
  } catch {
    return null;
  }
}

function previewIsConsistent(
  preview: ReturnType<ThetanutsReadClient["optionBook"]["previewFillOrder"]>,
  order: ThetanutsOrder,
  usdcAddress: string,
  strike: bigint,
): boolean {
  return preview.numContracts > 0n && preview.maxContracts > 0n && preview.numContracts <= preview.maxContracts
    && preview.totalCollateral > 0n && preview.pricePerContract === order.order.price
    && preview.collateralToken.toLowerCase() === usdcAddress.toLowerCase() && !preview.isCall
    && preview.strikes.length === 1 && preview.strikes[0] === strike && preview.expiry === order.order.expiry;
}

export function orderId(order: ThetanutsOrder) { return `${order.makerAddress.toLowerCase()}:${order.order.nonce.toString()}`; }

export function serializeOrder(order: ThetanutsOrder) {
  return {
    order: {
      maker: order.order.maker, taker: order.order.taker, option: order.order.option, isBuyer: order.order.isBuyer,
      numContracts: order.order.numContracts.toString(), price: order.order.price.toString(), expiry: order.order.expiry.toString(), nonce: order.order.nonce.toString(),
      optionType: order.order.optionType ?? null, strikes: (order.order.strikes ?? []).map(String), strikePrice: order.order.strikePrice?.toString() ?? null,
      collateralToken: order.order.collateralToken ?? null, underlyingToken: order.order.underlyingToken ?? null, deadline: order.order.deadline?.toString() ?? null,
    },
    signature: order.signature, availableAmount: order.availableAmount.toString(), makerAddress: order.makerAddress,
    rawApiData: order.rawApiData ? { ...order.rawApiData, greeks: order.rawApiData.greeks ?? null, optionBookAddress: order.rawApiData.optionBookAddress ?? null } : null,
  };
}

export function deserializeOrder(raw: unknown): ThetanutsOrder {
  const value = raw as ReturnType<typeof serializeOrder>;
  if (!value?.order || !value.signature || !value.makerAddress) throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "Stored order data is incomplete.", 500);
  return {
    order: {
      maker: value.order.maker, taker: value.order.taker, option: value.order.option, isBuyer: value.order.isBuyer,
      numContracts: BigInt(value.order.numContracts), price: BigInt(value.order.price), expiry: BigInt(value.order.expiry), nonce: BigInt(value.order.nonce),
      ...(value.order.optionType === null ? {} : { optionType: value.order.optionType }), strikes: value.order.strikes.map(BigInt),
      ...(value.order.strikePrice === null ? {} : { strikePrice: BigInt(value.order.strikePrice) }),
      ...(value.order.collateralToken === null ? {} : { collateralToken: value.order.collateralToken }),
      ...(value.order.underlyingToken === null ? {} : { underlyingToken: value.order.underlyingToken }),
      ...(value.order.deadline === null ? {} : { deadline: BigInt(value.order.deadline) }),
    }, signature: value.signature, availableAmount: BigInt(value.availableAmount), makerAddress: value.makerAddress,
    ...(value.rawApiData ? { rawApiData: { ...value.rawApiData, optionBookAddress: value.rawApiData.optionBookAddress ?? undefined, greeks: value.rawApiData.greeks ?? undefined } } : {}),
  };
}

function scenario(key: ScenarioResult["key"], price: Decimal, spot: Decimal, protectedValue: Decimal, strike: Decimal, quantity: Decimal, premium: Decimal): ScenarioResult {
  const underlyingValue = protectedValue.mul(price).div(spot);
  const payoff = Decimal.max(strike.minus(price), 0).mul(quantity);
  return { key, settlementPriceUsd: decimal(price), underlyingValueUsd: decimal(underlyingValue), optionPayoffUsd: decimal(payoff), premiumCostUsd: decimal(premium), netProtectedValueUsd: decimal(underlyingValue.plus(payoff).minus(premium)) };
}

export interface CandidateSearchResult { candidates: ProtectionCandidate[]; rejected: CandidateRejection[]; marketAsOf: string; }

export interface CandidateGenerationOptions {
  client?: Pick<ThetanutsReadClient, "api" | "chainConfig" | "optionBook">;
  now?: Date;
  maxDeadlineGapHours?: number;
  coverageMode?: CoverageMode;
  policy?: GoalProtectionPolicy;
}

export async function generateProtectionCandidates(goal: Goal, options: CandidateGenerationOptions = {}): Promise<CandidateSearchResult> {
  const env = readServerEnvironment();
  if (!goal.timingConfirmed) throw new ApiRouteError("GOAL_TIMING_UNCONFIRMED", "Confirm when protection must end and when Base USDC must be available before searching live options.", 422);
  const nowMs = options.now?.getTime() ?? Date.now();
  let timing;
  try {
    timing = normalizeGoalTiming(goal, nowMs);
  } catch (error) {
    throw new ApiRouteError("GOAL_TIMING_INFEASIBLE", error instanceof Error ? error.message : "The confirmed goal timing is infeasible.", 422);
  }
  if (!options.client && (!env.THETANUTS_RPC_URL || !env.THETANUTS_RPC_FALLBACK_URL)) throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Thetanuts requires both Base RPC providers.", 503, true);
  const policy: GoalProtectionPolicy = options.policy ?? { ...P0_GOAL_PROTECTION_POLICY, maximumExpiryOverhangSeconds: (options.maxDeadlineGapHours ?? env.MAX_DEADLINE_GAP_HOURS) * 60 * 60, maximumPreviewPremiumUsd: env.MAX_LIVE_TRADE_PREMIUM_USD };
  let client: Pick<ThetanutsReadClient, "api" | "chainConfig" | "optionBook">; let orders: ThetanutsOrder[]; let market;
  try {
    if (options.client) {
      client = options.client;
      [orders, market] = await Promise.all([fetchEthPutOrders(client, Math.floor(nowMs / 1000)), client.api.getMarketData()]);
      market = parseThetanutsMarketData(market);
    } else {
      ({ client, orders, market } = await withConfiguredThetanutsRead(async (configuredClient) => ({
        client: configuredClient,
        orders: await fetchEthPutOrders(configuredClient, Math.floor(nowMs / 1000)),
        market: parseThetanutsMarketData(await configuredClient.api.getMarketData()),
      })));
    }
  }
  catch (error) {
    if (error instanceof ApiRouteError || error instanceof Error && error.name === "ZodError") throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "Thetanuts returned malformed market data.", 502);
    throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Thetanuts market data is temporarily unavailable.", 502, true);
  }
  const spot = new Decimal(market.prices.ETH); if (!spot.isPositive()) throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "Thetanuts returned an invalid ETH price.", 502, true);
  const marketAsOf = new Date(market.metadata.lastUpdated).toISOString();
  const usdc = client.chainConfig.tokens.USDC; const putImplementation = client.chainConfig.implementations.PUT;
  if (!usdc || !putImplementation) throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "Thetanuts Base configuration is missing the P0 market.", 502);
  const protectedValue = new Decimal(goal.protectedValueUsd);
  const desiredQuantity = protectedValue.div(spot);
  const requiredQuantityBaseUnits = BigInt(calculateRequiredGoalQuantity(goal.protectedValueUsd, decimal(spot), USDC_DECIMALS));
  const desiredContracts = decimalToBaseUnits(desiredQuantity, USDC_DECIMALS, Decimal.ROUND_CEIL);
  const allowedLossUsd = protectedValue.mul(goal.maxLossBps).div(10_000);
  const userBudgetUsd = goal.maxPremiumUsd ? new Decimal(goal.maxPremiumUsd) : allowedLossUsd;
  const budgetUsd = Decimal.min(userBudgetUsd, allowedLossUsd, new Decimal(policy.maximumPreviewPremiumUsd));
  const budgetBaseUnits = decimalToBaseUnits(budgetUsd, USDC_DECIMALS);
  const proportionalTargetBaseUnits = [ONE_USDC_BASE_UNITS, budgetBaseUnits].reduce((smallest, value) => value < smallest ? value : smallest);
  const rejected: CandidateRejection[] = []; const viable: ProtectionCandidate[] = [];

  for (const order of orders) {
    const reasons: string[] = []; const id = orderId(order); const raw = order.rawApiData;
    const strikes = order.order.strikes ?? (order.order.strikePrice ? [order.order.strikePrice] : []);
    const expiryMs = timestampMilliseconds(order.order.expiry);
    const expiryOverhangSeconds = expiryMs === null ? null : Math.ceil((expiryMs - timing.protectThroughMs) / 1000);
    if (!raw || !validAddress(raw.implementation) || raw.implementation.toLowerCase() !== putImplementation.toLowerCase() || raw.isCall !== false || order.order.optionType !== 1 || strikes.length !== 1) reasons.push("Only a vanilla ETH put is supported.");
    if (!validAddress(order.order.underlyingToken) || order.order.underlyingToken.toLowerCase() === ZeroAddress) reasons.push("The order does not identify a valid ETH underlying.");
    if (!validAddress(order.order.maker) || order.order.maker.toLowerCase() !== order.makerAddress.toLowerCase() || !validAddress(order.order.taker) || order.order.taker.toLowerCase() !== ZeroAddress) reasons.push("The order has invalid maker or taker fields.");
    if (!isHexString(order.signature) || order.signature.length !== 132) reasons.push("The order signature is malformed.");
    if (order.order.isBuyer || raw?.isLong !== true) reasons.push("The order does not let the user buy protection.");
    if (strikes.length === 1 && strikes[0]! <= 0n) reasons.push("The order strike is invalid.");
    if (expiryMs === null || expiryOverhangSeconds === null) reasons.push("The option expiry is invalid.");
    if (expiryMs !== null && expiryMs < timing.protectThroughMs) reasons.push("The option expires before the protection cutoff.");
    if (expiryMs !== null && expiryMs - timing.protectThroughMs > policy.maximumExpiryOverhangSeconds * 1000) reasons.push(`The expiry is more than ${Math.floor(policy.maximumExpiryOverhangSeconds / 3600)} hours after the protection cutoff.`);
    const rawDeadline = raw?.orderExpiryTimestamp === undefined ? null : nonNegativeBigInt(raw.orderExpiryTimestamp);
    const orderDeadline = timestampMilliseconds(order.order.deadline ?? rawDeadline ?? 0n);
    if (orderDeadline === null || orderDeadline <= nowMs + 60_000) reasons.push("The order is expired or too close to expiry.");
    if (!validAddress(order.order.collateralToken) || !validAddress(raw?.collateral) || order.order.collateralToken.toLowerCase() !== usdc.address.toLowerCase() || raw.collateral.toLowerCase() !== usdc.address.toLowerCase()) reasons.push("P0 supports USDC-settled OptionBook orders only.");
    const maximumCollateral = raw?.maxCollateralUsable === undefined ? null : nonNegativeBigInt(raw.maxCollateralUsable);
    if (order.order.price <= 0n || order.availableAmount <= 0n || maximumCollateral === null || maximumCollateral <= 0n) reasons.push("The order has no available liquidity.");
    const requiredPremiumBaseUnits = premiumForContracts(desiredContracts, order.order.price);
    const requestedPremiumBaseUnits = options.coverageMode === "proportional_demo" ? proportionalTargetBaseUnits : requiredPremiumBaseUnits;
    if (requestedPremiumBaseUnits <= 0n || (options.coverageMode !== "proportional_demo" && requestedPremiumBaseUnits > budgetBaseUnits)) reasons.push("Full goal coverage exceeds the protection-cost limit.");
    let preview: ReturnType<typeof client.optionBook.previewFillOrder> | null = null;
    if (reasons.length === 0) {
      try {
        preview = client.optionBook.previewFillOrder(order, requestedPremiumBaseUnits, env.THETANUTS_REFERRER_ADDRESS);
        if (!previewIsConsistent(preview, order, usdc.address, strikes[0]!)) reasons.push("The order preview is inconsistent with the signed order.");
        if (preview.numContracts > preview.maxContracts) reasons.push("The live order cannot fill the required protection quantity.");
      }
      catch { reasons.push("The order could not be previewed as fillable."); }
    }
    if (reasons.length || !preview) { rejected.push({ protocolOrderId: id, reasons }); continue; }
    const strike = usdFromPriceBaseUnits(strikes[0]!);
    const quantity = underlyingFromContractBaseUnits(preview.numContracts);
    const premium = underlyingFromContractBaseUnits(preview.totalCollateral);
    const putCollateral = putCollateralForContracts(strikes[0]!, preview.numContracts);
    if (putCollateral <= 0n || preview.maxContracts <= 0n || preview.totalCollateral > budgetBaseUnits) { rejected.push({ protocolOrderId: id, reasons: ["The preview exceeds the available liquidity or preview cap."] }); continue; }
    const floor = calculateNormalizedProtectionFloor({ protectedValueUsd: goal.protectedValueUsd, maxLossBps: goal.maxLossBps, requiredQuantityBaseUnits: requiredQuantityBaseUnits.toString(), optionQuantityBaseUnits: preview.numContracts.toString(), strikeUsd: decimal(strike), premiumUsd: decimal(premium), quantityDecimals: USDC_DECIMALS });
    const coverageBps = floor.coverageBps;
    const coverageMode = options.coverageMode ?? "full";
    if (coverageMode === "full" && (coverageBps !== 10_000 || floor.expiryShortfallUsd !== "0")) { rejected.push({ protocolOrderId: id, reasons: [coverageBps !== 10_000 ? "The available order does not fully cover the stated goal." : "The deterministic protection floor at expiry does not satisfy the requested maximum loss."] }); continue; }
    if (coverageMode === "proportional_demo" && (coverageBps <= 0 || coverageBps >= 10_000 || preview.totalCollateral > ONE_USDC_BASE_UNITS || preview.totalCollateral > budgetBaseUnits)) { rejected.push({ protocolOrderId: id, reasons: ["The order cannot produce the requested partial, capped proportional preview."] }); continue; }
    if (expiryMs === null || expiryOverhangSeconds === null) { rejected.push({ protocolOrderId: id, reasons: ["The option expiry is invalid."] }); continue; }
    const now = new Date().toISOString();
    const scenarios = [scenario("down", spot.mul("0.7"), spot, protectedValue, strike, quantity, premium), scenario("flat", spot, spot, protectedValue, strike, quantity, premium), scenario("up", spot.mul("1.2"), spot, protectedValue, strike, quantity, premium)];
    const expiry = new Date(expiryMs).toISOString();
    viable.push({ schemaVersion: 2, id: randomUUID(), goalId: goal.id, source: "optionbook", protocolOrderId: id, underlyingAsset: "ETH", optionType: "put", strikeUsd: decimal(strike), expiry, settlementTokenAddress: getAddress(usdc.address), settlementTokenSymbol: usdc.symbol, settlementTokenDecimals: usdc.decimals, premiumAmountBaseUnits: preview.totalCollateral.toString(), premiumUsd: decimal(premium), quantityBaseUnits: preview.numContracts.toString(), quantityUnderlying: decimal(quantity), maxPremiumLossUsd: decimal(premium), spotPriceUsd: decimal(spot), requiredQuantityBaseUnits: requiredQuantityBaseUnits.toString(), effectiveBudgetUsd: decimal(budgetUsd), requiredFloorUsd: floor.requiredFloorUsd, protectedFloorAtExpiryUsd: floor.protectedFloorAtExpiryUsd, accessibleFloorByGoalDateUsd: null, expiryShortfallUsd: floor.expiryShortfallUsd, goalDateShortfallUsd: null, protectionEndAt: expiry, settlementAvailableAt: null, settlementConfirmationAllowanceSeconds: null, settlementTrigger: policy.settlementTrigger, settlementTimingStatus: "settlement_timing_not_verified", accessibilityBasis: "unverified_factory_callback", timingAccessible: null, goalAttainment: "settlement_timing_not_verified", scoreVersion: "goal-protection-v1", protectionScore: null, scoreBreakdown: null, policyVersion: policy.version, expiryOverhangSeconds: Math.max(0, expiryOverhangSeconds), settlementLeadSeconds: null, goalCoverageBps: coverageBps, coverageMode, availableQuantityBaseUnits: preview.maxContracts.toString(), status: "viable", rejectionReasons: [], protocolRaw: serializeOrder(order), scenarios, marketAsOf, createdAt: now, updatedAt: now });
  }
  viable.sort(compareProtectionCandidates);
  const candidates = viable.slice(0, 3).map((candidate, index) => ({ ...candidate, status: index === 0 ? "selected" as const : "viable" as const }));
  if (candidates[0]) assertSelectableCandidate(candidates[0], timing.protectThroughAt);
  return { candidates, rejected, marketAsOf };
}

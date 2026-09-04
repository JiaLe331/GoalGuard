import "server-only";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { getAddress, isAddress, isHexString, ZeroAddress } from "ethers";

import { readServerEnvironment } from "@/lib/config/env";
import type { CandidateRejection, CoverageMode, Goal, ProtectionCandidate, ScenarioResult, SettlementType } from "@/lib/contracts";
import { ApiRouteError } from "@/lib/server/http";
import { fetchEthPutOrders, parseThetanutsMarketData, resolveKnownToken, type ThetanutsOrder, type ThetanutsReadClient, withConfiguredThetanutsRead } from "./client";
import { calculateGoalCoverageBps } from "@/lib/protection/coverage";
import {
  decimalToBaseUnits,
  premiumForContracts,
  putCollateralForContracts,
  underlyingFromContractBaseUnits,
  usdFromPriceBaseUnits,
} from "./units";

const decimal = (value: Decimal.Value) => new Decimal(value).toFixed();
const GLOBAL_PREVIEW_CAP_USD = new Decimal(3);

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
  collateralAddress: string,
  strike: bigint,
): boolean {
  return preview.numContracts > 0n && preview.maxContracts > 0n && preview.numContracts <= preview.maxContracts
    && preview.totalCollateral > 0n && preview.pricePerContract === order.order.price
    && preview.collateralToken.toLowerCase() === collateralAddress.toLowerCase() && !preview.isCall
    && preview.strikes.length === 1 && preview.strikes[0] === strike && preview.expiry === order.order.expiry;
}

export function orderId(order: ThetanutsOrder) { return order.signature.toLowerCase(); }

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
}

interface SettlementPass {
  settlementType: SettlementType;
  implementation: string;
  requireCollateralAddress: string | null; // null = accept whatever collateral token the signed order specifies
}

interface EvaluationParams {
  chainConfig: ThetanutsReadClient["chainConfig"];
  client: Pick<ThetanutsReadClient, "optionBook">;
  goal: Goal;
  deadline: number;
  maxDeadlineGapHours: number;
  nowMs: number;
  protectedValue: Decimal;
  desiredQuantity: Decimal;
  allowedLossUsd: Decimal;
  spot: Decimal;
  coverageMode: CoverageMode;
  referrer: string | null;
  marketAsOf: string;
}

function evaluateOrdersForPass(orders: ThetanutsOrder[], pass: SettlementPass, params: EvaluationParams): { viable: ProtectionCandidate[]; rejected: CandidateRejection[] } {
  const rejected: CandidateRejection[] = []; const viable: ProtectionCandidate[] = [];
  const unsupportedReason = pass.settlementType === "cash" ? "Only a vanilla cash-settled ETH put is supported." : "Only a vanilla physically-settled ETH put is supported.";

  for (const order of orders) {
    const reasons: string[] = []; const id = orderId(order); const raw = order.rawApiData;
    const strikes = order.order.strikes ?? (order.order.strikePrice ? [order.order.strikePrice] : []);
    const expiryMs = timestampMilliseconds(order.order.expiry);
    const gapHours = expiryMs === null ? null : Math.floor((expiryMs - params.deadline) / 3_600_000);
    if (!raw || !validAddress(raw.implementation) || raw.implementation.toLowerCase() !== pass.implementation.toLowerCase() || raw.isCall !== false || order.order.optionType !== 1 || strikes.length !== 1) reasons.push(unsupportedReason);
    if (!validAddress(order.order.underlyingToken) || order.order.underlyingToken.toLowerCase() === ZeroAddress) reasons.push("The order does not identify a valid ETH underlying.");
    if (!validAddress(order.order.maker) || order.order.maker.toLowerCase() !== order.makerAddress.toLowerCase() || !validAddress(order.order.taker) || order.order.taker.toLowerCase() !== ZeroAddress) reasons.push("The order has invalid maker or taker fields.");
    if (!isHexString(order.signature) || order.signature.length !== 132) reasons.push("The order signature is malformed.");
    if (order.order.isBuyer || raw?.isLong !== true) reasons.push("The order does not let the user buy protection.");
    if (strikes.length === 1 && strikes[0]! <= 0n) reasons.push("The order strike is invalid.");
    if (expiryMs === null || gapHours === null) reasons.push("The option expiry is invalid.");
    if (expiryMs !== null && expiryMs < params.deadline) reasons.push("The option expires before the goal deadline.");
    if (gapHours !== null && gapHours > params.maxDeadlineGapHours) reasons.push(`The expiry is more than ${params.maxDeadlineGapHours} hours after the deadline.`);
    const rawDeadline = raw?.orderExpiryTimestamp === undefined ? null : nonNegativeBigInt(raw.orderExpiryTimestamp);
    const orderDeadline = timestampMilliseconds(order.order.deadline ?? rawDeadline ?? 0n);
    if (orderDeadline === null || orderDeadline <= params.nowMs + 60_000) reasons.push("The order is expired or too close to expiry.");

    const collateralFieldsValid = validAddress(order.order.collateralToken) && validAddress(raw?.collateral);
    let collateralAddress: string | null = null;
    if (!collateralFieldsValid) {
      reasons.push("The order does not identify a valid collateral token.");
    } else if (pass.requireCollateralAddress !== null) {
      // Cash pass: preserve the exact original rule -- both fields must independently equal the required token.
      if (order.order.collateralToken!.toLowerCase() !== pass.requireCollateralAddress.toLowerCase() || raw!.collateral.toLowerCase() !== pass.requireCollateralAddress.toLowerCase()) reasons.push("P0 supports USDC-settled OptionBook orders only.");
      else collateralAddress = pass.requireCollateralAddress;
    } else if (order.order.collateralToken!.toLowerCase() !== raw!.collateral.toLowerCase()) {
      // Physical pass: no fixed token is required, but the two fields must agree with each other.
      reasons.push("The order does not consistently identify a collateral token.");
    } else {
      collateralAddress = raw!.collateral;
    }
    const collateralToken = collateralAddress === null ? null : resolveKnownToken(params.chainConfig, collateralAddress);
    if (collateralAddress !== null && collateralToken === null) reasons.push("The order's collateral token could not be verified.");

    const maximumCollateral = raw?.maxCollateralUsable === undefined ? null : nonNegativeBigInt(raw.maxCollateralUsable);
    if (order.order.price <= 0n || order.availableAmount <= 0n || maximumCollateral === null || maximumCollateral <= 0n) reasons.push("The order has no available liquidity.");

    if (collateralToken === null) { rejected.push({ protocolOrderId: id, reasons }); continue; }

    const desiredContracts = decimalToBaseUnits(params.desiredQuantity, collateralToken.decimals, Decimal.ROUND_CEIL);
    const budgetUsd = Decimal.min(params.goal.maxPremiumUsd ? Decimal.min(params.goal.maxPremiumUsd, params.allowedLossUsd) : params.allowedLossUsd, GLOBAL_PREVIEW_CAP_USD);
    const budgetBaseUnits = decimalToBaseUnits(budgetUsd, collateralToken.decimals);
    const oneUnitBaseUnits = decimalToBaseUnits("1", collateralToken.decimals);
    const proportionalTargetBaseUnits = [oneUnitBaseUnits, budgetBaseUnits].reduce((smallest, value) => value < smallest ? value : smallest);

    const requiredPremiumBaseUnits = premiumForContracts(desiredContracts, order.order.price);
    const requestedPremiumBaseUnits = params.coverageMode === "proportional_demo" ? proportionalTargetBaseUnits : requiredPremiumBaseUnits;
    if (requestedPremiumBaseUnits <= 0n || (params.coverageMode !== "proportional_demo" && requestedPremiumBaseUnits > budgetBaseUnits)) reasons.push("Full goal coverage exceeds the protection-cost limit.");

    let preview: ReturnType<typeof params.client.optionBook.previewFillOrder> | null = null;
    if (reasons.length === 0) {
      try {
        preview = params.client.optionBook.previewFillOrder(order, requestedPremiumBaseUnits, params.referrer ?? undefined);
        if (!previewIsConsistent(preview, order, collateralAddress!, strikes[0]!)) reasons.push("The order preview is inconsistent with the signed order.");
        if (preview.numContracts > preview.maxContracts) reasons.push("The live order cannot fill the required protection quantity.");
      }
      catch { reasons.push("The order could not be previewed as fillable."); }
    }
    if (reasons.length || !preview) { rejected.push({ protocolOrderId: id, reasons }); continue; }
    const strike = usdFromPriceBaseUnits(strikes[0]!);
    const quantity = underlyingFromContractBaseUnits(preview.numContracts, collateralToken.decimals);
    const premium = underlyingFromContractBaseUnits(preview.totalCollateral, collateralToken.decimals);
    const putCollateral = putCollateralForContracts(strikes[0]!, preview.numContracts);
    if (putCollateral <= 0n || preview.maxContracts <= 0n || preview.totalCollateral > budgetBaseUnits) { rejected.push({ protocolOrderId: id, reasons: ["The preview exceeds the available liquidity or preview cap."] }); continue; }
    const worstFloor = strike.mul(quantity).minus(premium); const requiredFloor = params.protectedValue.minus(params.allowedLossUsd);
    const coverageBps = calculateGoalCoverageBps(preview.numContracts.toString(), desiredContracts.toString());
    const coverageMode = params.coverageMode;
    if (coverageMode === "full" && (coverageBps !== 10_000 || worstFloor.lessThan(requiredFloor))) { rejected.push({ protocolOrderId: id, reasons: [coverageBps !== 10_000 ? "The available order does not fully cover the stated goal." : "The deterministic worst-case floor does not satisfy the requested maximum loss."] }); continue; }
    if (coverageMode === "proportional_demo" && (coverageBps <= 0 || coverageBps >= 10_000 || preview.totalCollateral > oneUnitBaseUnits || preview.totalCollateral > budgetBaseUnits)) { rejected.push({ protocolOrderId: id, reasons: ["The order cannot produce the requested partial, capped proportional preview."] }); continue; }
    if (expiryMs === null || gapHours === null) { rejected.push({ protocolOrderId: id, reasons: ["The option expiry is invalid."] }); continue; }
    const now = new Date().toISOString();
    const scenarios = [scenario("down", params.spot.mul("0.7"), params.spot, params.protectedValue, strike, quantity, premium), scenario("flat", params.spot, params.spot, params.protectedValue, strike, quantity, premium), scenario("up", params.spot.mul("1.2"), params.spot, params.protectedValue, strike, quantity, premium)];
    viable.push({ schemaVersion: 1, id: randomUUID(), goalId: params.goal.id, source: "optionbook", protocolOrderId: id, underlyingAsset: "ETH", optionType: "put", settlementType: pass.settlementType, strikeUsd: decimal(strike), expiry: new Date(expiryMs).toISOString(), settlementTokenAddress: getAddress(collateralAddress!), settlementTokenSymbol: collateralToken.symbol, settlementTokenDecimals: collateralToken.decimals, premiumAmountBaseUnits: preview.totalCollateral.toString(), premiumUsd: decimal(premium), quantityBaseUnits: preview.numContracts.toString(), quantityUnderlying: decimal(quantity), maxPremiumLossUsd: decimal(premium), estimatedFloorUsd: decimal(coverageMode === "proportional_demo" ? new Decimal(scenarios[0]!.netProtectedValueUsd) : worstFloor), deadlineGapHours: Math.max(0, gapHours), goalCoverageBps: coverageBps, coverageMode, availableQuantityBaseUnits: preview.maxContracts.toString(), status: "viable", rejectionReasons: [], protocolRaw: serializeOrder(order), scenarios, marketAsOf: params.marketAsOf, createdAt: now, updatedAt: now });
  }
  return { viable, rejected };
}

function rankAndSelect(viable: ProtectionCandidate[]): ProtectionCandidate[] {
  const sorted = [...viable].sort((a, b) => a.deadlineGapHours - b.deadlineGapHours || new Decimal(b.estimatedFloorUsd).comparedTo(a.estimatedFloorUsd) || new Decimal(a.premiumUsd).comparedTo(b.premiumUsd) || (a.protocolOrderId ?? "").localeCompare(b.protocolOrderId ?? ""));
  return sorted.slice(0, 3).map((candidate, index) => ({ ...candidate, status: index === 0 ? "selected" as const : "viable" as const }));
}

export async function generateProtectionCandidates(goal: Goal, options: CandidateGenerationOptions = {}): Promise<CandidateSearchResult> {
  const env = readServerEnvironment();
  if (!options.client && (!env.THETANUTS_RPC_URL || !env.THETANUTS_RPC_FALLBACK_URL)) throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Thetanuts requires both Base RPC providers.", 503, true);
  const nowMs = options.now?.getTime() ?? Date.now();
  const maxDeadlineGapHours = options.maxDeadlineGapHours ?? env.MAX_DEADLINE_GAP_HOURS;
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
  const deadline = Date.parse(`${goal.deadline}T00:00:00.000Z`);
  if (!Number.isFinite(deadline)) throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "The goal deadline is invalid.", 500);
  const protectedValue = new Decimal(goal.protectedValueUsd);
  const desiredQuantity = protectedValue.div(spot);
  const allowedLossUsd = protectedValue.mul(goal.maxLossBps).div(10_000);
  const evaluationParams: EvaluationParams = {
    chainConfig: client.chainConfig, client, goal, deadline, maxDeadlineGapHours, nowMs, protectedValue, desiredQuantity, allowedLossUsd, spot,
    coverageMode: options.coverageMode ?? "full", referrer: env.THETANUTS_REFERRER_ADDRESS ?? null, marketAsOf,
  };

  const cashPass = evaluateOrdersForPass(orders, { settlementType: "cash", implementation: putImplementation, requireCollateralAddress: usdc.address }, evaluationParams);
  if (cashPass.viable.length > 0) return { candidates: rankAndSelect(cashPass.viable), rejected: cashPass.rejected, marketAsOf };

  const physicalImplementation = client.chainConfig.implementations.PHYSICAL_PUT;
  if (!physicalImplementation) return { candidates: [], rejected: cashPass.rejected, marketAsOf };
  const physicalPass = evaluateOrdersForPass(orders, { settlementType: "physical", implementation: physicalImplementation, requireCollateralAddress: null }, evaluationParams);
  if (physicalPass.viable.length > 0) return { candidates: rankAndSelect(physicalPass.viable), rejected: physicalPass.rejected, marketAsOf };
  return { candidates: [], rejected: [...cashPass.rejected, ...physicalPass.rejected], marketAsOf };
}

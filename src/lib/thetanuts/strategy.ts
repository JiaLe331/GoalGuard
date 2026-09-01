import "server-only";
import { randomUUID } from "node:crypto";
import type { OrderWithSignature } from "@thetanuts-finance/thetanuts-client";
import Decimal from "decimal.js";
import { getAddress } from "ethers";

import { readServerEnvironment } from "@/lib/config/env";
import type { CandidateRejection, Goal, ProtectionCandidate, ScenarioResult } from "@/lib/contracts";
import { ApiRouteError } from "@/lib/server/http";
import { createConfiguredThetanutsClient } from "./client";

const SIX = new Decimal(1_000_000);
const EIGHT = new Decimal(100_000_000);
const decimal = (value: Decimal.Value) => new Decimal(value).toFixed();

export function orderId(order: OrderWithSignature) { return `${order.makerAddress.toLowerCase()}:${order.order.nonce.toString()}`; }

export function serializeOrder(order: OrderWithSignature) {
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

export function deserializeOrder(raw: unknown): OrderWithSignature {
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

export async function generateProtectionCandidates(goal: Goal): Promise<CandidateSearchResult> {
  const env = readServerEnvironment();
  if (!env.THETANUTS_RPC_URL) throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Thetanuts is not configured.", 503, true);
  const client = createConfiguredThetanutsClient(env.THETANUTS_RPC_URL, env.THETANUTS_REFERRER_ADDRESS);
  let orders: OrderWithSignature[]; let market;
  try { [orders, market] = await Promise.all([client.api.filterOrders({ asset: "ETH", type: "put", minExpiry: Math.floor(Date.now() / 1000) }), client.api.getMarketData()]); }
  catch { throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Thetanuts market data is temporarily unavailable.", 502, true); }
  const spot = new Decimal(market.prices.ETH); if (!spot.isPositive()) throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "Thetanuts returned an invalid ETH price.", 502, true);
  const marketAsOf = new Date(market.metadata.lastUpdated).toISOString();
  const usdc = client.chainConfig.tokens.USDC; const putImplementation = client.chainConfig.implementations.PUT;
  if (!usdc || !putImplementation) throw new ApiRouteError("UPSTREAM_INVALID_RESPONSE", "Thetanuts Base configuration is missing the P0 market.", 502);
  const deadline = Date.parse(`${goal.deadline}T00:00:00.000Z`); const protectedValue = new Decimal(goal.protectedValueUsd);
  const desiredQuantity = protectedValue.div(spot); const desiredContracts = BigInt(desiredQuantity.mul(SIX).ceil().toFixed(0));
  const allowedLossUsd = protectedValue.mul(goal.maxLossBps).div(10_000);
  const budgetUsd = goal.maxPremiumUsd ? Decimal.min(goal.maxPremiumUsd, allowedLossUsd) : allowedLossUsd;
  const rejected: CandidateRejection[] = []; const viable: ProtectionCandidate[] = [];

  for (const order of orders) {
    const reasons: string[] = []; const id = orderId(order); const raw = order.rawApiData;
    const strikes = order.order.strikes ?? (order.order.strikePrice ? [order.order.strikePrice] : []);
    const expiryMs = Number(order.order.expiry) * 1000; const gapHours = Math.floor((expiryMs - deadline) / 3_600_000);
    if (!raw || raw.implementation.toLowerCase() !== putImplementation.toLowerCase() || strikes.length !== 1) reasons.push("Only a vanilla ETH put is supported.");
    if (order.order.isBuyer || raw?.isLong === false) reasons.push("The order does not let the user buy protection.");
    if (expiryMs < deadline) reasons.push("The option expires before the goal deadline.");
    if (gapHours > env.MAX_DEADLINE_GAP_HOURS) reasons.push(`The expiry is more than ${env.MAX_DEADLINE_GAP_HOURS} hours after the deadline.`);
    const orderDeadline = Number(order.order.deadline ?? BigInt(raw?.orderExpiryTimestamp ?? 0)) * 1000;
    if (!orderDeadline || orderDeadline <= Date.now() + 60_000) reasons.push("The order is expired or too close to expiry.");
    if (!order.order.collateralToken || order.order.collateralToken.toLowerCase() !== usdc.address.toLowerCase()) reasons.push("P0 supports USDC-settled OptionBook orders only.");
    if (order.availableAmount <= 0n) reasons.push("The order has no available liquidity.");
    const requiredPremiumBaseUnits = (desiredContracts * order.order.price + 99_999_999n) / 100_000_000n;
    const budgetBaseUnits = BigInt(budgetUsd.mul(SIX).floor().toFixed(0));
    if (requiredPremiumBaseUnits <= 0n || requiredPremiumBaseUnits > budgetBaseUnits) reasons.push("Full goal coverage exceeds the protection-cost limit.");
    let preview: ReturnType<typeof client.optionBook.previewFillOrder> | null = null;
    if (reasons.length === 0) {
      try { preview = client.optionBook.previewFillOrder(order, requiredPremiumBaseUnits, env.THETANUTS_REFERRER_ADDRESS); if (preview.numContracts < desiredContracts || preview.numContracts > preview.maxContracts) reasons.push("The live order cannot fill the required protection quantity."); }
      catch { reasons.push("The order could not be previewed as fillable."); }
    }
    if (reasons.length || !preview) { rejected.push({ protocolOrderId: id, reasons }); continue; }
    const strike = new Decimal(strikes[0]!.toString()).div(EIGHT); const quantity = new Decimal(preview.numContracts.toString()).div(SIX);
    const premium = new Decimal(requiredPremiumBaseUnits.toString()).div(SIX); const worstFloor = strike.mul(quantity).minus(premium); const requiredFloor = protectedValue.minus(allowedLossUsd);
    if (worstFloor.lessThan(requiredFloor)) { rejected.push({ protocolOrderId: id, reasons: ["The deterministic worst-case floor does not satisfy the requested maximum loss."] }); continue; }
    const coverageBps = Decimal.min(quantity.div(desiredQuantity).mul(10_000).floor(), 10_000).toNumber();
    if (coverageBps < 10_000) { rejected.push({ protocolOrderId: id, reasons: ["The available order does not fully cover the stated goal."] }); continue; }
    const now = new Date().toISOString();
    viable.push({ schemaVersion: 1, id: randomUUID(), goalId: goal.id, source: "optionbook", protocolOrderId: id, underlyingAsset: "ETH", optionType: "put", strikeUsd: decimal(strike), expiry: new Date(expiryMs).toISOString(), settlementTokenAddress: getAddress(usdc.address), settlementTokenSymbol: usdc.symbol, settlementTokenDecimals: usdc.decimals, premiumAmountBaseUnits: requiredPremiumBaseUnits.toString(), premiumUsd: decimal(premium), quantityBaseUnits: preview.numContracts.toString(), quantityUnderlying: decimal(quantity), maxPremiumLossUsd: decimal(premium), estimatedFloorUsd: decimal(worstFloor), deadlineGapHours: Math.max(0, gapHours), goalCoverageBps: coverageBps, availableQuantityBaseUnits: preview.maxContracts.toString(), status: "viable", rejectionReasons: [], protocolRaw: serializeOrder(order), scenarios: [scenario("down", spot.mul("0.7"), spot, protectedValue, strike, quantity, premium), scenario("flat", spot, spot, protectedValue, strike, quantity, premium), scenario("up", spot.mul("1.2"), spot, protectedValue, strike, quantity, premium)], marketAsOf, createdAt: now, updatedAt: now });
  }
  viable.sort((a, b) => a.deadlineGapHours - b.deadlineGapHours || new Decimal(b.estimatedFloorUsd).comparedTo(a.estimatedFloorUsd) || new Decimal(a.premiumUsd).comparedTo(b.premiumUsd) || (a.protocolOrderId ?? "").localeCompare(b.protocolOrderId ?? ""));
  const candidates = viable.slice(0, 3).map((candidate, index) => ({ ...candidate, status: index === 0 ? "selected" as const : "viable" as const }));
  return { candidates, rejected, marketAsOf };
}

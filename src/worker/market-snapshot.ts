import Decimal from "decimal.js";
import { ZeroAddress, isAddress } from "ethers";

import { MarketSnapshotSchema, type MarketSnapshot, type ProtectionChainEntry } from "@/lib/contracts";
import { deriveProtectionIndex } from "@/lib/thetanuts/protection-index";
import { fetchEthPutOrders, parseThetanutsMarketData, resolveKnownToken, type ThetanutsOrder, type ThetanutsReadClient } from "@/lib/thetanuts/client-core";
import { impliedVolatilityBps } from "@/lib/thetanuts/iv";
import { premiumForContracts, underlyingFromContractBaseUnits, usdFromPriceBaseUnits, decimalToBaseUnits } from "@/lib/thetanuts/units";

const MARKET_NOTIONAL_USD = "100";
const ZERO_ADDRESS = ZeroAddress.toLowerCase();

function timestampMilliseconds(value: bigint): number | null {
  if (value <= 0n || value > BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000))) return null;
  return Number(value * 1000n);
}

function validAddress(value: unknown): value is string {
  return typeof value === "string" && isAddress(value);
}

function chainEntryForOrder(
  order: ThetanutsOrder,
  client: Pick<ThetanutsReadClient, "chainConfig" | "optionBook">,
  spot: Decimal,
): ProtectionChainEntry | null {
  const raw = order.rawApiData;
  const cashImplementation = client.chainConfig.implementations.PUT;
  const physicalImplementation = client.chainConfig.implementations.PHYSICAL_PUT;
  const implementation = raw?.implementation?.toLowerCase();
  const settlementType = implementation && cashImplementation && implementation === cashImplementation.toLowerCase()
    ? "cash"
    : implementation && physicalImplementation && implementation === physicalImplementation.toLowerCase()
      ? "physical"
      : null;
  if (!raw || settlementType === null || raw.isCall || !raw.isLong || order.order.isBuyer || order.order.optionType !== 1) return null;

  const strikes = order.order.strikes ?? (order.order.strikePrice ? [order.order.strikePrice] : []);
  const strikeBaseUnits = strikes.length === 1 ? strikes[0]! : 0n;
  const expiryMs = timestampMilliseconds(order.order.expiry);
  const collateralAddress = order.order.collateralToken;
  if (strikeBaseUnits <= 0n || expiryMs === null || !validAddress(collateralAddress) || !validAddress(raw.collateral)
    || collateralAddress.toLowerCase() !== raw.collateral.toLowerCase() || raw.collateral.toLowerCase() === ZERO_ADDRESS
    || order.order.price <= 0n || order.availableAmount <= 0n) return null;

  const collateralToken = resolveKnownToken(client.chainConfig, raw.collateral);
  if (collateralToken === null || !spot.isFinite() || spot.lte(0)) return null;

  const desiredContracts = decimalToBaseUnits(new Decimal(MARKET_NOTIONAL_USD).div(spot), collateralToken.decimals, Decimal.ROUND_CEIL);
  const requestedPremium = premiumForContracts(desiredContracts, order.order.price);
  if (desiredContracts <= 0n || requestedPremium <= 0n) return null;

  let preview: ReturnType<ThetanutsReadClient["optionBook"]["previewFillOrder"]>;
  try {
    preview = client.optionBook.previewFillOrder(order, requestedPremium);
  } catch {
    return null;
  }
  if (preview.numContracts <= 0n || preview.maxContracts <= 0n || preview.numContracts > preview.maxContracts
    || preview.totalCollateral <= 0n || preview.pricePerContract !== order.order.price
    || preview.collateralToken.toLowerCase() !== raw.collateral.toLowerCase() || preview.isCall
    || preview.strikes.length !== 1 || preview.strikes[0] !== strikeBaseUnits || preview.expiry !== order.order.expiry) return null;

  const premiumUsd = underlyingFromContractBaseUnits(preview.totalCollateral, collateralToken.decimals);
  const quantityUnderlying = underlyingFromContractBaseUnits(preview.numContracts, collateralToken.decimals);
  const strikeUsd = usdFromPriceBaseUnits(strikeBaseUnits);
  const floorUsd = Decimal.max(0, strikeUsd.mul(quantityUnderlying).minus(premiumUsd));
  return {
    protocolOrderId: order.signature.toLowerCase(),
    strikeUsd: strikeUsd.toFixed(),
    expiry: new Date(expiryMs).toISOString(),
    premiumUsd: premiumUsd.toFixed(),
    estimatedFloorUsd: floorUsd.toFixed(),
    impliedVolatilityBps: impliedVolatilityBps(raw.greeks?.iv),
    goalCoverageBps: 10_000,
    settlementType,
    availableQuantityBaseUnits: preview.maxContracts.toString(),
    settlementTokenSymbol: collateralToken.symbol,
    settlementTokenDecimals: collateralToken.decimals,
  };
}

export function buildMarketChain(
  orders: readonly ThetanutsOrder[],
  client: Pick<ThetanutsReadClient, "chainConfig" | "optionBook">,
  spotUsd: string,
): ProtectionChainEntry[] {
  const spot = new Decimal(spotUsd);
  return orders.flatMap((order) => {
    const entry = chainEntryForOrder(order, client, spot);
    return entry ? [entry] : [];
  });
}

export async function captureMarketSnapshot(
  client: Pick<ThetanutsReadClient, "api" | "chainConfig" | "optionBook">,
  capturedAt = new Date(),
): Promise<MarketSnapshot> {
  if (Number.isNaN(capturedAt.valueOf())) throw new RangeError("Snapshot time must be a valid date.");
  const capturedAtIso = capturedAt.toISOString();
  const [orders, rawMarket] = await Promise.all([
    fetchEthPutOrders(client, Math.floor(capturedAt.getTime() / 1000)),
    client.api.getMarketData(),
  ]);
  const market = parseThetanutsMarketData(rawMarket);
  const marketDate = new Date(market.metadata.lastUpdated);
  const marketAsOf = Number.isNaN(marketDate.valueOf()) ? capturedAtIso : marketDate.toISOString();
  const ethSpotUsd = new Decimal(market.prices.ETH).toFixed();
  const chain = buildMarketChain(orders, client, ethSpotUsd);
  const index = deriveProtectionIndex({ chain, protectedValueUsd: MARKET_NOTIONAL_USD, marketAsOf });
  return MarketSnapshotSchema.parse({
    capturedAt: capturedAtIso,
    ethSpotUsd,
    optionCount: orders.length,
    medianIvBps: index.medianIvBps,
    costPer100Usd30d: index.costPer100Usd30d,
  });
}

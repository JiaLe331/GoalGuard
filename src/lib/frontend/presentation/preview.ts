import type { PreviewTradeResponse, ProtectionCandidate, Trade } from "@/lib/contracts";

/**
 * The unsigned preview for the presentation flow.
 *
 * Provenance, stated plainly because the rest of the fixture is captured and this is not:
 * no trade has ever been previewed against this candidate, so there is no recorded payload
 * to export. Everything derivable is derived from the real candidate and real Base
 * contracts -- the settlement token, the OptionBook, the premium, the quantity, and the
 * ERC-20 approve calldata, which is encoded here rather than copied from anywhere. The
 * execution calldata and the wallet balances are the parts with no captured source.
 *
 * Nothing here is presented as a live request: the panel this feeds is explicitly an
 * unsigned preview and no transaction is ever signed or broadcast.
 */

/** Thetanuts OptionBook on Base, from CHAIN_CONFIGS_BY_ID[8453].contracts.optionBook. */
export const OPTION_BOOK_BASE = "0x1bDff855d6811728acaDC00989e79143a2bdfDed";

/**
 * The wallet the presentation flow reports as connected. Set NEXT_PUBLIC_PRESENTATION_WALLET
 * to your own Base address so the preview shows an address you actually control; the
 * fallback is the standard burn address rather than someone else's account.
 */
export const PRESENTATION_WALLET =
  process.env.NEXT_PUBLIC_PRESENTATION_WALLET ?? "0x000000000000000000000000000000000000dEaD";

const APPROVE_SELECTOR = "0x095ea7b3";

const word = (value: string) => value.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/** Real ERC-20 `approve(spender, amount)` calldata for the premium this plan actually needs. */
export function encodeApprove(spender: string, amountBaseUnits: string): string {
  return `${APPROVE_SELECTOR}${word(spender)}${word(BigInt(amountBaseUnits).toString(16))}`;
}

export function buildPresentationPreview(input: {
  candidate: ProtectionCandidate;
  publicCandidate: PreviewTradeResponse["data"]["candidate"];
  goalId: string;
  councilDecisionId: string;
  walletAddress: string;
  idempotencyKey: string;
  tradeId: string;
  now: Date;
}): PreviewTradeResponse["data"] {
  const { candidate, goalId, councilDecisionId, walletAddress, idempotencyKey, tradeId, now } = input;
  const timestamp = now.toISOString();
  const premium = candidate.premiumAmountBaseUnits;

  const trade: Trade = {
    schemaVersion: 1,
    id: tradeId,
    goalId,
    candidateId: candidate.id,
    councilDecisionId,
    idempotencyKey,
    walletAddress,
    chainId: 8453,
    status: "previewed",
    // Binds the preview to this exact quote; the real service hashes the same inputs.
    quoteFingerprint: candidate.protocolOrderId?.replace(/^0x/, "").slice(0, 64).padEnd(64, "0") ?? "0".repeat(64),
    previewExpiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
    settlementTokenAddress: candidate.settlementTokenAddress,
    premiumAmountBaseUnits: premium,
    premiumUsd: candidate.premiumUsd,
    txHash: null,
    protocolPositionId: null,
    failureCode: null,
    failureMessage: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: null,
    confirmedAt: null,
  };

  return {
    trade,
    candidate: input.publicCandidate,
    allowance: {
      tokenAddress: candidate.settlementTokenAddress,
      spenderAddress: OPTION_BOOK_BASE,
      currentAmountBaseUnits: "0",
      requiredAmountBaseUnits: premium,
      approvalRequired: true,
    },
    approvalTransaction: {
      chainId: 8453,
      to: candidate.settlementTokenAddress,
      data: encodeApprove(OPTION_BOOK_BASE, premium),
      valueBaseUnits: "0",
    },
    executionTransaction: {
      chainId: 8453,
      to: OPTION_BOOK_BASE,
      data: `0x${"00".repeat(4)}`,
      valueBaseUnits: "0",
    },
    estimatedGasBaseUnits: "312000",
    walletReadiness: {
      gas: { symbol: "ETH", balanceBaseUnits: "8500000000000000", requiredBaseUnits: "312000000000000", sufficient: true },
      settlementToken: { symbol: candidate.settlementTokenSymbol, balanceBaseUnits: "5000000", requiredBaseUnits: premium, sufficient: true },
      underlyingExposure: { symbol: "ETH", balanceBaseUnits: "60000000000000000", requiredBaseUnits: candidate.quantityBaseUnits, sufficient: true },
    },
    referralDisclosure: {
      referrerAddress: null,
      mayReceiveFee: false,
      message: "No GoalGuard referrer fee is configured.",
    },
    purpose: "unsigned_transaction_preview",
    proposal: {
      premiumAmountBaseUnits: premium,
      quantityBaseUnits: candidate.quantityBaseUnits,
      coverageMode: candidate.coverageMode,
      goalCoverageBps: candidate.goalCoverageBps,
    },
    warnings: [],
  };
}

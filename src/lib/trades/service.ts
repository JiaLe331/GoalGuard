import "server-only";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { getAddress } from "ethers";

import { readServerEnvironment } from "@/lib/config/env";
import type { BalanceReadiness, PreparedTransaction, ProtectionCandidate, Trade, TradePreview, UUID } from "@/lib/contracts";
import { publicCandidate } from "@/lib/contracts";
import type { GoalGuardRepository } from "@/lib/db/repository";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { hashJson, sha256 } from "@/lib/domain/hash";
import { ApiRouteError } from "@/lib/server/http";
import { fetchEthPutOrders, type ThetanutsOrder, type ThetanutsReadClient, withConfiguredThetanutsRead } from "@/lib/thetanuts/client";
import { orderId, serializeOrder } from "@/lib/thetanuts/strategy";

const BASE_CHAIN_ID = 8453 as const;
const QUOTE_LIFETIME_MS = 120_000;
const ORDER_SAFETY_MARGIN_MS = 30_000;
type PreviewClient = Pick<ThetanutsReadClient, "api" | "erc20" | "optionBook" | "chainConfig">;
interface PreviewDependencies { now?: () => Date; withClient?: <T>(operation: (client: PreviewClient) => Promise<T>) => Promise<T>; }

function prepared(to: string, data: string): PreparedTransaction { return { chainId: BASE_CHAIN_ID, to: getAddress(to), data: data as `0x${string}`, valueBaseUnits: "0" }; }
function stale(message: string): never { throw new ApiRouteError("CANDIDATE_STALE", message, 409, true); }

function deadlineMs(order: ThetanutsOrder): number {
  const deadline = order.order.deadline ?? BigInt(order.rawApiData?.orderExpiryTimestamp ?? 0);
  if (deadline <= 0n || deadline > BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000))) stale("The selected live order has an invalid deadline.");
  return Number(deadline) * 1000;
}

function assertCandidateInvariants(candidate: ProtectionCandidate, nowMs: number, capUsd: string) {
  if (candidate.coverageMode === "full" && candidate.goalCoverageBps !== 10_000) stale("The selected candidate no longer has full coverage.");
  if (candidate.coverageMode === "proportional_demo" && (candidate.goalCoverageBps <= 0 || candidate.goalCoverageBps >= 10_000)) stale("The selected proportional candidate has invalid coverage.");
  if (!Number.isFinite(Date.parse(candidate.marketAsOf)) || Date.parse(candidate.marketAsOf) + QUOTE_LIFETIME_MS <= nowMs) stale("The selected market data is no longer fresh.");
  if (Date.parse(candidate.expiry) <= nowMs) stale("The selected option has expired.");
  if (new Decimal(candidate.premiumUsd).greaterThan(capUsd)) throw new ApiRouteError("TRADE_CAP_EXCEEDED", "The proposed premium exceeds the demo preview cap.", 422);
}

async function buildUnsignedPreview(candidate: ProtectionCandidate, walletAddress: string, now: Date, withClient: <T>(operation: (client: PreviewClient) => Promise<T>) => Promise<T>) {
  if (!candidate.protocolOrderId) throw new ApiRouteError("NOT_FOUND", "Candidate order was not found.", 404);
  return withClient(async (client) => {
    const orders = await fetchEthPutOrders(client, Math.floor(now.getTime() / 1000));
    const order = orders.find((item) => orderId(item) === candidate.protocolOrderId);
    if (!order) stale("The selected live order is no longer available.");
    if (hashJson(serializeOrder(order)) !== hashJson(candidate.protocolRaw)) stale("The selected live order changed and requires a new review.");
    const orderDeadline = deadlineMs(order);
    if (orderDeadline <= now.getTime() + ORDER_SAFETY_MARGIN_MS) stale("The selected live order is too close to its deadline.");
    const env = readServerEnvironment(); const amount = BigInt(candidate.premiumAmountBaseUnits);
    const preview = client.optionBook.previewFillOrder(order, amount, env.THETANUTS_REFERRER_ADDRESS);
    if (preview.totalCollateral !== amount || preview.numContracts.toString() !== candidate.quantityBaseUnits || preview.maxContracts < preview.numContracts) stale("The live order liquidity or proposal amount changed.");
    const encoded = client.optionBook.encodeFillOrder(order, amount, env.THETANUTS_REFERRER_ADDRESS);
    const execution = prepared(encoded.to, encoded.data); const token = getAddress(candidate.settlementTokenAddress); const spender = execution.to;
    const current = await client.erc20.getAllowance(token, getAddress(walletAddress), spender); const approvalRequired = current < amount;
    const approval = approvalRequired ? client.erc20.encodeApprove(token, spender, amount) : null;
    const underlyingExposure = await buildUnderlyingExposure(candidate, walletAddress, client);
    return { execution, approval: approval ? prepared(approval.to, approval.data) : null, allowance: { tokenAddress: token, spenderAddress: spender, currentAmountBaseUnits: current.toString(), requiredAmountBaseUnits: amount.toString(), approvalRequired }, underlyingExposure, expiresAt: new Date(Math.min(now.getTime() + QUOTE_LIFETIME_MS, orderDeadline - ORDER_SAFETY_MARGIN_MS)).toISOString(), quoteFingerprint: hashJson({ order: serializeOrder(order), premiumAmountBaseUnits: amount.toString() }) };
  });
}

// Cash settlement never requires the user to deliver ETH; physical settlement requires delivering
// exactly candidate.quantityBaseUnits of WETH at settlement (see units.ts/strategy.ts commentary
// on the verified PHYSICAL_PUT delivery mechanics). This is a preview-time snapshot only -- it
// cannot guarantee the wallet still holds enough WETH by the time expiry/settlement occurs.
async function buildUnderlyingExposure(candidate: ProtectionCandidate, walletAddress: string, client: PreviewClient): Promise<BalanceReadiness> {
  if (candidate.settlementType !== "physical") return { symbol: "ETH", balanceBaseUnits: "0", requiredBaseUnits: "0", sufficient: true };
  const weth = client.chainConfig.tokens.WETH;
  if (!weth) return { symbol: "ETH", balanceBaseUnits: "0", requiredBaseUnits: candidate.quantityBaseUnits, sufficient: false };
  const required = BigInt(candidate.quantityBaseUnits);
  const balance = await client.erc20.getBalance(weth.address, getAddress(walletAddress));
  return { symbol: "ETH", balanceBaseUnits: balance.toString(), requiredBaseUnits: required.toString(), sufficient: balance >= required };
}

export async function previewTrade(goalId: UUID, candidateId: UUID, decisionId: UUID, walletAddress: string, idempotencyKey: string, ownerSessionHash: string, repository: GoalGuardRepository = new PostgresGoalGuardRepository(), dependencies: PreviewDependencies = {}): Promise<TradePreview> {
  const [goal, candidate, decision, latestDecision] = await Promise.all([repository.getGoal(goalId, ownerSessionHash), repository.getCandidate(candidateId, ownerSessionHash), repository.getDecision(decisionId, ownerSessionHash), repository.getLatestDecision(candidateId, ownerSessionHash)]);
  if (!goal || !candidate || !decision || candidate.goalId !== goal.id || decision.goalId !== goal.id || decision.candidateId !== candidate.id) throw new ApiRouteError("NOT_FOUND", "The goal, candidate, and decision do not match.", 404);
  if (goal.status !== "ready" || goal.selectedCandidateId !== candidate.id || goal.councilDecisionId !== decision.id || candidate.status !== "selected") stale("The selected candidate is no longer current.");
  if (decision.status !== "approved" || latestDecision?.id !== decision.id || latestDecision.status !== "approved") stale("The approved council decision is no longer current.");
  const env = readServerEnvironment(); const now = dependencies.now?.() ?? new Date(); assertCandidateInvariants(candidate, now.getTime(), env.MAX_LIVE_TRADE_PREMIUM_USD);
  const withClient = dependencies.withClient ?? ((operation) => withConfiguredThetanutsRead(operation)); const exact = await buildUnsignedPreview(candidate, walletAddress, now, withClient);
  if (Date.parse(exact.expiresAt) <= now.getTime()) stale("The selected live order expires before a safe preview can be created.");
  const trade: Trade = { schemaVersion: 1, id: randomUUID(), goalId, candidateId, councilDecisionId: decisionId, idempotencyKey, walletAddress: getAddress(walletAddress), chainId: BASE_CHAIN_ID, status: "previewed", quoteFingerprint: exact.quoteFingerprint, previewExpiresAt: exact.expiresAt, settlementTokenAddress: candidate.settlementTokenAddress, premiumAmountBaseUnits: candidate.premiumAmountBaseUnits, premiumUsd: candidate.premiumUsd, txHash: null, protocolPositionId: null, failureCode: null, failureMessage: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), submittedAt: null, confirmedAt: null };
  const saved = await repository.createTrade(trade, { target: exact.execution.to, calldataHash: sha256(exact.execution.data.toLowerCase()), valueBaseUnits: exact.execution.valueBaseUnits, verificationDeadline: exact.expiresAt }, ownerSessionHash);
  const referrer = env.THETANUTS_REFERRER_ADDRESS ?? null;
  return { trade: saved, candidate: publicCandidate(candidate), allowance: exact.allowance, approvalTransaction: exact.approval, executionTransaction: exact.execution, estimatedGasBaseUnits: null, walletReadiness: { gas: { symbol: "ETH", balanceBaseUnits: "0", requiredBaseUnits: "0", sufficient: false }, settlementToken: { symbol: candidate.settlementTokenSymbol, balanceBaseUnits: "0", requiredBaseUnits: candidate.premiumAmountBaseUnits, sufficient: false }, underlyingExposure: exact.underlyingExposure }, referralDisclosure: { referrerAddress: referrer, mayReceiveFee: Boolean(referrer), message: referrer ? "The configured referrer may receive part of the protocol fee." : "No GoalGuard referrer fee is configured." }, purpose: "unsigned_transaction_preview", proposal: { premiumAmountBaseUnits: candidate.premiumAmountBaseUnits, quantityBaseUnits: candidate.quantityBaseUnits, coverageMode: candidate.coverageMode, goalCoverageBps: candidate.goalCoverageBps }, warnings: ["This is an unsigned demo preview. No transaction was signed, no funds moved, and no protected position was created.", exact.approval ? "The displayed token approval is exact and unsigned." : null].filter((value): value is string => value !== null) };
}

export async function prepareExecution(): Promise<never> { throw new ApiRouteError("EXECUTION_DISABLED", "Execution is disabled for the unsigned-demo policy.", 422); }
export async function recordSubmission(): Promise<never> { throw new ApiRouteError("EXECUTION_DISABLED", "Submission is disabled for the unsigned-demo policy.", 422); }

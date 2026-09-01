import "server-only";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { getAddress, JsonRpcProvider, parseUnits } from "ethers";

import { readServerEnvironment } from "@/lib/config/env";
import type { PreparedTransaction, Trade, TradePreview, UUID, WalletReadiness } from "@/lib/contracts";
import { publicCandidate } from "@/lib/contracts";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { hashJson, sha256 } from "@/lib/domain/hash";
import { ApiRouteError } from "@/lib/server/http";
import { createConfiguredThetanutsClient } from "@/lib/thetanuts/client";
import { deserializeOrder, orderId, serializeOrder } from "@/lib/thetanuts/strategy";
import { matchesPreparedTransaction } from "./verification";

const quoteFields = (raw: unknown, premium: string) => ({ order: raw, premiumAmountBaseUnits: premium });
const prepared = (to: string, data: string): PreparedTransaction => ({ chainId: 8453, to: getAddress(to), data: data as `0x${string}`, valueBaseUnits: "0" });

async function freshOrder(client: ReturnType<typeof createConfiguredThetanutsClient>, protocolOrderId: string) {
  const orders = await client.api.filterOrders({ asset: "ETH", type: "put", minExpiry: Math.floor(Date.now() / 1000) });
  return orders.find((order) => orderId(order) === protocolOrderId) ?? null;
}

async function executionForCandidate(candidate: Awaited<ReturnType<PostgresGoalGuardRepository["getCandidate"]>>, walletAddress: string, requireSimulation: boolean) {
  if (!candidate?.protocolOrderId) throw new ApiRouteError("NOT_FOUND", "Candidate order was not found.", 404);
  const env = readServerEnvironment();
  if (!env.THETANUTS_RPC_URL) throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Thetanuts RPC is not configured.", 503, true);
  const client = createConfiguredThetanutsClient(env.THETANUTS_RPC_URL, env.THETANUTS_REFERRER_ADDRESS);
  const order = await freshOrder(client, candidate.protocolOrderId);
  if (!order) throw new ApiRouteError("CANDIDATE_STALE", "The selected live order is no longer available.", 409, true);
  if (hashJson(serializeOrder(order)) !== hashJson(candidate.protocolRaw)) throw new ApiRouteError("CANDIDATE_STALE", "The selected live order changed and requires a new review.", 409, true);
  const amount = BigInt(candidate.premiumAmountBaseUnits);
  const encoded = client.optionBook.encodeFillOrder(order, amount, env.THETANUTS_REFERRER_ADDRESS);
  const execution = prepared(encoded.to, encoded.data);
  const spender = getAddress(encoded.to); const token = getAddress(candidate.settlementTokenAddress); const wallet = getAddress(walletAddress);
  const provider = new JsonRpcProvider(env.THETANUTS_RPC_URL, 8453, { staticNetwork: true });
  const [allowanceAmount, settlementBalance, gasBalance, feeData] = await Promise.all([
    client.erc20.getAllowance(token, wallet, spender), client.erc20.getBalance(token, wallet), provider.getBalance(wallet), provider.getFeeData(),
  ]);
  const requiredExposure = parseUnits(candidate.quantityUnderlying, 18); const approvalRequired = allowanceAmount < amount;
  const approvalEncoded = approvalRequired ? client.erc20.encodeApprove(token, spender, amount) : null;
  let estimatedGas: bigint | null = null;
  if (!approvalRequired) {
    try {
      await provider.call({ from: wallet, to: execution.to, data: execution.data, value: 0n });
      estimatedGas = await provider.estimateGas({ from: wallet, to: execution.to, data: execution.data, value: 0n });
    } catch { if (requireSimulation) throw new ApiRouteError("CANDIDATE_STALE", "The exact transaction no longer simulates successfully.", 409, true); }
  }
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n; const requiredGas = estimatedGas ? estimatedGas * gasPrice * 12n / 10n : 0n;
  const readiness: WalletReadiness = {
    gas: { symbol: "ETH", balanceBaseUnits: gasBalance.toString(), requiredBaseUnits: requiredGas.toString(), sufficient: gasBalance >= requiredGas },
    settlementToken: { symbol: candidate.settlementTokenSymbol, balanceBaseUnits: settlementBalance.toString(), requiredBaseUnits: amount.toString(), sufficient: settlementBalance >= amount },
    underlyingExposure: { symbol: "ETH", balanceBaseUnits: gasBalance.toString(), requiredBaseUnits: requiredExposure.toString(), sufficient: gasBalance >= requiredExposure },
  };
  return { candidate, freshRaw: serializeOrder(order), execution, approval: approvalEncoded ? prepared(approvalEncoded.to, approvalEncoded.data) : null, allowance: { tokenAddress: token, spenderAddress: spender, currentAmountBaseUnits: allowanceAmount.toString(), requiredAmountBaseUnits: amount.toString(), approvalRequired }, readiness, estimatedGas: estimatedGas?.toString() ?? null };
}

export async function previewTrade(goalId: UUID, candidateId: UUID, decisionId: UUID, walletAddress: string, ownerSessionHash: string, repository = new PostgresGoalGuardRepository()): Promise<TradePreview> {
  const [goal, candidate, decision] = await Promise.all([repository.getGoal(goalId, ownerSessionHash), repository.getCandidate(candidateId, ownerSessionHash), repository.getDecision(decisionId, ownerSessionHash)]);
  if (!goal || !candidate || !decision || candidate.goalId !== goal.id || decision.goalId !== goal.id || decision.candidateId !== candidate.id) throw new ApiRouteError("NOT_FOUND", "The goal, candidate, and decision do not match.", 404);
  if (decision.status !== "approved") throw new ApiRouteError("COUNCIL_NOT_APPROVED", "All three council checks must pass before preview.", 422);
  if (candidate.status !== "selected") throw new ApiRouteError("CANDIDATE_STALE", "The candidate is no longer selected.", 409, true);
  const exact = await executionForCandidate(candidate, walletAddress, false);
  if (!exact.readiness.underlyingExposure.sufficient) throw new ApiRouteError("INSUFFICIENT_EXPOSURE", "This wallet holds less ETH than the candidate is designed to protect.", 422, false, { requiredBaseUnits: exact.readiness.underlyingExposure.requiredBaseUnits });
  const now = new Date(); const order = deserializeOrder(exact.freshRaw); const orderDeadline = Number(order.order.deadline ?? BigInt(order.rawApiData?.orderExpiryTimestamp ?? 0)) * 1000;
  const expiresAt = new Date(Math.min(now.getTime() + 120_000, orderDeadline - 30_000)).toISOString(); const quoteFingerprint = hashJson(quoteFields(exact.freshRaw, candidate.premiumAmountBaseUnits));
  const trade: Trade = { schemaVersion: 1, id: randomUUID(), goalId, candidateId, councilDecisionId: decisionId, idempotencyKey: `preview:${randomUUID()}`, walletAddress: getAddress(walletAddress), chainId: 8453, status: "previewed", quoteFingerprint, previewExpiresAt: expiresAt, settlementTokenAddress: candidate.settlementTokenAddress, premiumAmountBaseUnits: candidate.premiumAmountBaseUnits, premiumUsd: candidate.premiumUsd, txHash: null, protocolPositionId: null, failureCode: null, failureMessage: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), submittedAt: null, confirmedAt: null };
  await repository.createTrade(trade, { target: exact.execution.to, calldataHash: sha256(exact.execution.data.toLowerCase()), valueBaseUnits: exact.execution.valueBaseUnits, verificationDeadline: new Date(now.getTime() + 10 * 60_000).toISOString() }, ownerSessionHash);
  const warnings = [!exact.readiness.settlementToken.sufficient ? `Wallet needs ${candidate.premiumUsd} ${candidate.settlementTokenSymbol} before execution.` : null, exact.approval ? "An exact token approval is required before the protection trade." : null, readServerEnvironment().THETANUTS_REFERRER_ADDRESS ? "GoalGuard's configured referrer may receive a share of protocol fees; your displayed premium remains the transaction cap." : null].filter((value): value is string => Boolean(value));
  const referrer = readServerEnvironment().THETANUTS_REFERRER_ADDRESS ?? null;
  return { trade, candidate: publicCandidate(candidate), allowance: exact.allowance, approvalTransaction: exact.approval, executionTransaction: exact.execution, estimatedGasBaseUnits: exact.estimatedGas, walletReadiness: exact.readiness, referralDisclosure: { referrerAddress: referrer, mayReceiveFee: Boolean(referrer), message: referrer ? "The configured referrer may receive part of the protocol fee." : "No GoalGuard referrer fee is configured." }, warnings };
}

export async function prepareExecution(tradeId: UUID, quoteFingerprint: string, walletAddress: string, ownerSessionHash: string, repository = new PostgresGoalGuardRepository()) {
  const env = readServerEnvironment();
  if (env.ENABLE_LIVE_THETANUTS_EXECUTION !== "true") throw new ApiRouteError("EXECUTION_DISABLED", "Live execution remains disabled pending organizer approval.", 422);
  if (!env.THETANUTS_REFERRER_ADDRESS) throw new ApiRouteError("EXECUTION_DISABLED", "A disclosed Thetanuts referrer address is required for live execution.", 422);
  if (!await repository.isWorkerHealthy(env.TRADE_WORKER_NAME)) throw new ApiRouteError("TRADE_MONITOR_UNAVAILABLE", "The trade monitor is not healthy; signing is paused.", 503, true);
  const verification = await repository.getTradeVerification(tradeId, ownerSessionHash); if (!verification) throw new ApiRouteError("NOT_FOUND", "Trade was not found.", 404);
  const trade = verification.trade;
  if (!["previewed", "awaiting_signature"].includes(trade.status)) throw new ApiRouteError("CONFLICT", "Trade is not available for signature preparation.", 409);
  if (trade.quoteFingerprint !== quoteFingerprint) throw new ApiRouteError("CANDIDATE_STALE", "The quote fingerprint does not match the saved preview.", 409);
  if (Date.parse(trade.previewExpiresAt) <= Date.now()) { await repository.transitionTrade(trade.id, ownerSessionHash, ["previewed"], "stale"); throw new ApiRouteError("QUOTE_EXPIRED", "The live preview expired.", 410, true); }
  if (trade.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) throw new ApiRouteError("CONFLICT", "The connected wallet differs from the preview wallet.", 409);
  if (new Decimal(trade.premiumUsd).greaterThan(env.MAX_LIVE_TRADE_PREMIUM_USD)) throw new ApiRouteError("TRADE_CAP_EXCEEDED", "The premium exceeds the live execution cap.", 422);
  const candidate = await repository.getCandidate(trade.candidateId, ownerSessionHash); const exact = await executionForCandidate(candidate, walletAddress, true);
  if (hashJson(quoteFields(exact.freshRaw, trade.premiumAmountBaseUnits)) !== trade.quoteFingerprint || exact.execution.to.toLowerCase() !== verification.expectedExecutionTarget.toLowerCase() || sha256(exact.execution.data.toLowerCase()) !== verification.expectedCalldataHash) throw new ApiRouteError("CANDIDATE_STALE", "The exact transaction changed after preview.", 409, true);
  if (!exact.readiness.settlementToken.sufficient) throw new ApiRouteError("INSUFFICIENT_BALANCE", "The wallet lacks the required settlement token balance.", 422);
  if (!exact.readiness.gas.sufficient) throw new ApiRouteError("INSUFFICIENT_BALANCE", "The wallet lacks enough ETH for estimated gas.", 422);
  const awaiting = trade.status === "awaiting_signature" ? trade : await repository.transitionTrade(trade.id, ownerSessionHash, ["previewed"], "awaiting_signature");
  return { trade: awaiting, approvalTransaction: exact.approval, executionTransaction: exact.execution };
}

export async function recordSubmission(tradeId: UUID, txHash: string, walletAddress: string, ownerSessionHash: string, repository = new PostgresGoalGuardRepository()) {
  const env = readServerEnvironment(); if (!env.THETANUTS_RPC_URL) throw new ApiRouteError("THETANUTS_UNAVAILABLE", "Base RPC is not configured.", 503, true);
  const verification = await repository.getTradeVerification(tradeId, ownerSessionHash); if (!verification) throw new ApiRouteError("NOT_FOUND", "Trade was not found.", 404);
  if (verification.trade.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) throw new ApiRouteError("NOT_FOUND", "Trade was not found.", 404);
  const provider = new JsonRpcProvider(env.THETANUTS_RPC_URL, 8453, { staticNetwork: true }); const transaction = await provider.getTransaction(txHash);
  if (!transaction) throw new ApiRouteError("CONFLICT", "The transaction is not visible on Base yet.", 409, true);
  const matches = matchesPreparedTransaction(transaction, { walletAddress, target: verification.expectedExecutionTarget, calldataHash: verification.expectedCalldataHash, valueBaseUnits: verification.expectedValueBaseUnits });
  if (!matches) throw new ApiRouteError("CONFLICT", "The transaction does not match the prepared protection trade.", 409);
  return repository.recordSubmission(tradeId, ownerSessionHash, txHash);
}

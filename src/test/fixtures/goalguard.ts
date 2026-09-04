import type {
  CouncilDecision,
  GenerateCandidatesResponse,
  GetGoalResponse,
  Goal,
  ParseGoalResponse,
  PreviewTradeResponse,
  ProtectionCandidate,
  ReviewCandidateResponse,
  Trade,
  UpdateGoalResponse,
} from "@/lib/contracts";
import { publicCandidate } from "@/lib/contracts";

export const fixtureIds = {
  request: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  goal: "1b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  candidate: "2b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  decision: "3b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  trade: "5b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
};

export const fixtureMeta = { requestId: fixtureIds.request, timestamp: "2026-08-31T12:00:00.000Z" };

export const fixtureGoal: Goal = {
  schemaVersion: 1,
  id: fixtureIds.goal,
  goalType: "rent",
  customGoalLabel: null,
  underlyingAsset: "ETH",
  protectedValueUsd: "1200",
  deadline: "2099-09-30",
  maxLossBps: 500,
  maxPremiumUsd: "3",
  originalUserMessage: "Protect my $1,200 ETH rent fund by 30 September and limit loss to 5%.",
  status: "draft",
  createdAt: "2026-08-31T12:00:00.000Z",
  updatedAt: "2026-08-31T12:00:00.000Z",
  parseInferenceId: "6b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  selectedCandidateId: null,
  councilDecisionId: null,
  tradeId: null,
};

export const fixtureCandidate: ProtectionCandidate = {
  schemaVersion: 1,
  id: fixtureIds.candidate,
  goalId: fixtureIds.goal,
  source: "optionbook",
  protocolOrderId: "test-order-1",
  underlyingAsset: "ETH",
  optionType: "put",
  settlementType: "cash",
  strikeUsd: "2800",
  expiry: "2099-09-30T08:00:00.000Z",
  settlementTokenAddress: "0x1111111111111111111111111111111111111111",
  settlementTokenSymbol: "USDC",
  settlementTokenDecimals: 6,
  premiumAmountBaseUnits: "2500000",
  premiumUsd: "2.5",
  quantityBaseUnits: "10000000000000000",
  quantityUnderlying: "0.01",
  maxPremiumLossUsd: "2.5",
  estimatedFloorUsd: "1140",
  deadlineGapHours: 8,
  goalCoverageBps: 10000,
  coverageMode: "full",
  availableQuantityBaseUnits: "100000000000000000",
  status: "selected",
  rejectionReasons: [],
  protocolRaw: {},
  scenarios: [
    { key: "down", settlementPriceUsd: "2200", underlyingValueUsd: "942", optionPayoffUsd: "200.5", premiumCostUsd: "2.5", netProtectedValueUsd: "1140" },
    { key: "flat", settlementPriceUsd: "3000", underlyingValueUsd: "1200", optionPayoffUsd: "0", premiumCostUsd: "2.5", netProtectedValueUsd: "1197.5" },
    { key: "up", settlementPriceUsd: "3600", underlyingValueUsd: "1440", optionPayoffUsd: "0", premiumCostUsd: "2.5", netProtectedValueUsd: "1437.5" },
  ],
  marketAsOf: "2026-08-31T12:00:00.000Z",
  createdAt: "2026-08-31T12:00:00.000Z",
  updatedAt: "2026-08-31T12:00:00.000Z",
};
export const fixturePublicCandidate = publicCandidate(fixtureCandidate);

export const fixturePhysicalCandidate: ProtectionCandidate = {
  ...fixtureCandidate,
  id: "7b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  protocolOrderId: "test-physical-order-1",
  settlementType: "physical",
  settlementTokenAddress: "0x4444444444444444444444444444444444444444",
  settlementTokenSymbol: "aBasUSDC",
  settlementTokenDecimals: 6,
};
export const fixturePublicPhysicalCandidate = publicCandidate(fixturePhysicalCandidate);

const review = (role: "strategist" | "risk_auditor" | "consumer_advocate", index: number) => ({
  schemaVersion: 1 as const,
  id: `00000000-0000-4000-8000-00000000000${index}`,
  decisionId: fixtureIds.decision,
  inferenceId: `10000000-0000-4000-8000-00000000000${index}`,
  role,
  model: index === 1 ? "gonka-model-a" : "gonka-model-b",
  requestId: `gonka-request-${index}`,
  verdict: "approve" as const,
  confidenceBps: 8500,
  summary: "The deterministic candidate fits the stated constraints.",
  concerns: [],
  requiredDisclosures: ["Protection is evaluated at the displayed expiry."],
  createdAt: "2026-08-31T12:00:00.000Z",
});

export const fixtureDecision: CouncilDecision = {
  schemaVersion: 1,
  id: fixtureIds.decision,
  goalId: fixtureIds.goal,
  candidateId: fixtureIds.candidate,
  attempt: 1,
  status: "approved",
  rulesetVersion: "1",
  approvedReviewCount: 3,
  rejectedReviewCount: 0,
  uncertainReviewCount: 0,
  blockedReasons: [],
  reviews: [review("strategist", 1), review("risk_auditor", 2), review("consumer_advocate", 3)],
  createdAt: "2026-08-31T12:00:00.000Z",
};

export const fixtureDisputedDecision: CouncilDecision = {
  ...fixtureDecision,
  status: "disputed",
  approvedReviewCount: 2,
  uncertainReviewCount: 1,
  reviews: fixtureDecision.reviews.map((item, index) => index === 2 ? { ...item, verdict: "uncertain" as const, concerns: ["The deadline gap needs clearer disclosure."] } : item),
};

export const fixtureBlockedDecision: CouncilDecision = {
  ...fixtureDecision,
  status: "blocked",
  approvedReviewCount: 2,
  rejectedReviewCount: 1,
  blockedReasons: ["The candidate violates a hard user constraint."],
  reviews: fixtureDecision.reviews.map((item, index) => index === 1 ? { ...item, verdict: "reject" as const, concerns: ["The protection cost exceeds the stated limit."] } : item),
};

export const fixtureReadyGoal: Goal = {
  ...fixtureGoal,
  status: "ready",
  selectedCandidateId: fixtureIds.candidate,
  councilDecisionId: fixtureIds.decision,
};

export const fixtureTrade: Trade = {
  schemaVersion: 1,
  id: fixtureIds.trade,
  goalId: fixtureIds.goal,
  candidateId: fixtureIds.candidate,
  councilDecisionId: fixtureIds.decision,
  idempotencyKey: "00000000-0000-4000-8000-000000000000",
  walletAddress: "0x1111111111111111111111111111111111111111",
  chainId: 8453,
  status: "previewed",
  quoteFingerprint: "a".repeat(64),
  previewExpiresAt: "2099-09-30T08:00:00.000Z",
  settlementTokenAddress: "0x1111111111111111111111111111111111111111",
  premiumAmountBaseUnits: "2500000",
  premiumUsd: "2.5",
  txHash: null,
  protocolPositionId: null,
  failureCode: null,
  failureMessage: null,
  createdAt: "2026-08-31T12:00:00.000Z",
  updatedAt: "2026-08-31T12:00:00.000Z",
  submittedAt: null,
  confirmedAt: null,
};

export const parseGoalResponse: ParseGoalResponse = { data: { draft: {}, missingFields: [], clarificationQuestion: null, goal: fixtureGoal, inference: { id: "6b3e798c-e0e8-4ab5-9e37-d4526424eb8f", purpose: "goal_parse", model: "gonka-model-a", requestId: "gonka-parse-1", status: "succeeded" } }, meta: fixtureMeta };
export const updateGoalResponse: UpdateGoalResponse = { data: { goal: fixtureGoal }, meta: fixtureMeta };
export const generateCandidatesResponse: GenerateCandidatesResponse = { data: { goal: { ...fixtureGoal, status: "reviewing", selectedCandidateId: fixtureIds.candidate }, candidates: [fixturePublicCandidate], selectedCandidateId: fixtureIds.candidate, rejected: [], marketAsOf: fixtureCandidate.marketAsOf }, meta: fixtureMeta };
export const reviewCandidateResponse: ReviewCandidateResponse = { data: { goal: fixtureReadyGoal, candidate: fixturePublicCandidate, decision: fixtureDecision, inferences: fixtureDecision.reviews.map((item) => ({ id: item.inferenceId, purpose: `${item.role === "strategist" ? "strategist" : item.role}_review` as "strategist_review" | "risk_auditor_review" | "consumer_advocate_review", model: item.model, requestId: item.requestId, status: "succeeded" })) }, meta: fixtureMeta };
export const getDraftGoalResponse: GetGoalResponse = { data: { goal: fixtureGoal, selectedCandidate: null, councilDecision: null, trade: null }, meta: fixtureMeta };
export const previewTradeResponse: PreviewTradeResponse = {
  data: {
    trade: fixtureTrade,
    candidate: fixturePublicCandidate,
    allowance: { tokenAddress: fixtureCandidate.settlementTokenAddress, spenderAddress: "0x2222222222222222222222222222222222222222", currentAmountBaseUnits: "0", requiredAmountBaseUnits: "2500000", approvalRequired: true },
    approvalTransaction: { chainId: 8453, to: fixtureCandidate.settlementTokenAddress, data: "0x1234", valueBaseUnits: "0" },
    executionTransaction: { chainId: 8453, to: "0x3333333333333333333333333333333333333333", data: "0xabcd", valueBaseUnits: "0" },
    estimatedGasBaseUnits: "250000",
    walletReadiness: { gas: { symbol: "ETH", balanceBaseUnits: "1000000000000000000", requiredBaseUnits: "100000000000000", sufficient: true }, settlementToken: { symbol: "USDC", balanceBaseUnits: "10000000", requiredBaseUnits: "2500000", sufficient: true }, underlyingExposure: { symbol: "ETH", balanceBaseUnits: "1000000000000000000", requiredBaseUnits: "10000000000000000", sufficient: true } },
    referralDisclosure: { referrerAddress: null, mayReceiveFee: false, message: "No GoalGuard referrer fee is configured." },
    purpose: "unsigned_transaction_preview",
    proposal: { premiumAmountBaseUnits: "2500000", quantityBaseUnits: "10000000000000000", coverageMode: "full", goalCoverageBps: 10000 },
    warnings: [],
  },
  meta: fixtureMeta,
};

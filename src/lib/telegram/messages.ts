import type { CouncilDecision, Goal, GoalStatus, ProtectionCandidate, Trade } from "@/lib/contracts";
import { formatDate, formatPercentFromBps, formatUsd } from "@/lib/frontend/format";

import type {
  TelegramCouncilApprovedPayload,
  TelegramCouncilBlockedPayload,
  TelegramCouncilDisputedPayload,
  TelegramConnectionReceiptPayload,
  TelegramGoalDeadlinePayload,
  TelegramNotificationPreferences,
  TelegramNotificationPayload,
  TelegramOptionExpiryPayload,
  TelegramPreviewExpiringPayload,
  TelegramPreviewReadyPayload,
} from "./contracts";

const goalLabels: Record<Goal["goalType"], string> = {
  rent: "Rent",
  tuition: "Tuition",
  travel: "Travel",
  emergency: "Emergency fund",
  custom: "Goal",
};

export const TELEGRAM_HELP_TEXT = [
  "🛡 GoalGuard alerts",
  "",
  "Goals are created on the GoalGuard website. Telegram only reports enabled GoalGuard updates and reminders.",
  "",
  "Supported commands:",
  "/start <link> — connect alerts from GoalGuard",
  "/help — show this help",
  "/status, /goals, /alerts — inspect linked alerts",
  "/stop — pause all optional alerts",
  "/unlink — disconnect this Telegram account",
  "",
  "GoalGuard will never ask for your seed phrase, private key, or wallet signature here.",
  "No Telegram action creates, signs, sends, or executes a trade.",
].join("\n");

export const TELEGRAM_START_WEBSITE_TEXT = [
  "Goals are created on the GoalGuard website.",
  "Open GoalGuard to create a goal and request a one-time Telegram alerts link.",
  "",
  "GoalGuard will never ask for your seed phrase, private key, or wallet signature here.",
].join("\n");

export const TELEGRAM_INVALID_LINK_TEXT = [
  "That GoalGuard link is invalid or expired.",
  "Return to the GoalGuard browser and generate a new Telegram link.",
].join("\n");

export const TELEGRAM_BLOCKED_TEXT = [
  "GoalGuard cannot deliver alerts because this bot is blocked in Telegram.",
  "Unblock the bot, then return to GoalGuard and generate a new link.",
].join("\n");

export function goalLabel(goal: Pick<Goal, "goalType" | "customGoalLabel">) {
  return goal.goalType === "custom" ? goal.customGoalLabel ?? goalLabels.custom : goalLabels[goal.goalType];
}

export function safeTelegramLabel(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function statusLabel(status: GoalStatus) {
  return status.replace(/_/g, " ");
}

function dateLabel(value: string) {
  return formatDate(value, { timeZone: "UTC" });
}

function dateTimeLabel(value: string) {
  return `${formatDate(value, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

export function connectionReceiptPayload(latestGoal: Goal | null): TelegramConnectionReceiptPayload {
  return {
    kind: "connection_receipt",
    latestGoal: latestGoal ? { label: safeTelegramLabel(goalLabel(latestGoal)), status: latestGoal.status } : null,
  };
}

export function councilNotificationPayload(decision: CouncilDecision, goal: Goal, candidate: ProtectionCandidate): Extract<TelegramNotificationPayload, { kind: "council_approved" | "council_disputed" | "council_blocked" }> {
  if (decision.status === "approved") return { kind: "council_approved", goalId: goal.id, goalLabel: safeTelegramLabel(goalLabel(goal)), protectedValueUsd: goal.protectedValueUsd, approvedReviewCount: 3, premiumUsd: candidate.premiumUsd, protectionEndsAt: candidate.expiry };
  if (decision.status === "disputed") return { kind: "council_disputed", goalId: goal.id, goalLabel: safeTelegramLabel(goalLabel(goal)), approvedReviewCount: decision.approvedReviewCount };
  return { kind: "council_blocked", goalId: goal.id, goalLabel: safeTelegramLabel(goalLabel(goal)) };
}

export function previewReadyNotificationPayload(trade: Trade, goal: Goal, candidate: ProtectionCandidate): TelegramPreviewReadyPayload {
  return { kind: "preview_ready", goalId: goal.id, goalLabel: safeTelegramLabel(goalLabel(goal)), premiumUsd: trade.premiumUsd, previewExpiresAt: trade.previewExpiresAt, coverageMode: candidate.coverageMode, goalCoverageBps: candidate.goalCoverageBps, settlementType: candidate.settlementType };
}

export function previewExpiringNotificationPayload(trade: Trade, goal: Goal): TelegramPreviewExpiringPayload {
  return { kind: "preview_expiring", goalId: goal.id, goalLabel: safeTelegramLabel(goalLabel(goal)), previewExpiresAt: trade.previewExpiresAt };
}

export function renderConnectionReceipt(payload: TelegramConnectionReceiptPayload) {
  const message = [
    "🛡 GoalGuard alerts connected",
    "",
    "This Telegram account will receive enabled updates for goals created in your linked GoalGuard browser.",
    "",
    "GoalGuard will never ask for your seed phrase, private key, or wallet signature here.",
    "Use /status to see the latest plan or /alerts to manage notifications.",
  ];
  if (payload.latestGoal) message.push("", `Latest goal: ${safeTelegramLabel(payload.latestGoal.label)} · ${statusLabel(payload.latestGoal.status)}.`);
  return message.join("\n");
}

export function renderStatus(goal: Goal | null) {
  if (!goal) return "No GoalGuard goals have been created in this browser yet. Open GoalGuard to create one.";
  return [
    "🛡 Latest GoalGuard plan",
    "",
    `Goal: ${safeTelegramLabel(goalLabel(goal))}`,
    `Deadline: ${dateLabel(goal.deadline)}`,
    `Status: ${statusLabel(goal.status)}`,
    "",
    "Open GoalGuard in the browser where you created the goal for the detailed audit record.",
  ].join("\n");
}

export function renderGoals(goals: Goal[]) {
  if (!goals.length) return "No GoalGuard goals have been created in this browser yet. Open GoalGuard to create one.";
  return [
    "🛡 Recent GoalGuard goals",
    "",
    ...goals.slice(0, 5).map((goal, index) => `${index + 1}. ${safeTelegramLabel(goalLabel(goal))} · ${dateLabel(goal.deadline)} · ${statusLabel(goal.status)}`),
  ].join("\n");
}

export function renderAlerts(preferences: Pick<TelegramNotificationPreferences, "councilResults" | "previewReady" | "previewExpiring" | "goalDeadlines" | "optionExpiry">) {
  const enabled = (value: boolean) => value ? "On" : "Off";
  return [
    "🛡 GoalGuard alert settings",
    "",
    `Council results: ${enabled(preferences.councilResults)}`,
    `Unsigned preview ready: ${enabled(preferences.previewReady)}`,
    `Preview expiry: ${enabled(preferences.previewExpiring)}`,
    `Goal deadlines: ${enabled(preferences.goalDeadlines)}`,
    `Selected-option expiry: ${enabled(preferences.optionExpiry)}`,
    "",
    "Commands:",
    "/alerts council on|off",
    "/alerts preview on|off",
    "/alerts preview-expiry on|off",
    "/alerts deadline on|off",
    "/alerts option-expiry on|off",
    "/stop — pause all optional alerts",
    "/unlink — disconnect this Telegram account",
  ].join("\n");
}

export const TELEGRAM_UNLINKED_TEXT = "GoalGuard Telegram alerts are disconnected. Return to the GoalGuard website to connect this private chat.";
export const TELEGRAM_STOPPED_TEXT = "All optional GoalGuard alerts are paused. Your Telegram account remains linked. Use /alerts to turn notifications back on.";
export const TELEGRAM_CONNECTED_REQUIRED_TEXT = "Connect Telegram alerts from the GoalGuard website before using this command.";
export const TELEGRAM_ALERTS_UPDATED_TEXT = "GoalGuard alert settings updated.";

export function renderCouncilApproved(payload: TelegramCouncilApprovedPayload) {
  return [
    "🛡 Council checks passed",
    "",
    `Goal: ${safeTelegramLabel(payload.goalLabel)}`,
    `Amount: ${formatUsd(payload.protectedValueUsd)}`,
    "Council: 3 of 3 approved",
    `Protection cost: ${formatUsd(payload.premiumUsd)}`,
    `Protection ends: ${dateTimeLabel(payload.protectionEndsAt)}`,
    "",
    "Review the plan in GoalGuard before generating an unsigned preview.",
    "No transaction has been signed or sent.",
  ].join("\n");
}

export function renderCouncilDisputed(payload: TelegramCouncilDisputedPayload) {
  return [
    "⚠️ Council review disputed",
    "",
    `Goal: ${safeTelegramLabel(payload.goalLabel)}`,
    `Approved checks: ${payload.approvedReviewCount} of 3`,
    "",
    "The plan cannot continue to an unsigned preview until the concerns are resolved.",
    "No transaction has been signed or sent.",
  ].join("\n");
}

export function renderCouncilBlocked(payload: TelegramCouncilBlockedPayload) {
  return [
    "⛔ Plan stopped safely",
    "",
    `Goal: ${safeTelegramLabel(payload.goalLabel)}`,
    "",
    "The council found a blocking concern, so GoalGuard will not generate an unsigned preview for this plan.",
    "No transaction has been signed or sent.",
  ].join("\n");
}

export function renderPreviewReady(payload: TelegramPreviewReadyPayload) {
  const message = [
    "✅ Protection Plan Ready (Demo)",
    "",
    `Goal: ${safeTelegramLabel(payload.goalLabel)}`,
    `Proposed cost: ${formatUsd(payload.premiumUsd)}`,
    `Preview expires: ${dateTimeLabel(payload.previewExpiresAt)}`,
    "",
    "Your unsigned transaction preview was generated.",
    "No wallet signature was requested. No funds moved, and no protected position was created.",
  ];
  if (payload.coverageMode === "proportional_demo") message.push("", `Coverage: ${formatPercentFromBps(payload.goalCoverageBps)} of the goal value. This demo does not fully cover the goal.`);
  if (payload.settlementType === "physical") message.push("", "Physical settlement: your covered ETH may be delivered/exchanged, and you would receive a USD-linked settlement asset instead — this is different from a cash payout.");
  return message.join("\n");
}

export function renderPreviewExpiring(payload: TelegramPreviewExpiringPayload) {
  return [
    "⏳ Unsigned preview expires soon",
    "",
    `The demo preview for ${safeTelegramLabel(payload.goalLabel)} expires in about 30 seconds. After it expires, return to GoalGuard and confirm a fresh unsigned preview.`,
    "",
    "No funds have moved and no protected position exists.",
  ].join("\n");
}

export function renderGoalDeadline(payload: TelegramGoalDeadlinePayload) {
  return [
    "📅 Goal deadline approaching",
    "",
    `Your ${safeTelegramLabel(payload.goalLabel)} deadline is in ${payload.leadDays === 7 ? "7 days" : "1 day"}: ${dateLabel(payload.deadline)}.`,
    "",
    "Check the current plan in GoalGuard. An unsigned preview is not an active protection position.",
  ].join("\n");
}

export function renderOptionExpiry(payload: TelegramOptionExpiryPayload) {
  return [
    "⏰ Demo-plan option expiry approaching",
    "",
    `The option selected for your ${safeTelegramLabel(payload.goalLabel)} demo plan expires within 24 hours: ${dateTimeLabel(payload.expiresAt)}.`,
    "",
    "This message does not mean an option was purchased or a protected position exists.",
  ].join("\n");
}

export function renderTelegramPayload(payload: TelegramNotificationPayload) {
  if (payload.kind === "connection_receipt") return renderConnectionReceipt(payload);
  if (payload.kind === "command_reply") return payload.text;
  if (payload.kind === "unlink_confirmation") return "GoalGuard Telegram alerts are disconnected.";
  if (payload.kind === "council_approved") return renderCouncilApproved(payload);
  if (payload.kind === "council_disputed") return renderCouncilDisputed(payload);
  if (payload.kind === "council_blocked") return renderCouncilBlocked(payload);
  if (payload.kind === "preview_ready") return renderPreviewReady(payload);
  if (payload.kind === "preview_expiring") return renderPreviewExpiring(payload);
  if (payload.kind === "goal_deadline") return renderGoalDeadline(payload);
  return renderOptionExpiry(payload);
}

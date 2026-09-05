import type {
  TelegramConnection,
  TelegramLinkToken,
  TelegramNotificationDelivery,
  TelegramNotificationPayload,
  TelegramNotificationPreferences,
  TelegramWebhookUpdate,
} from "./contracts";
import type { CouncilDecision, Goal, ProtectionCandidate, Trade } from "@/lib/contracts";

export type TelegramNotificationPreferenceValues = Pick<
  TelegramNotificationPreferences,
  "councilResults" | "previewReady" | "previewExpiring" | "goalDeadlines" | "optionExpiry"
>;

export interface TelegramDeliveryEnqueueInput {
  id: string;
  connectionId: string | null;
  telegramChatId: string;
  kind: TelegramNotificationDelivery["kind"];
  goalId?: string | null;
  candidateId?: string | null;
  decisionId?: string | null;
  tradeId?: string | null;
  dedupeKey: string;
  payload: TelegramNotificationPayload;
  nextAttemptAt: string;
  createdAt?: string;
}

export interface ConsumeTelegramLinkTokenInput {
  tokenHash: string;
  telegramUserId: string;
  telegramChatId: string;
  connectionId: string;
  now: string;
}

export interface ConsumedTelegramLink {
  connection: TelegramConnection;
  preferences: TelegramNotificationPreferences;
  transferredConnectionIds: string[];
}

export interface TelegramDeliveryClaimOptions {
  now?: string;
  limit?: number;
  leaseMs?: number;
}

export interface TelegramStartProcessingInput {
  update: TelegramWebhookUpdate;
  tokenHash: string | null;
  telegramUserId: string;
  telegramChatId: string;
  connectionId: string;
  successDelivery: TelegramDeliveryEnqueueInput;
  fallbackDelivery: TelegramDeliveryEnqueueInput;
  now: string;
}

export interface TelegramStartProcessingResult {
  duplicate: boolean;
  connection: TelegramConnection | null;
  preferences: TelegramNotificationPreferences | null;
  delivery: TelegramNotificationDelivery | null;
}

export interface TelegramCommandProcessingInput {
  update: TelegramWebhookUpdate;
  action: "reply" | "preferences" | "unlink";
  connectionId: string | null;
  preferenceValues?: TelegramNotificationPreferenceValues;
  delivery: TelegramDeliveryEnqueueInput;
  now: string;
}

export interface TelegramCommandProcessingResult {
  duplicate: boolean;
  connection: TelegramConnection | null;
  preferences: TelegramNotificationPreferences | null;
  delivery: TelegramNotificationDelivery | null;
}

export interface TelegramGoalReminderRecord {
  goal: Goal;
  candidate: ProtectionCandidate | null;
  decision: CouncilDecision | null;
  trade: Trade | null;
}

export interface TelegramReminderTarget {
  connection: TelegramConnection;
  preferences: TelegramNotificationPreferences;
  goals: TelegramGoalReminderRecord[];
}

export interface TelegramRepository {
  createTelegramLinkToken(token: TelegramLinkToken): Promise<TelegramLinkToken>;
  getTelegramLinkToken(tokenHash: string): Promise<TelegramLinkToken | null>;
  consumeTelegramLinkToken(input: ConsumeTelegramLinkTokenInput): Promise<ConsumedTelegramLink | null>;
  processTelegramStart(input: TelegramStartProcessingInput): Promise<TelegramStartProcessingResult>;

  getTelegramConnectionForOwner(ownerSessionHash: string): Promise<TelegramConnection | null>;
  getLatestGoalForOwner(ownerSessionHash: string): Promise<Goal | null>;
  listGoalsForOwner(ownerSessionHash: string, limit?: number): Promise<Goal[]>;
  listTelegramReminderTargets(limit?: number): Promise<TelegramReminderTarget[]>;
  getTelegramConnectionById(id: string): Promise<TelegramConnection | null>;
  getTelegramConnectionByChatId(telegramChatId: string): Promise<TelegramConnection | null>;
  getTelegramPreferences(connectionId: string): Promise<TelegramNotificationPreferences | null>;
  updateTelegramPreferences(connectionId: string, values: TelegramNotificationPreferenceValues, at?: string): Promise<TelegramNotificationPreferences>;
  processTelegramCommand(input: TelegramCommandProcessingInput): Promise<TelegramCommandProcessingResult>;
  revokeTelegramConnectionForOwner(ownerSessionHash: string, at?: string): Promise<TelegramConnection | null>;
  revokeTelegramConnection(id: string, at?: string): Promise<TelegramConnection | null>;
  blockTelegramConnection(id: string, at?: string): Promise<TelegramConnection | null>;
  touchTelegramConnection(id: string, at?: string): Promise<void>;

  recordTelegramWebhookUpdate(update: TelegramWebhookUpdate): Promise<boolean>;

  enqueueTelegramDelivery(input: TelegramDeliveryEnqueueInput): Promise<TelegramNotificationDelivery>;
  getTelegramDeliveryByDedupeKey(dedupeKey: string): Promise<TelegramNotificationDelivery | null>;
  listPendingTelegramReminders(connectionId: string, limit?: number): Promise<TelegramNotificationDelivery[]>;
  isTelegramDeliverySendable(delivery: TelegramNotificationDelivery, now?: string): Promise<boolean>;
  claimTelegramDeliveries(options?: TelegramDeliveryClaimOptions): Promise<TelegramNotificationDelivery[]>;
  markTelegramDeliverySent(id: string, telegramMessageId: string, at?: string): Promise<void>;
  rescheduleTelegramDelivery(id: string, nextAttemptAt: string, errorCode: string): Promise<void>;
  failTelegramDelivery(id: string, errorCode: string): Promise<void>;
  cancelTelegramDelivery(id: string): Promise<void>;
  cancelPendingTelegramDeliveries(connectionId: string): Promise<void>;
  cancelPendingTelegramPersonalizedDeliveries(connectionId: string): Promise<void>;
}

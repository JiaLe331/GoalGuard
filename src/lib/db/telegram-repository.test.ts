// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Goal } from "@/lib/contracts";
import type { TelegramConnection, TelegramLinkToken } from "@/lib/telegram/contracts";
import { PostgresGoalGuardRepository } from "./repository";
import type { GoalGuardDatabase } from "./client";
import { fixtureGoal } from "@/test/fixtures/goalguard";

let client: PGlite;
let repository: PostgresGoalGuardRepository;
const owner = "a".repeat(64);
const secondOwner = "b".repeat(64);
const now = "2026-09-05T08:00:00.000Z";
const future = "2026-09-05T08:02:00.000Z";

const connection = (id: string, ownerSessionHash: string, userId: string, linkedAt = now): TelegramConnection => ({
  id,
  ownerSessionHash,
  telegramUserId: userId,
  telegramChatId: userId,
  status: "connected",
  timezone: "UTC",
  linkedAt,
  lastInteractionAt: linkedAt,
  revokedAt: null,
  createdAt: linkedAt,
  updatedAt: linkedAt,
});

const linkToken = (id: string, ownerSessionHash: string, tokenHash: string, at = now): TelegramLinkToken => ({
  id,
  ownerSessionHash,
  tokenHash,
  timezone: "UTC",
  status: "pending",
  expiresAt: "2026-09-05T08:10:00.000Z",
  consumedAt: null,
  createdAt: at,
  updatedAt: at,
});

const commandDelivery = (id: string, connectionId: string, dedupeKey: string, nextAttemptAt = now) => ({
  id,
  connectionId,
  telegramChatId: "1001",
  kind: "command_reply" as const,
  dedupeKey,
  payload: { kind: "command_reply" as const, text: "GoalGuard help.", button: null },
  nextAttemptAt,
});

async function connect(token: TelegramLinkToken, nextConnection: TelegramConnection) {
  return repository.consumeTelegramLinkToken({ tokenHash: token.tokenHash, telegramUserId: nextConnection.telegramUserId, telegramChatId: nextConnection.telegramChatId, connectionId: nextConnection.id, now });
}

beforeEach(async () => {
  client = new PGlite();
  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: "./drizzle" });
  repository = new PostgresGoalGuardRepository(db as unknown as GoalGuardDatabase);
});

afterEach(async () => {
  await client.close();
});

describe("Telegram persistence", () => {
  it("consumes a link token once and keeps connections owner-scoped", async () => {
    const token = linkToken("10000000-0000-4000-8000-000000000001", owner, "1".repeat(64));
    const linked = connection("20000000-0000-4000-8000-000000000002", owner, "1001");
    await repository.createTelegramLinkToken(token);
    await expect(connect(token, linked)).resolves.toMatchObject({ connection: linked });
    await expect(connect(token, linked)).resolves.toBeNull();
    await expect(repository.getTelegramConnectionForOwner(owner)).resolves.toEqual(linked);
    await expect(repository.getTelegramConnectionForOwner(secondOwner)).resolves.toBeNull();
    await expect(repository.getTelegramPreferences(linked.id)).resolves.toMatchObject({ councilResults: true, previewReady: true, previewExpiring: false, goalDeadlines: true, optionExpiry: true });
    await expect(repository.getTelegramLinkToken(token.tokenHash)).resolves.toMatchObject({ status: "consumed", consumedAt: now });
  });

  it("revokes the previous owner/chat mapping on transfer and cancels personalized work", async () => {
    const goal = fixtureGoal as Goal;
    await repository.createGoal(goal, owner);
    const firstToken = linkToken("30000000-0000-4000-8000-000000000003", owner, "2".repeat(64));
    const firstConnection = connection("40000000-0000-4000-8000-000000000004", owner, "1001");
    await repository.createTelegramLinkToken(firstToken);
    await connect(firstToken, firstConnection);
    const delivery = await repository.enqueueTelegramDelivery({
      id: "50000000-0000-4000-8000-000000000005",
      connectionId: firstConnection.id,
      telegramChatId: firstConnection.telegramChatId,
      kind: "council_blocked",
      goalId: goal.id,
      dedupeKey: "council:decision-transfer",
      payload: { kind: "council_blocked", goalId: goal.id, goalLabel: "Rent" },
      nextAttemptAt: now,
    });
    expect(delivery.status).toBe("pending");

    const secondToken = linkToken("60000000-0000-4000-8000-000000000006", secondOwner, "3".repeat(64));
    const secondConnection = connection("70000000-0000-4000-8000-000000000007", secondOwner, "1001");
    await repository.createTelegramLinkToken(secondToken);
    await expect(connect(secondToken, secondConnection)).resolves.toMatchObject({ transferredConnectionIds: [firstConnection.id] });
    await expect(repository.getTelegramConnectionForOwner(owner)).resolves.toBeNull();
    await expect(repository.getTelegramConnectionForOwner(secondOwner)).resolves.toEqual(secondConnection);
    await expect(repository.getTelegramDeliveryByDedupeKey(delivery.dedupeKey)).resolves.toMatchObject({ status: "cancelled" });
  });

  it("updates all preferences as one explicit object", async () => {
    const token = linkToken("80000000-0000-4000-8000-000000000008", owner, "4".repeat(64));
    const linked = connection("90000000-0000-4000-8000-000000000009", owner, "1002");
    await repository.createTelegramLinkToken(token);
    await connect(token, linked);
    const paused = await repository.updateTelegramPreferences(linked.id, { councilResults: false, previewReady: false, previewExpiring: false, goalDeadlines: false, optionExpiry: false }, future);
    expect(paused).toMatchObject({ connectionId: linked.id, councilResults: false, previewReady: false, previewExpiring: false, goalDeadlines: false, optionExpiry: false, updatedAt: future });
  });

  it("deduplicates webhook updates and outbox rows", async () => {
    const update = { updateId: "1001", processedAt: now };
    await expect(repository.recordTelegramWebhookUpdate(update)).resolves.toBe(true);
    await expect(repository.recordTelegramWebhookUpdate(update)).resolves.toBe(false);

    const token = linkToken("a0000000-0000-4000-8000-00000000000a", owner, "5".repeat(64));
    const linked = connection("b0000000-0000-4000-8000-00000000000b", owner, "1001");
    await repository.createTelegramLinkToken(token);
    await connect(token, linked);
    const first = await repository.enqueueTelegramDelivery(commandDelivery("c0000000-0000-4000-8000-00000000000c", linked.id, "command:update-1"));
    const replay = await repository.enqueueTelegramDelivery(commandDelivery("d0000000-0000-4000-8000-00000000000d", linked.id, "command:update-1"));
    expect(replay.id).toBe(first.id);
    const rows = await repository.claimTelegramDeliveries({ now, limit: 20, leaseMs: 30_000 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: first.id, status: "processing", attemptCount: 1, leaseUntil: "2026-09-05T08:00:30.000Z" });
    await expect(repository.claimTelegramDeliveries({ now, limit: 20, leaseMs: 30_000 })).resolves.toHaveLength(0);
    const recovered = await repository.claimTelegramDeliveries({ now: future, limit: 20, leaseMs: 30_000 });
    expect(recovered[0]).toMatchObject({ id: first.id, status: "processing", attemptCount: 2 });
    await repository.markTelegramDeliverySent(first.id, "42", future);
    await expect(repository.getTelegramDeliveryByDedupeKey("command:update-1")).resolves.toMatchObject({ status: "sent", telegramMessageId: "42", sentAt: future });
  });

  it("consumes a deep link and records its receipt atomically", async () => {
    const token = linkToken("14000000-0000-4000-8000-000000000014", owner, "8".repeat(64));
    const connectionId = "15000000-0000-4000-8000-000000000015";
    await repository.createTelegramLinkToken(token);
    const successDelivery = {
      id: "16000000-0000-4000-8000-000000000016",
      connectionId,
      telegramChatId: "1005",
      kind: "connection_receipt" as const,
      dedupeKey: `connection:${connectionId}`,
      payload: { kind: "connection_receipt" as const, latestGoal: null },
      nextAttemptAt: now,
    };
    const fallbackDelivery = {
      id: "17000000-0000-4000-8000-000000000017",
      connectionId: null,
      telegramChatId: "1005",
      kind: "command_reply" as const,
      dedupeKey: "command:link-1",
      payload: { kind: "command_reply" as const, text: "GoalGuard help.", button: null },
      nextAttemptAt: now,
    };
    const input = {
      update: { updateId: "2001", processedAt: now },
      tokenHash: token.tokenHash,
      telegramUserId: "1005",
      telegramChatId: "1005",
      connectionId,
      successDelivery,
      fallbackDelivery,
      now,
    };
    const first = await repository.processTelegramStart(input);
    expect(first).toMatchObject({ duplicate: false, connection: { id: connectionId, ownerSessionHash: owner, telegramUserId: "1005" }, delivery: { kind: "connection_receipt", status: "pending" } });
    await expect(repository.getTelegramLinkToken(token.tokenHash)).resolves.toMatchObject({ status: "consumed", consumedAt: now });
    await expect(repository.processTelegramStart(input)).resolves.toMatchObject({ duplicate: true, connection: null, delivery: null });
    await expect(repository.getTelegramDeliveryByDedupeKey(`connection:${connectionId}`)).resolves.toMatchObject({ status: "pending" });
  });

  it("updates preferences and unlinks with the command reply in one transaction", async () => {
    const token = linkToken("18000000-0000-4000-8000-000000000018", owner, "9".repeat(64));
    const linked = connection("19000000-0000-4000-8000-000000000019", owner, "1006");
    await repository.createTelegramLinkToken(token);
    await connect(token, linked);
    const preferenceResult = await repository.processTelegramCommand({
      update: { updateId: "3001", processedAt: now },
      action: "preferences",
      connectionId: linked.id,
      preferenceValues: { councilResults: false, previewReady: true, previewExpiring: false, goalDeadlines: true, optionExpiry: true },
      delivery: { id: "1a000000-0000-4000-8000-00000000001a", connectionId: linked.id, telegramChatId: linked.telegramChatId, kind: "command_reply", dedupeKey: "command:3001", payload: { kind: "command_reply", text: "GoalGuard alert settings updated.", button: null }, nextAttemptAt: now },
      now,
    });
    expect(preferenceResult).toMatchObject({ duplicate: false, preferences: { councilResults: false }, delivery: { kind: "command_reply" } });

    const unlinkResult = await repository.processTelegramCommand({
      update: { updateId: "3002", processedAt: future },
      action: "unlink",
      connectionId: linked.id,
      delivery: { id: "1b000000-0000-4000-8000-00000000001b", connectionId: linked.id, telegramChatId: linked.telegramChatId, kind: "unlink_confirmation", dedupeKey: "command:3002", payload: { kind: "unlink_confirmation" }, nextAttemptAt: future },
      now: future,
    });
    expect(unlinkResult).toMatchObject({ duplicate: false, connection: { id: linked.id, status: "revoked" }, delivery: { kind: "unlink_confirmation", status: "pending" } });
    await expect(repository.getTelegramConnectionByChatId(linked.telegramChatId)).resolves.toBeNull();
    await expect(repository.getTelegramDeliveryByDedupeKey("command:3002")).resolves.toMatchObject({ connectionId: linked.id, kind: "unlink_confirmation", status: "pending" });
  });

  it("cancels only unsent personalized deliveries when asked", async () => {
    const token = linkToken("e0000000-0000-4000-8000-00000000000e", owner, "6".repeat(64));
    const linked = connection("f0000000-0000-4000-8000-00000000000f", owner, "1003");
    await repository.createTelegramLinkToken(token);
    await connect(token, linked);
    await repository.enqueueTelegramDelivery(commandDelivery("11000000-0000-4000-8000-000000000011", linked.id, "command:keep"));
    await repository.cancelPendingTelegramPersonalizedDeliveries(linked.id);
    await expect(repository.getTelegramDeliveryByDedupeKey("command:keep")).resolves.toMatchObject({ status: "pending" });
  });

  it("expires an unused token without revealing whether it was valid", async () => {
    const token = { ...linkToken("12000000-0000-4000-8000-000000000012", owner, "7".repeat(64)), expiresAt: "2026-09-05T07:59:00.000Z" };
    const linked = connection("13000000-0000-4000-8000-000000000013", owner, "1004");
    await repository.createTelegramLinkToken(token);
    await expect(connect(token, linked)).resolves.toBeNull();
    await expect(repository.getTelegramLinkToken(token.tokenHash)).resolves.toMatchObject({ status: "expired" });
  });
});

import { describe, expect, it } from "vitest";

import { TelegramUpdateSchema } from "./contracts";
import { parseTelegramCommand, privateTelegramCommand } from "./commands";

describe("Telegram command parsing", () => {
  it("accepts case-insensitive bot commands but preserves token data", () => {
    expect(parseTelegramCommand("  /START@GoalGuardBot  AbC_-123  ", "GoalGuardBot")).toEqual({ kind: "start", token: "AbC_-123", malformed: false });
  });

  it("ignores commands addressed to another bot", () => {
    expect(parseTelegramCommand("/start@SomeoneElseBot token", "GoalGuardBot")).toEqual({ kind: "ignore" });
  });

  it("distinguishes website start, malformed links, and free-form text", () => {
    expect(parseTelegramCommand("/start", "GoalGuardBot")).toEqual({ kind: "start", token: null, malformed: false });
    expect(parseTelegramCommand("/start one two", "GoalGuardBot")).toEqual({ kind: "start", token: null, malformed: true });
    expect(parseTelegramCommand("hello GoalGuard", "GoalGuardBot")).toEqual({ kind: "unknown" });
    expect(parseTelegramCommand("/help", "GoalGuardBot")).toEqual({ kind: "help", args: [] });
    expect(parseTelegramCommand("/alerts preview-expiry off", "GoalGuardBot")).toEqual({ kind: "alerts", args: ["preview-expiry", "off"] });
  });

  it("only extracts text commands from private chats", () => {
    const privateUpdate = TelegramUpdateSchema.parse({
      update_id: 7,
      message: { message_id: 8, from: { id: 9 }, chat: { id: 9, type: "private" }, text: "/help" },
    });
    expect(privateTelegramCommand(privateUpdate)).toMatchObject({ updateId: "7", telegramUserId: "9", telegramChatId: "9", text: "/help" });

    const groupUpdate = TelegramUpdateSchema.parse({
      update_id: 10,
      message: { message_id: 11, from: { id: 12 }, chat: { id: -12, type: "group" }, text: "/start token" },
    });
    expect(privateTelegramCommand(groupUpdate)).toBeNull();
  });
});

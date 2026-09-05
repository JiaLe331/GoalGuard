import {
  TelegramPrivateCommandSchema,
  TelegramUpdateSchema,
  type TelegramPrivateCommand,
  type TelegramUpdate,
} from "./contracts";

export type ParsedTelegramCommand =
  | { kind: "start"; token: string | null; malformed: boolean }
  | { kind: "help" | "status" | "goals" | "alerts" | "stop" | "unlink"; args: string[] }
  | { kind: "unknown" }
  | { kind: "ignore" };

export function privateTelegramCommand(update: TelegramUpdate): TelegramPrivateCommand | null {
  const value = TelegramUpdateSchema.parse(update);
  const message = value.message;
  if (!message || !message.text || message.chat.type !== "private" || !message.from) return null;
  const command = TelegramPrivateCommandSchema.safeParse({
    updateId: value.update_id,
    telegramUserId: message.from.id,
    telegramChatId: message.chat.id,
    text: message.text,
  });
  return command.success ? command.data : null;
}

export function parseTelegramCommand(text: string, botUsername: string): ParsedTelegramCommand {
  const parts = text.trim().split(/\s+/);
  const head = parts.shift();
  if (!head) return { kind: "unknown" };
  const match = /^\/([A-Za-z0-9_]+)(?:@([A-Za-z0-9_]+))?$/.exec(head);
  if (!match) return { kind: "unknown" };
  const suffix = match[2];
  if (suffix && suffix.toLowerCase() !== botUsername.toLowerCase()) return { kind: "ignore" };
  const command = match[1]!.toLowerCase();
  if (command === "start") {
    if (parts.length === 0) return { kind: "start", token: null, malformed: false };
    if (parts.length === 1) return { kind: "start", token: parts[0]!, malformed: false };
    return { kind: "start", token: null, malformed: true };
  }
  if (["help", "status", "goals", "alerts", "stop", "unlink"].includes(command)) return { kind: command as "help" | "status" | "goals" | "alerts" | "stop" | "unlink", args: parts };
  return { kind: "unknown" };
}

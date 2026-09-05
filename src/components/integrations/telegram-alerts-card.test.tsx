import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TelegramPublicConnectionStatus } from "@/lib/contracts";
import { goalGuardApi } from "@/lib/frontend/api-client";
import { TelegramAlertsCard } from "./telegram-alerts-card";

const meta = { requestId: "00000000-0000-4000-8000-000000000001", timestamp: "2026-09-05T10:00:00.000Z" };
const deepLink = `https://t.me/goalguard_bot?start=${"A".repeat(43)}`;

function response<T extends TelegramPublicConnectionStatus>(data: T) {
  return { data, meta };
}

const disconnected = response({ status: "disconnected" });
const unavailable = response({ status: "unavailable" });
const connected = response({
  status: "connected",
  linkedAt: "2026-09-05T09:00:00.000Z",
  preferences: { councilResults: true, previewReady: true, previewExpiring: false, goalDeadlines: true, optionExpiry: true },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TelegramAlertsCard", () => {
  it("prepares a deep link while disconnected and enters the pending state after the user opens it", async () => {
    const getConnection = vi.spyOn(goalGuardApi, "getTelegramConnection").mockResolvedValue(disconnected);
    const createLink = vi.spyOn(goalGuardApi, "createTelegramLink").mockResolvedValue({
      data: { deepLink, expiresAt: "2099-09-05T10:10:00.000Z" },
      meta,
    });

    render(<TelegramAlertsCard />);

    const link = await screen.findByRole("link", { name: /Get Telegram updates/ });
    expect(getConnection).toHaveBeenCalled();
    expect(createLink).toHaveBeenCalledWith({ timezone: expect.any(String) }, expect.any(AbortSignal));
    expect(link).toHaveAttribute("href", deepLink);
    expect(link).toHaveAttribute("target", "_blank");

    await userEvent.click(link);

    expect(screen.getByText("Finish by pressing Start in Telegram.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Telegram again/ })).toHaveAttribute("href", deepLink);
  });

  it("shows a quiet unavailable state without attempting to create a link", async () => {
    const createLink = vi.spyOn(goalGuardApi, "createTelegramLink");
    vi.spyOn(goalGuardApi, "getTelegramConnection").mockResolvedValue(unavailable);

    render(<TelegramAlertsCard />);

    expect(await screen.findByText("Telegram alerts are not available right now. Your GoalGuard workflow is unaffected.")).toBeInTheDocument();
    expect(createLink).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Telegram updates/ })).not.toBeInTheDocument();
  });

  it("updates preferences and confirms disconnect without exposing Telegram identifiers", async () => {
    vi.spyOn(goalGuardApi, "getTelegramConnection").mockResolvedValue(connected);
    const updatePreferences = vi.spyOn(goalGuardApi, "updateTelegramPreferences").mockResolvedValue(response({
      status: "connected",
      linkedAt: connected.data.linkedAt,
      preferences: { ...connected.data.preferences, councilResults: false },
    }));
    const disconnect = vi.spyOn(goalGuardApi, "disconnectTelegram").mockResolvedValue(response({ status: "disconnected" }));

    render(<TelegramAlertsCard />);
    const councilToggle = await screen.findByLabelText(/Council results/);
    await userEvent.click(councilToggle);

    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ ...connected.data.preferences, councilResults: false }));
    expect(screen.queryByText(/chat|user id|owner hash/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Disconnect Telegram" }));
    expect(screen.getByRole("alertdialog", { name: "Disconnect Telegram alerts?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(disconnect).toHaveBeenCalled());
  });
});

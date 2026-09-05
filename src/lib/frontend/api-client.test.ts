import { afterEach, describe, expect, it, vi } from "vitest";

import { GetGoalResponseSchema } from "@/lib/contracts";
import { fixtureIds, getDraftGoalResponse, previewTradeResponse } from "@/test/fixtures/goalguard";
import { goalGuardApi, requestGoalGuard } from "./api-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GoalGuard API client", () => {
  it("validates successful responses and sends same-origin credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(getDraftGoalResponse), { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(requestGoalGuard("/api/goals/id", { schema: GetGoalResponseSchema })).resolves.toEqual(getDraftGoalResponse);
    expect(fetchMock).toHaveBeenCalledWith("/api/goals/id", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("rejects malformed success data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { unsafe: true } }), { status: 200 }));
    await expect(requestGoalGuard("/api/goals/id", { schema: GetGoalResponseSchema })).rejects.toMatchObject({ code: "UPSTREAM_INVALID_RESPONSE" });
  });

  it("preserves canonical error metadata", async () => {
    const details = { checks: ["strategist unavailable"] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "GONKA_UNAVAILABLE", message: "Review unavailable", retryable: true, fieldErrors: {}, details }, meta: getDraftGoalResponse.meta }), { status: 502 }));
    await expect(requestGoalGuard("/api/goals/id", { schema: GetGoalResponseSchema })).rejects.toEqual(expect.objectContaining({ code: "GONKA_UNAVAILABLE", requestId: getDraftGoalResponse.meta.requestId, details }));
  });

  it("sends the caller's idempotency key for trade preview", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(previewTradeResponse), { status: 201, headers: { "Content-Type": "application/json" } }));
    await goalGuardApi.previewTrade({ goalId: fixtureIds.goal, candidateId: fixtureIds.candidate, councilDecisionId: fixtureIds.decision, walletAddress: "0x1111111111111111111111111111111111111111" }, "preview-request-0000000000000001");
    expect(fetchMock).toHaveBeenCalledWith("/api/trades/preview", expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "preview-request-0000000000000001" }) }));
  });

  it("parses Telegram connection responses and uses the typed mutation methods", async () => {
    const connected = {
      data: {
        status: "connected" as const,
        linkedAt: "2026-09-05T10:00:00.000Z",
        preferences: { councilResults: true, previewReady: true, previewExpiring: false, goalDeadlines: true, optionExpiry: true },
      },
      meta: getDraftGoalResponse.meta,
    };
    const link = {
      data: { deepLink: `https://t.me/goalguard_bot?start=${"A".repeat(43)}`, expiresAt: "2026-09-05T10:10:00.000Z" },
      meta: getDraftGoalResponse.meta,
    };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(connected), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(link), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(connected), { status: 200 }));

    await expect(goalGuardApi.getTelegramConnection()).resolves.toEqual(connected);
    await expect(goalGuardApi.createTelegramLink({ timezone: "Asia/Kuala_Lumpur" })).resolves.toEqual(link);
    await expect(goalGuardApi.updateTelegramPreferences(connected.data.preferences)).resolves.toEqual(connected);

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/integrations/telegram/link", expect.objectContaining({ method: "POST", body: JSON.stringify({ timezone: "Asia/Kuala_Lumpur" }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/integrations/telegram/preferences", expect.objectContaining({ method: "PATCH", body: JSON.stringify(connected.data.preferences) }));
  });
});

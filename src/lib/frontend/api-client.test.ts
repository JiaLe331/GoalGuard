import { describe, expect, it, vi } from "vitest";

import { GetGoalResponseSchema } from "@/lib/contracts";
import { getDraftGoalResponse } from "@/test/fixtures/goalguard";
import { requestGoalGuard } from "./api-client";

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
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "GONKA_UNAVAILABLE", message: "Review unavailable", retryable: true, fieldErrors: {}, details: null }, meta: getDraftGoalResponse.meta }), { status: 502 }));
    await expect(requestGoalGuard("/api/goals/id", { schema: GetGoalResponseSchema })).rejects.toEqual(expect.objectContaining({ code: "GONKA_UNAVAILABLE", requestId: getDraftGoalResponse.meta.requestId }));
  });
});

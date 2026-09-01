// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({ responses: [] as Array<{ content: string | null; requestId?: string; model?: string }> }));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: () => ({ withResponse: async () => {
      const next = mocks.responses.shift();
      if (!next) throw new Error("Missing mocked Gonka response.");
      return { response: { headers: new Headers(next.requestId ? { "x-request-id": next.requestId } : {}) }, data: { model: next.model ?? "gonka-model-a", choices: [{ message: { content: next.content } }] } };
    } }) } };
  },
}));

import { callGonkaJson, GonkaCallError } from "./client";

const schema = z.object({ value: z.string() }).strict();
const request = { apiKey: "test-key", baseUrl: "https://gonka.example", model: "gonka-model-a", requestIdHeader: "x-request-id", system: "Return JSON.", input: { safe: true }, schema };

describe("Gonka structured client", () => {
  beforeEach(() => { mocks.responses.length = 0; });

  it("requires and returns the upstream request ID", async () => {
    mocks.responses.push({ content: JSON.stringify({ value: "ready" }), requestId: "gonka-1" });
    await expect(callGonkaJson(request)).resolves.toMatchObject({ data: { value: "ready" }, requestId: "gonka-1", model: "gonka-model-a" });
  });

  it("repairs malformed structured output only once", async () => {
    mocks.responses.push({ content: "not-json", requestId: "gonka-2" }, { content: JSON.stringify({ value: "repaired" }), requestId: "gonka-3" });
    await expect(callGonkaJson(request)).resolves.toMatchObject({ data: { value: "repaired" }, requestId: "gonka-3" });
    expect(mocks.responses).toHaveLength(0);
  });

  it("fails closed when the request ID is absent", async () => {
    mocks.responses.push({ content: JSON.stringify({ value: "unsafe" }) });
    await expect(callGonkaJson(request)).rejects.toBeInstanceOf(GonkaCallError);
  });

  it("fails after a second malformed response", async () => {
    mocks.responses.push({ content: "{}", requestId: "gonka-4" }, { content: "{}", requestId: "gonka-5" });
    await expect(callGonkaJson(request)).rejects.toThrow("invalid structured output after one repair attempt");
  });
});

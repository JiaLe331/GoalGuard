import { describe, expect, it } from "vitest";
import { getGonkaCouncilConfiguration, getThetanutsConfiguration, readServerEnvironment } from "./env";

const base = { GONKA_API_KEY: "key", GONKA_BASE_URL: "https://gonka.example", GONKA_STRATEGIST_MODEL: "model-a", GONKA_RISK_AUDITOR_MODEL: "model-b", GONKA_CONSUMER_ADVOCATE_MODEL: "model-a" };
const env = (value: Record<string, string> = {}): NodeJS.ProcessEnv => ({ NODE_ENV: "test", ...value });

describe("P0 environment safety", () => {
  it("uses the 168-hour expiry-gap default", () => { expect(readServerEnvironment(env()).MAX_DEADLINE_GAP_HOURS).toBe(168); });
  it("requires at least two distinct council models", () => { expect(getGonkaCouncilConfiguration(env(base))?.models.risk_auditor).toBe("model-b"); expect(getGonkaCouncilConfiguration(env({ ...base, GONKA_RISK_AUDITOR_MODEL: "model-a" }))).toBeNull(); });
  it("rejects the former SQLite URL at the environment boundary", () => { expect(() => readServerEnvironment(env({ DATABASE_URL: "file:./data/goalguard.db" }))).toThrow(); });
  it("requires validated primary and fallback Base RPC URLs", () => {
    expect(getThetanutsConfiguration(env({ THETANUTS_RPC_URL: "https://alchemy.example/key", THETANUTS_RPC_FALLBACK_URL: "https://infura.example/key" }))).toMatchObject({ chainId: 8453, fallbackRpcUrl: "https://infura.example/key" });
    expect(getThetanutsConfiguration(env({ THETANUTS_RPC_URL: "https://alchemy.example/key" }))).toBeNull();
    expect(() => readServerEnvironment(env({ THETANUTS_RPC_URL: "https://alchemy.example/key", THETANUTS_RPC_FALLBACK_URL: "not-a-url" }))).toThrow();
  });
  it("treats blank optional environment placeholders as absent", () => {
    expect(getThetanutsConfiguration(env({ GONKA_API_KEY: "", GONKA_BASE_URL: "", THETANUTS_RPC_URL: "https://alchemy.example/key", THETANUTS_RPC_FALLBACK_URL: "https://infura.example/key", THETANUTS_REFERRER_ADDRESS: "" }))).toMatchObject({ chainId: 8453 });
  });
});

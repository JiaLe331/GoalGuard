import { describe, expect, it } from "vitest";
import { getGonkaConfiguration, getGonkaCouncilConfiguration, getThetanutsConfiguration, readServerEnvironment } from "./env";

const base = { GONKA_API_KEY: "key", GONKA_BASE_URL: "https://gonka.example", GONKA_STRATEGIST_MODEL: "model-a", GONKA_RISK_AUDITOR_MODEL: "model-b", GONKA_CONSUMER_ADVOCATE_MODEL: "model-a" };
const env = (value: Record<string, string> = {}): NodeJS.ProcessEnv => ({ NODE_ENV: "test", ...value });

describe("P0 environment safety", () => {
  it("uses the 168-hour expiry-gap default", () => { expect(readServerEnvironment(env()).MAX_DEADLINE_GAP_HOURS).toBe(168); });
  it("treats blank optional integration placeholders as unconfigured", () => {
    const placeholders = env({ GONKA_API_KEY: "", GONKA_BASE_URL: "  ", GONKA_STRATEGIST_MODEL: "", GONKA_RISK_AUDITOR_MODEL: "", GONKA_CONSUMER_ADVOCATE_MODEL: "", THETANUTS_RPC_URL: "", THETANUTS_REFERRER_ADDRESS: "" });
    expect(readServerEnvironment(placeholders)).toMatchObject({ GONKA_API_KEY: undefined, GONKA_BASE_URL: undefined, THETANUTS_RPC_URL: undefined, THETANUTS_REFERRER_ADDRESS: undefined });
    expect(getGonkaConfiguration(placeholders)).toBeNull();
    expect(getGonkaCouncilConfiguration(placeholders)).toBeNull();
    expect(getThetanutsConfiguration(placeholders)).toBeNull();
  });
  it("requires at least two distinct council models", () => { expect(getGonkaCouncilConfiguration(env(base))?.models.risk_auditor).toBe("model-b"); expect(getGonkaCouncilConfiguration(env({ ...base, GONKA_RISK_AUDITOR_MODEL: "model-a" }))).toBeNull(); });
  it("rejects the former SQLite URL at the environment boundary", () => { expect(() => readServerEnvironment(env({ DATABASE_URL: "file:./data/goalguard.db" }))).toThrow(); });
});

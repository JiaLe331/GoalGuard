import { expect, test } from "@playwright/test";

/**
 * The presentation flow: a compressed replay of one recorded run, used for live demos.
 *
 * These tests only run while the build is armed. Once NEXT_PUBLIC_PRESENTATION_FLOW is removed
 * after the demo, they skip rather than fail -- the path is meant to be deleted.
 */
for (const file of [".env", ".env.local"]) {
  try { process.loadEnvFile(file); } catch { /* Not every environment ships this file. */ }
}
const armed = process.env.NEXT_PUBLIC_PRESENTATION_FLOW === "true";

const CAPTURED_GOAL = "Protect $100 of my ETH emergency fund. I need it available by September 10, 2026. I can accept up to 30% loss";

test.describe("presentation flow", () => {
  test.skip(!armed, "NEXT_PUBLIC_PRESENTATION_FLOW is not set, so the path is inert.");

  test("leaves the live flow untouched when a tab has not opted in", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/")) apiCalls.push(path);
    });

    await page.goto("/dashboard");
    await page.getByRole("heading", { name: "Cost of safety" }).first().waitFor();
    await page.waitForTimeout(1_000);

    // Arming the build must not be enough: without ?flow=fast the page still talks to the API.
    expect(apiCalls).toContain("/api/market/summary");
  });

  test("serves the whole run without touching the network", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/")) apiCalls.push(path);
    });

    await page.goto("/dashboard?flow=fast");
    await page.getByRole("heading", { name: "Cost of safety" }).first().waitFor();
    await page.waitForTimeout(1_000);

    expect(apiCalls).toEqual([]);
  });

  test("runs goal to unsigned preview inside the demo's time budget", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/goals/new?flow=fast");
    await page.evaluate(() => localStorage.clear());

    const startedAt = Date.now();

    await page.getByRole("textbox", { name: /describe your protection goal/i }).fill(CAPTURED_GOAL);
    await page.getByRole("button", { name: /create protection goal/i }).click();
    await page.waitForURL(/\/goals\/[0-9a-f-]{36}/);

    // The opt-in has to survive the navigation, or the workspace would fall back to the live API.
    expect(page.url()).toContain("flow=fast");

    await page.locator("#workspace-tab-plan").click();
    await page.getByRole("button", { name: /find live protection/i }).click();

    // Every role is revealed in turn rather than appearing at once.
    await expect(page.getByRole("heading", { name: "Strategist" })).toBeVisible();
    await page.getByRole("heading", { name: /a protection plan for/i }).waitFor({ timeout: 30_000 });

    await page.locator("#workspace-tab-scenarios").click();
    await expect(page.getByRole("heading", { name: /what the protection changes/i })).toBeVisible();

    await page.locator("#workspace-tab-plan").click();
    await page.getByRole("button", { name: /connect wallet to continue/i }).click();
    await page.getByRole("button", { name: /continue to unsigned preview/i }).click();

    const acknowledgements = page.getByRole("checkbox");
    for (let index = 0; index < await acknowledgements.count(); index += 1) {
      await acknowledgements.nth(index).check();
    }
    await page.getByRole("button", { name: /generate/i }).first().click();
    await page.getByRole("heading", { name: /protection plan ready/i }).first().waitFor({ timeout: 20_000 });

    expect(Date.now() - startedAt).toBeLessThan(45_000);
  });

  test("shows the recorded verdicts and request IDs, and never says the run is staged", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/goals/new?flow=fast");
    await page.evaluate(() => localStorage.clear());

    await page.getByRole("textbox", { name: /describe your protection goal/i }).fill(CAPTURED_GOAL);
    await page.getByRole("button", { name: /create protection goal/i }).click();
    await page.waitForURL(/\/goals\/[0-9a-f-]{36}/);
    await page.locator("#workspace-tab-plan").click();
    await page.getByRole("button", { name: /find live protection/i }).click();
    await page.getByRole("heading", { name: /a protection plan for/i }).waitFor({ timeout: 30_000 });

    await page.locator("#workspace-tab-audit").click();
    await page.getByRole("heading", { name: /why this plan has this status/i }).waitFor();
    const audit = await page.evaluate(() => document.body.innerText);

    // The recorded Gonka request IDs, not invented ones.
    expect(audit).toContain("req-1788610965133873647-1153802");
    expect(audit).toContain("req-1788610965340442554-1153803");
    expect(audit).toContain("req-1788611006003883740-1153924");
    expect(audit).toContain("MiniMaxAI/MiniMax-M2.7");
    expect(audit).toContain("deepseek-ai/DeepSeek-V4-Flash-0731");
    // Two approvals and a retained dissent, scored by the current ruleset.
    expect(audit).toMatch(/2 of 3/);

    for (const word of ["demo", "replay", "mock", "simulat", "fixture", "fake"]) {
      expect(audit.toLowerCase()).not.toContain(word);
    }
  });
});

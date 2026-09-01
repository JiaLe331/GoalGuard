import { expect, test, type Route } from "@playwright/test";

import {
  fixtureMeta,
  generateCandidatesResponse,
  getDraftGoalResponse,
  parseGoalResponse,
  previewTradeResponse,
  reviewCandidateResponse,
  updateGoalResponse,
} from "../src/test/fixtures/goalguard";
import { expectNoSeriousAccessibilityViolations } from "./accessibility";

const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

test("completes the contract-wired frontend through a preview-only trade", async ({ page }) => {
  await page.addInitScript(() => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    Object.defineProperty(window, "ethereum", {
      value: {
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
          if (method === "eth_chainId") return "0x2105";
          return null;
        },
        on: (event: string, listener: (...args: unknown[]) => void) => listeners.set(event, [...(listeners.get(event) ?? []), listener]),
        removeListener: () => undefined,
      },
      configurable: true,
    });
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/integrations/status") return json(route, { data: { database: { status: "ready" }, gonka: { status: "ready", model: "gonka-model-a", requestId: "gonka-ready" }, thetanuts: { status: "ready", chainId: 8453, activeEthPutCount: 3, marketAsOf: fixtureMeta.timestamp } }, meta: fixtureMeta });
    if (path === "/api/goals/parse") return json(route, parseGoalResponse);
    if (path.endsWith(parseGoalResponse.data.goal!.id) && request.method() === "GET") return json(route, getDraftGoalResponse);
    if (path.endsWith(parseGoalResponse.data.goal!.id) && request.method() === "PATCH") return json(route, updateGoalResponse);
    if (path === "/api/protection/candidates") return json(route, generateCandidatesResponse);
    if (path === "/api/council/review") return json(route, reviewCandidateResponse);
    if (path === "/api/trades/preview") return json(route, previewTradeResponse);
    return json(route, { error: { code: "NOT_FOUND", message: "Fixture route missing", retryable: false, fieldErrors: {}, details: null }, meta: fixtureMeta }, 404);
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: /describe your protection goal/i }).fill("Protect my $1,200 rent fund by 30 September and limit loss to 5%.");
  const parseCompleted = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/goals/parse");
  await page.getByRole("button", { name: /create protection goal/i }).click();
  expect((await parseCompleted).ok()).toBe(true);
  await expect(page.locator("#goal-input-error")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/goals/${parseGoalResponse.data.goal!.id}$`));
  await expect(page.getByRole("heading", { name: /make sure goalguard understood you/i })).toBeVisible();

  await page.getByRole("button", { name: /find protection options/i }).click();
  await expect(page.getByRole("heading", { name: /rent protection/i })).toBeVisible();
  await expect(page.getByText("3/3 council checks passed")).toBeVisible();

  await page.getByRole("button", { name: /preview exact trade/i }).click();
  await expect(page.getByLabel(/wallet connected/i)).toBeVisible();
  await page.getByRole("button", { name: /preview exact trade/i }).click();
  await expect(page.getByRole("heading", { name: /review before your wallet opens/i })).toBeVisible();
  await expect(page.getByText("Preview only", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /prepare wallet transaction/i })).toHaveCount(0);
  await expectNoSeriousAccessibilityViolations(page);
});

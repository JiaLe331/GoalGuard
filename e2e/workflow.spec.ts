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
  let previewRequests = 0;
  await page.addInitScript(() => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    Object.defineProperty(window, "__goalguardWalletMethods", { value: [], configurable: true });
    Object.defineProperty(window, "ethereum", {
      value: {
        request: async ({ method }: { method: string }) => {
          (window as unknown as { __goalguardWalletMethods: string[] }).__goalguardWalletMethods.push(method);
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
    if (path === "/api/trades/preview") { previewRequests += 1; return json(route, previewTradeResponse); }
    return json(route, { error: { code: "NOT_FOUND", message: "Fixture route missing", retryable: false, fieldErrors: {}, details: null }, meta: fixtureMeta }, 404);
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: /describe your protection goal/i }).fill("Protect my $1,200 rent fund by 30 September and limit loss to 5%.");
  const parseCompleted = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/goals/parse");
  await page.getByRole("button", { name: /create protection goal/i }).click();
  expect((await parseCompleted).ok()).toBe(true);
  await expect(page.locator("#goal-input-error")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/goals/${parseGoalResponse.data.goal!.id}$`));
  await expect(page.getByRole("heading", { name: /make the goal exact/i })).toBeVisible();

  await page.getByRole("button", { name: /find live protection/i }).click();
  await expect(page.getByRole("heading", { name: /a protection plan for rent/i })).toBeVisible();
  await expect(page.getByText("3 of 3 checks passed")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  const councilTrigger = page.getByRole("button", { name: /open council review/i });
  await councilTrigger.click();
  await expect(page.getByRole("dialog", { name: /goalguard council review/i })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.keyboard.press("Escape");
  await expect(councilTrigger).toBeFocused();

  await page.getByRole("button", { name: /connect wallet to continue/i }).click();
  await expect(page.getByLabel(/wallet connected/i)).toBeVisible();
  await page.getByRole("button", { name: /continue to unsigned preview/i }).click();
  await expect(page.getByRole("heading", { name: /confirm the facts before generating/i })).toBeVisible();
  expect(previewRequests).toBe(0);
  await expectNoSeriousAccessibilityViolations(page);
  await expect(page.getByRole("button", { name: /generate unsigned preview/i })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /generate unsigned preview/i }).click();
  await expect(page.getByRole("heading", { name: /protection plan ready/i })).toBeVisible();
  expect(previewRequests).toBe(1);
  await expect(page.getByText("No funds moved; no protected position was created")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign|approve exact amount|send transaction/i })).toHaveCount(0);
  const walletMethods = await page.evaluate(() => (window as unknown as { __goalguardWalletMethods: string[] }).__goalguardWalletMethods);
  expect(walletMethods).not.toContain("eth_sendTransaction");
  await expectNoSeriousAccessibilityViolations(page);
});

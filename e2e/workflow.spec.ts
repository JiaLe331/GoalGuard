import { expect, test, type Page, type Route } from "@playwright/test";

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

type WorkflowRequestLog = { previewKeys: string[]; refreshes: number; walletCalls: string[] };

async function installWorkflowFixtures(page: Page, preview = previewTradeResponse): Promise<WorkflowRequestLog> {
  const log: WorkflowRequestLog = { previewKeys: [], refreshes: 0, walletCalls: [] };
  await page.addInitScript(() => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const calls: string[] = [];
    Object.defineProperty(window, "__goalguardWalletCalls", { value: calls, configurable: true });
    Object.defineProperty(window, "ethereum", {
      value: {
        request: async ({ method }: { method: string }) => {
          calls.push(method);
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
    if (path === "/api/protection/candidates") {
      if (new URL(request.url()).searchParams.get("refresh") === "true" || request.postDataJSON()?.refresh === true) log.refreshes += 1;
      return json(route, generateCandidatesResponse);
    }
    if (path === "/api/council/review") return json(route, reviewCandidateResponse);
    if (path === "/api/trades/preview") {
      const key = request.headers()["idempotency-key"];
      if (key) log.previewKeys.push(key);
      return json(route, preview);
    }
    return json(route, { error: { code: "NOT_FOUND", message: "Fixture route missing", retryable: false, fieldErrors: {}, details: null }, meta: fixtureMeta }, 404);
  });
  return log;
}

async function completeToPlan(page: Page) {
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
}

test("completes the contract-wired frontend through a preview-only trade", async ({ page }) => {
  const log = await installWorkflowFixtures(page);
  await completeToPlan(page);

  const refreshCompleted = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/protection/candidates");
  await page.getByRole("button", { name: /refresh live options/i }).click();
  expect((await refreshCompleted).ok()).toBe(true);
  await expect(page.getByText("3/3 council checks passed")).toBeVisible();

  await page.getByRole("button", { name: /generate unsigned preview/i }).click();
  await expect(page.getByLabel(/wallet connected/i)).toBeVisible();
  const previewButton = page.getByRole("button", { name: /generate unsigned preview/i });
  await previewButton.evaluate((button) => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(page.getByRole("heading", { name: /protection plan ready \(demo\)/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /prepare wallet transaction/i })).toHaveCount(0);
  expect(log.refreshes).toBe(1);
  expect(log.previewKeys.length).toBeGreaterThan(0);
  expect(new Set(log.previewKeys).size).toBe(1);
  const walletCalls = await page.evaluate(() => (window as Window & { __goalguardWalletCalls?: string[] }).__goalguardWalletCalls ?? []);
  expect(walletCalls).toEqual(expect.not.arrayContaining(["personal_sign", "eth_sign", "eth_sendTransaction", "wallet_sendTransaction"]));
  await expectNoSeriousAccessibilityViolations(page);
});

test("labels a partial candidate as a proportional demo and never as full protection", async ({ page }) => {
  const partialPreview = {
    ...previewTradeResponse,
    data: {
      ...previewTradeResponse.data,
      candidate: { ...previewTradeResponse.data.candidate, goalCoverageBps: 3500, coverageMode: "proportional_demo" as const },
      proposal: { ...previewTradeResponse.data.proposal, goalCoverageBps: 3500, coverageMode: "proportional_demo" as const },
      warnings: ["This proportional preview covers only part of the original goal."],
    },
  };
  await installWorkflowFixtures(page, partialPreview);
  await completeToPlan(page);
  await page.getByRole("button", { name: /generate unsigned preview/i }).click();
  await expect(page.getByLabel(/wallet connected/i)).toBeVisible();
  await page.getByRole("button", { name: /generate unsigned preview/i }).click();
  await expect(page.getByRole("heading", { name: /protection plan ready \(demo\)/i })).toBeVisible();
  await expect(page.getByText("Proportional micro-hedge demo", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not fully protect the original amount/i)).toBeVisible();
  await expect(page.getByText("35%", { exact: true })).toBeVisible();
});

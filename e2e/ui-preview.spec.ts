import { expect, test } from "@playwright/test";

import { uiPreviewStates } from "../src/lib/frontend/ui-preview";
import { expectNoSeriousAccessibilityViolations } from "./accessibility";

test("previews every post-goal interface state without backend or wallet traffic", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const methods: string[] = [];
    Object.defineProperty(window, "__goalguardWalletMethods", { value: methods, configurable: true });
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: {
        request: ({ method }: { method: string }) => { methods.push(method); return Promise.resolve([]); },
        on: () => undefined,
        removeListener: () => undefined,
      },
    });
  });

  await page.goto("/dev/ui-preview");
  await expect(page.getByText("Development UI preview — sample data")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);

  const selector = page.getByLabel("Interface state");
  for (const item of uiPreviewStates) {
    await selector.selectOption(item.value);
    await expect(selector).toHaveValue(item.value);
    await expect(page).toHaveURL(new RegExp(`state=${item.value}`));
  }

  expect(apiRequests).toEqual([]);
  const walletMethods = await page.evaluate(() => (window as unknown as { __goalguardWalletMethods: string[] }).__goalguardWalletMethods);
  expect(walletMethods).toEqual([]);
  await expect(page.getByRole("button", { name: /^(sign|send transaction|broadcast|approve exact amount)/i })).toHaveCount(0);
  await expectNoSeriousAccessibilityViolations(page);
});

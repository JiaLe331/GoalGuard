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
  await expect(page).toHaveTitle("GoalGuard");
  await expect(page.getByText("Development UI preview: sample data")).toBeVisible();
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

test("keeps representative workflow states within every target viewport", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const states = ["goal-confirmation", "plan-approved", "council-drawer", "preview-confirmation", "demo-ready", "preview-failure"];
  for (const { width, height } of [{ width: 320, height: 700 }, { width: 375, height: 812 }, { width: 640, height: 900 }, { width: 667, height: 375 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize({ width, height });
    for (const state of states) {
      await page.goto(`/dev/ui-preview?state=${state}`);
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        offenders: Array.from(document.querySelectorAll<HTMLElement>("body *")).flatMap((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1
            ? [`${element.tagName.toLowerCase()}.${element.className}`]
            : [];
        }).slice(0, 5),
      }));
      expect(dimensions.scroll, `${state} overflowed at ${width}px: ${dimensions.offenders.join(", ")}`).toBeLessThanOrEqual(dimensions.client);
    }
  }
});

test("keeps Pip unframed, free of supplemental graphics, and reduced-motion safe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dev/ui-preview?state=searching");
  const mascot = page.locator('[data-pip-pose="checking"]');
  await mascot.waitFor();
  await expect(mascot.locator('[data-pip-accessory], [data-pip-activity-point]')).toHaveCount(0);
  await expect(mascot.locator('[data-pip-artwork-layer="true"]')).not.toHaveClass(/bg-white|rounded-full|ring-1/);
  await expect(mascot.locator('[data-pip-ground-shadow="true"]')).toBeVisible();
  await page.waitForTimeout(500);
  expect(await mascot.evaluate((element) => element.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"))).toBe(false);

  await page.getByRole("combobox", { name: "Interface state" }).selectOption("preview-confirmation");
  const croppedMascot = page.locator('[data-pip-pose="attentive"][data-pip-artwork="compact"]');
  await croppedMascot.waitFor();
  await expect(croppedMascot.locator('[data-pip-ground-shadow="true"]')).toHaveCount(0);
});

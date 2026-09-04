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
  const states = ["goal-confirmation", "no-candidate", "plan-approved", "council-drawer", "preview-confirmation", "demo-ready", "preview-failure"];
  for (const { width, height } of [{ width: 320, height: 700 }, { width: 375, height: 812 }, { width: 547, height: 698 }, { width: 640, height: 900 }, { width: 667, height: 375 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
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

test("limits Niu Lai motion to active requests and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/dev/ui-preview?state=searching");
  const mascotMotion = page.locator('[data-niulai-pose="checking"] [data-niulai-artwork-layer="true"]').first();
  await mascotMotion.waitFor();
  await page.waitForTimeout(500);
  expect(await mascotMotion.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await mascotMotion.waitFor();
  await page.waitForTimeout(500);
  expect(await mascotMotion.evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(false);

  await page.getByRole("combobox", { name: "Interface state" }).selectOption("plan-approved");
  await expect(mascotMotion).toHaveCount(0);
});

test("keeps Niu Lai clear of copy and provenance at the 547px review width", async ({ page }) => {
  await page.setViewportSize({ width: 547, height: 698 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/dev/ui-preview?state=generating-preview");
  const provenance = page.getByRole("list", { name: "Live request provenance" });
  const activeMascot = page.locator('[data-niulai-placement="active-request"]');
  await expect(provenance).toBeVisible();
  await expect(activeMascot).toBeVisible();
  const [provenanceBox, activeMascotBox] = await Promise.all([provenance.boundingBox(), activeMascot.boundingBox()]);
  expect(activeMascotBox?.y ?? 0).toBeGreaterThanOrEqual((provenanceBox?.y ?? 0) + (provenanceBox?.height ?? 0) + 16);

  await page.goto("/dev/ui-preview?state=demo-ready");
  const readyCopy = page.locator('[data-niulai-copy="demo-ready"]');
  const readyMascot = page.locator('[data-niulai-placement="demo-ready"]');
  await expect(readyCopy).toBeVisible();
  await expect(readyMascot).toBeVisible();
  const [readyCopyBox, readyMascotBox] = await Promise.all([readyCopy.boundingBox(), readyMascot.boundingBox()]);
  expect(readyMascotBox?.y ?? 0).toBeGreaterThanOrEqual((readyCopyBox?.y ?? 0) + (readyCopyBox?.height ?? 0) + 16);
});

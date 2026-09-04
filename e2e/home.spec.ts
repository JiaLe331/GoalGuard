import { expect, test } from "@playwright/test";
import { fixtureMeta } from "../src/test/fixtures/goalguard";
import { expectNoSeriousAccessibilityViolations } from "./accessibility";

test("renders the honest GoalGuard P0 entry shell", async ({ page }) => {
  await page.route("**/api/integrations/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: {
        database: { status: "ready" },
        gonka: { status: "unconfigured", model: null, requestId: null },
        thetanuts: { status: "unconfigured", chainId: 8453, activeEthPutCount: null, marketAsOf: null },
      },
      meta: fixtureMeta,
    }),
  }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /protect the purpose behind your money/i })).toBeVisible();
  await expect(page.locator("#goal-preview").getByRole("heading", { name: /start with what the money is for/i })).toBeVisible();
  await expect(page.locator("#goal-preview").getByText("Protection goal", { exact: true })).toBeVisible();
  await expect(page.getByText("Illustration only")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /pause examples/i })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rent" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /build my protection plan/i }).first()).toHaveAttribute("href", "/goals/new");
  await expect(page.getByRole("heading", { name: /from your goal to a plan you can actually inspect/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /clear advantages without hidden custody/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /primary navigation/i })).toBeVisible();
  await expect(page.getByText(/no wallet signature or transaction broadcast/i)).toBeVisible();
  await expect(page.getByText(/unsigned preview only/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expect(page.getByText("Needs setup")).toHaveCount(2);
  await expect(page.locator('[data-niulai-pose] img[alt=""]')).toHaveCount(2);
  const visualSystem = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>("#top > div");
    const header = document.querySelector<HTMLElement>("header[data-scrolled]");
    return {
      heroBackground: hero ? getComputedStyle(hero).backgroundColor : "",
      headerPosition: header ? getComputedStyle(header).position : "",
    };
  });
  expect(visualSystem.heroBackground).toBe("rgb(201, 245, 43)");
  expect(visualSystem.headerPosition).toBe("sticky");
  await expectNoSeriousAccessibilityViolations(page);
});

test("opens the real goal composer from the landing preview", async ({ page }) => {
  let parseRequests = 0;
  await page.route("**/api/goals/parse", (route) => {
    parseRequests += 1;
    return route.abort();
  });
  await page.goto("/");
  expect(parseRequests).toBe(0);
  await page.locator("#goal-preview").getByRole("link", { name: /build my protection plan/i }).click();
  await page.waitForURL(/\/goals\/new$/);
  expect(parseRequests).toBe(0);
  await expect(page.getByRole("textbox", { name: /describe your protection goal/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rent" })).toBeVisible();
});

test("keeps an incomplete Gonka draft and asks exactly one clarification", async ({ page }) => {
  await page.route("**/api/goals/parse", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { draft: { goalType: "rent", underlyingAsset: "ETH", protectedValueUsd: "1200" }, missingFields: ["deadline", "maxLossBps"], clarificationQuestion: "By what date do you need this money?", goal: null, inference: { id: "6b3e798c-e0e8-4ab5-9e37-d4526424eb8f", purpose: "goal_parse", model: "gonka-model-a", requestId: "gonka-clarification-1", status: "succeeded" } }, meta: fixtureMeta }) }));
  await page.goto("/goals/new");
  await page.getByRole("textbox", { name: /describe your protection goal/i }).fill("Protect my $1,200 rent fund.");
  await page.getByRole("button", { name: /create protection goal/i }).click();
  await expect(page.getByText("One detail needed")).toBeVisible();
  await expect(
    page.getByRole("status").getByText("By what date do you need this money?"),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /by what date/i })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});

test("keeps the landing interface usable without horizontal overflow across the responsive range", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const sizes = [
    { width: 320, height: 700 }, { width: 360, height: 780 }, { width: 375, height: 812 }, { width: 430, height: 932 }, { width: 547, height: 698 },
    { width: 640, height: 900 }, { width: 667, height: 375 }, { width: 768, height: 1024 }, { width: 844, height: 390 },
    { width: 912, height: 1368 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 },
  ];
  for (const { width, height } of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /protect the purpose behind your money/i })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    const radius = Number.parseFloat(await navigation.evaluate((element) => getComputedStyle(element).borderRadius));
    expect(radius).toBeGreaterThan(30);
    if (width < 1200) {
      const composer = page.locator("#goal-preview");
      const orbit = page.locator(".protection-orbit");
      expect((await composer.boundingBox())?.y ?? 0).toBeLessThan((await orbit.boundingBox())?.y ?? 0);
    }
    if (width === 375) {
      await page.getByRole("button", { name: /menu/i }).click();
      const menu = page.getByRole("dialog", { name: "Explore GoalGuard" });
      await expect(menu.getByRole("button", { name: "Close panel" })).toBeVisible();
      const wallet = menu.getByRole("button", { name: "Connect wallet" });
      const [walletBox, menuBox] = await Promise.all([wallet.boundingBox(), menu.boundingBox()]);
      expect(walletBox?.width ?? 0).toBeGreaterThan((menuBox?.width ?? 0) * 0.8);
      await menu.getByRole("button", { name: "Close panel" }).click();
      await expect(menu).not.toBeVisible();
    }
    if (width === 1280) {
      const orbit = page.locator(".protection-orbit");
      await orbit.scrollIntoViewIfNeeded();
      const before = await orbit.evaluate((element) => getComputedStyle(element).transform);
      const bounds = await orbit.boundingBox();
      if (bounds) await page.mouse.move(bounds.x + bounds.width - 10, bounds.y + 10);
      await page.waitForTimeout(120);
      await expect(orbit).toHaveCSS("transform", before);
    }
    if (width === 1280) {
      const desktopAction = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Build a plan" }).first();
      await expect(desktopAction).toBeVisible();
      const actionLayout = await desktopAction.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        whiteSpace: getComputedStyle(element).whiteSpace,
      }));
      expect(actionLayout.whiteSpace).toBe("nowrap");
      expect(actionLayout.height).toBeLessThanOrEqual(50);
    }
    await page.screenshot({ animations: "disabled" });
  }
});

test("supports persisted light, dark, and system appearance", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose appearance" }).click();
  await page.getByText("Dark", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Choose appearance" }).click();
  await page.getByText("System", { exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

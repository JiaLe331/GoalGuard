import { expect, test } from "@playwright/test";
import { fixtureMeta } from "../src/test/fixtures/goalguard";
import { expectNoSeriousAccessibilityViolations } from "./accessibility";

test("renders the honest GoalGuard P0 entry shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /protect the purpose behind your money/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /what are you protecting/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /from your goal to a plan you can actually inspect/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /clear advantages without hidden custody/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /primary navigation/i })).toBeVisible();
  await expect(page.getByText(/no wallet signature or transaction broadcast/i)).toBeVisible();
  await expect(page.getByText(/unsigned preview only/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expect(page.getByText("Needs setup")).toHaveCount(2);
  await expect(page.locator("img")).toHaveCount(0);
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

test("keeps an incomplete Gonka draft and asks exactly one clarification", async ({ page }) => {
  await page.route("**/api/goals/parse", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { draft: { goalType: "rent", underlyingAsset: "ETH", protectedValueUsd: "1200" }, missingFields: ["deadline", "maxLossBps"], clarificationQuestion: "By what date do you need this money?", goal: null, inference: { id: "6b3e798c-e0e8-4ab5-9e37-d4526424eb8f", purpose: "goal_parse", model: "gonka-model-a", requestId: "gonka-clarification-1", status: "succeeded" } }, meta: fixtureMeta }) }));
  await page.goto("/");
  await page.getByRole("textbox", { name: /describe your protection goal/i }).fill("Protect my $1,200 rent fund.");
  await page.getByRole("button", { name: /create protection goal/i }).click();
  await expect(page.getByText("One detail needed")).toBeVisible();
  await expect(
    page.getByRole("status").getByText("By what date do you need this money?"),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /by what date/i })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});

test("keeps the landing interface usable without horizontal overflow at target widths", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /protect the purpose behind your money/i })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    await page.screenshot({ animations: "disabled" });
  }
});

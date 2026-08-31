import { expect, test } from "@playwright/test";
import { expectNoSeriousAccessibilityViolations } from "./accessibility";

test("renders the honest GoalGuard P0 entry shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /protect the purpose behind your money/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /what are you protecting/i })).toBeVisible();
  await expect(page.getByText(/live execution disabled by default/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expect(page.getByText("Needs setup")).toHaveCount(2);
  await expectNoSeriousAccessibilityViolations(page);
});

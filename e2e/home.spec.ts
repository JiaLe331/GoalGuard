import { expect, test } from "@playwright/test";

test("renders the honest M1 GoalGuard shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /protect the purpose behind your money/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /what are you protecting/i })).toBeVisible();
  await expect(page.getByText(/no live execution/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  await expect(page.getByText("Needs setup")).toHaveCount(2);
});

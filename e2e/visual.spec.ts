import { test } from "@playwright/test";

import { fixtureMeta } from "../src/test/fixtures/goalguard";

const statusResponse = {
  data: {
    database: { status: "ready" },
    gonka: { status: "unconfigured", model: null, requestId: null },
    thetanuts: { status: "unconfigured", chainId: 8453, activeEthPutCount: null, marketAsOf: null },
  },
  meta: fixtureMeta,
};

test("captures deterministic light and dark responsive UI evidence", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/integrations/status", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusResponse) }));

  for (const theme of ["light", "dark"] as const) {
    await page.context().addCookies([{ name: "goalguard-theme", value: theme, url: "http://127.0.0.1:3000" }]);
    for (const width of [375, 547, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of [
        { name: "landing", url: "/" },
        { name: "goal-confirmation", url: "/dev/ui-preview?state=goal-confirmation" },
        { name: "searching", url: "/dev/ui-preview?state=searching" },
        { name: "reviewing", url: "/dev/ui-preview?state=reviewing" },
        { name: "generating-preview", url: "/dev/ui-preview?state=generating-preview" },
        { name: "blocked-plan", url: "/dev/ui-preview?state=plan-blocked" },
        { name: "preview-confirmation", url: "/dev/ui-preview?state=preview-confirmation" },
        { name: "approved-plan", url: "/dev/ui-preview?state=plan-approved" },
        { name: "no-candidate", url: "/dev/ui-preview?state=no-candidate" },
        { name: "demo-ready", url: "/dev/ui-preview?state=demo-ready" },
        { name: "council-drawer", url: "/dev/ui-preview?state=council-drawer" },
      ]) {
        await page.goto(screen.url);
        if (screen.name === "landing") {
          await page.getByRole("heading", { name: /protect the purpose behind your money/i }).waitFor();
          await page.locator(".protection-orbit").waitFor();
        } else {
          await page.locator(".workflow-stage").waitFor();
          await page.waitForFunction(() => getComputedStyle(document.querySelector(".workflow-stage")!).opacity === "1");
        }
        await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('[data-niulai-pose] img')).every((image) => image.complete && image.naturalWidth > 0));
        const name = `${screen.name}-${theme}-${width}.png`;
        const path = testInfo.outputPath(name);
        await page.screenshot({ animations: "disabled", path });
        await testInfo.attach(name, { path, contentType: "image/png" });

        if (screen.name === "landing" && width < 1200) {
          await page.getByRole("button", { name: /menu/i }).click();
          await page.getByRole("dialog", { name: "Explore GoalGuard" }).waitFor();
          const menuName = `landing-menu-${theme}-${width}.png`;
          const menuPath = testInfo.outputPath(menuName);
          await page.screenshot({ animations: "disabled", path: menuPath });
          await testInfo.attach(menuName, { path: menuPath, contentType: "image/png" });
          await page.getByRole("button", { name: "Close panel" }).click();
        }
      }
    }
  }
});

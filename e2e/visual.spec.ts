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
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/integrations/status", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusResponse) }));

  for (const theme of ["light", "dark"] as const) {
    await page.context().addCookies([{ name: "goalguard-theme", value: theme, url: "http://127.0.0.1:3000" }]);
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const screen of [
        { name: "landing", url: "/" },
        { name: "searching", url: "/dev/ui-preview?state=searching" },
        { name: "blocked-plan", url: "/dev/ui-preview?state=plan-blocked" },
        { name: "preview-confirmation", url: "/dev/ui-preview?state=preview-confirmation" },
        { name: "approved-plan", url: "/dev/ui-preview?state=plan-approved" },
        { name: "demo-ready", url: "/dev/ui-preview?state=demo-ready" },
      ]) {
        await page.goto(screen.url);
        if (screen.name === "landing") {
          await page.getByRole("heading", { name: /protect the purpose behind your money/i }).waitFor();
          await page.locator(".protection-orbit").waitFor();
        } else {
          await page.locator(".workflow-stage").waitFor();
          await page.waitForFunction(() => getComputedStyle(document.querySelector(".workflow-stage")!).opacity === "1");
        }
        const name = `${screen.name}-${theme}-${width}.png`;
        const path = testInfo.outputPath(name);
        await page.screenshot({ animations: "disabled", path });
        await testInfo.attach(name, { path, contentType: "image/png" });
      }
    }
  }
});

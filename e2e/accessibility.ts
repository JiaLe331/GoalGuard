import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(blocking, blocking.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
}

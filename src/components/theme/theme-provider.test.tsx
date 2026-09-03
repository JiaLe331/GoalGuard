import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { readThemeCookie, resolveTheme } from "@/lib/frontend/theme";

function ThemeState() {
  const theme = useTheme();
  return <output>{theme.preference}:{theme.resolvedTheme}</output>;
}

describe("theme system", () => {
  it("resolves system preference and validates the cookie", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(readThemeCookie("goalguard-theme=dark")).toBe("dark");
    expect(readThemeCookie("goalguard-theme=unknown")).toBe("system");
  });

  it("persists an explicit selection and restores system mode", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeSelector /><ThemeState /></ThemeProvider>);

    await user.click(screen.getByRole("button", { name: "Choose appearance" }));
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.cookie).toContain("goalguard-theme=dark");
    expect(screen.getByText("dark:dark")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Choose appearance" }));
    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(document.cookie).not.toContain("goalguard-theme=dark");
    expect(screen.getByText("system:light")).toBeInTheDocument();
  });

  it("follows operating-system changes while System is selected", async () => {
    let listener: (() => void) | undefined;
    let dark = false;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      get matches() { return query.includes("prefers-color-scheme") ? dark : false; },
      media: query,
      onchange: null,
      addEventListener: (_event: string, callback: EventListenerOrEventListenerObject) => { listener = callback as () => void; },
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));
    render(<ThemeProvider><ThemeState /></ThemeProvider>);
    expect(screen.getByText("system:light")).toBeInTheDocument();
    dark = true;
    act(() => listener?.());
    expect(await screen.findByText("system:dark")).toBeInTheDocument();
  });
});

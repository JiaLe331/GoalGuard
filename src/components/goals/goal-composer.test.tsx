import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { GoalComposer } from "./goal-composer";

describe("GoalComposer", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores only a local draft and makes the limitation explicit", async () => {
    const user = userEvent.setup();
    render(<GoalComposer />);
    await user.click(screen.getByRole("button", { name: "Rent" }));
    await user.type(screen.getByRole("textbox"), "Protect my rent fund next month.");
    await user.click(screen.getByRole("button", { name: /save local draft/i }));
    expect(screen.getByRole("status")).toHaveTextContent("No recommendation or trade was created");
    expect(window.localStorage.getItem("goalguard:goal-draft")).toContain("Protect my rent fund");
  });
});

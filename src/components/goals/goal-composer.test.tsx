import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fixtureMeta, parseGoalResponse } from "@/test/fixtures/goalguard";
import { GoalComposer } from "./goal-composer";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("GoalComposer", () => {
  beforeEach(() => { window.localStorage.clear(); push.mockReset(); });
  afterEach(() => vi.restoreAllMocks());

  it("validates an empty message without contacting a wallet or API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<GoalComposer />);
    await user.click(screen.getByRole("button", { name: /create protection goal/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Describe the money");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves an incomplete draft and asks one clarification", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { draft: { goalType: "rent", underlyingAsset: "ETH" }, missingFields: ["deadline"], clarificationQuestion: "When do you need the rent money?", goal: null, inference: { id: "6b3e798c-e0e8-4ab5-9e37-d4526424eb8f", purpose: "goal_parse", model: "gonka-model-a", requestId: "gonka-parse-1", status: "succeeded" } }, meta: fixtureMeta }), { status: 200 }));
    const user = userEvent.setup();
    render(<GoalComposer />);
    await user.type(screen.getByRole("textbox"), "Protect my rent fund.");
    await user.click(screen.getByRole("button", { name: /create protection goal/i }));
    expect(await screen.findByRole("status")).toHaveTextContent("When do you need the rent money?");
    expect(screen.getByRole("button", { name: /continue/i })).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it("stores the active durable goal and navigates to its workspace", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(parseGoalResponse), { status: 200 }));
    const user = userEvent.setup();
    render(<GoalComposer />);
    await user.click(screen.getByRole("button", { name: "Rent" }));
    await user.type(screen.getByRole("textbox"), "Protect my rent fund by September.");
    await user.click(screen.getByRole("button", { name: /create protection goal/i }));
    expect(push).toHaveBeenCalledWith(`/goals/${parseGoalResponse.data.goal!.id}`);
    expect(window.localStorage.getItem("goalguard:v1:active-goal-id")).toBe(parseGoalResponse.data.goal!.id);
  });
});

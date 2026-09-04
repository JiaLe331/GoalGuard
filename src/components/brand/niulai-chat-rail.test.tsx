import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NIULAI_PROCESSING_DELAY_MS,
  NIULAI_TYPING_STOP_MAX_MS,
  NIULAI_TYPING_STOP_MIN_MS,
  NiulaiChatRail,
  niulaiChatFallbackPoses,
  resolveNiulaiGestureCycleMs,
  resolveNiulaiChatState,
  useNiulaiTypingActivity,
  type NiulaiChatState,
} from "./niulai-chat-rail";

afterEach(() => {
  vi.useRealTimers();
});

function TypingHarness() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const { typing, typingCadenceMs, noteInputActivity, stopTyping } = useNiulaiTypingActivity();
  return (
    <>
      <input
        aria-label="Message"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); stopTyping(); }}
        onChange={(event) => { setValue(event.target.value); noteInputActivity(); }}
      />
      <output>{typing ? "typing" : focused ? "listening" : "idle"}</output>
      <output data-testid="typing-cadence">{typingCadenceMs}</output>
    </>
  );
}

describe("NiulaiChatRail", () => {
  it("maps every public state to an approved static fallback", () => {
    const states: NiulaiChatState[] = ["idle", "listening", "typing", "processing", "clarifying", "ready", "error"];
    const { container, rerender } = render(<NiulaiChatRail state="idle" motionPreference="reduce" />);
    for (const state of states) {
      rerender(<NiulaiChatRail state={state} motionPreference="reduce" />);
      expect(container.querySelector(`[data-niulai-pose="${niulaiChatFallbackPoses[state]}"]`)).toBeInTheDocument();
    }
  });

  it("resolves competing signals with safety and completed states first", () => {
    expect(resolveNiulaiChatState({ hasError: true, ready: true, processing: true, typing: true })).toBe("error");
    expect(resolveNiulaiChatState({ ready: true, clarifying: true, processing: true })).toBe("ready");
    expect(resolveNiulaiChatState({ clarifying: true, processing: true, typing: true })).toBe("clarifying");
    expect(resolveNiulaiChatState({ processing: true, typing: true, focused: true })).toBe("processing");
    expect(resolveNiulaiChatState({ typing: true, focused: true })).toBe("typing");
    expect(resolveNiulaiChatState({ focused: true })).toBe("listening");
    expect(resolveNiulaiChatState({})).toBe("idle");
  });

  it("starts Scuba only after the processing threshold and cancels it on state change", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<NiulaiChatRail state="processing" processingStage="reading-goal" />);
    expect(container.firstChild).toHaveAttribute("data-niulai-motion-active", "none");
    act(() => vi.advanceTimersByTime(NIULAI_PROCESSING_DELAY_MS - 1));
    expect(container.firstChild).toHaveAttribute("data-niulai-motion-active", "none");
    act(() => vi.advanceTimersByTime(1));
    expect(container.firstChild).toHaveAttribute("data-niulai-motion-active", "scuba");
    rerender(<NiulaiChatRail state="idle" />);
    expect(container.firstChild).toHaveAttribute("data-niulai-motion-active", "none");
  });

  it("runs the 67 asset only for typing and falls back safely when media fails", () => {
    const { container } = render(<NiulaiChatRail state="typing" />);
    const asset = container.querySelector('[data-niulai-motion-asset="gesture-67"]');
    expect(asset).toBeInTheDocument();
    const preload = container.querySelector('[data-niulai-motion-preload="gesture-67"]');
    fireEvent.error(preload!);
    expect(container.firstChild).toHaveAttribute("data-niulai-media-failed", "true");
    expect(container.querySelector('[data-niulai-motion-asset="gesture-67"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-niulai-pose="listening"]')).toBeInTheDocument();
  });

  it("is decorative and never introduces an interactive target", () => {
    const { container } = render(<NiulaiChatRail state="ready" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("button, a, input, textarea, select, [tabindex]")).not.toBeInTheDocument();
  });

  it("matches 67 speed to typing cadence and stops after adaptive inactivity", () => {
    vi.useFakeTimers();
    render(<TypingHarness />);
    const input = screen.getByRole("textbox", { name: "Message" });
    fireEvent.focus(input);
    expect(screen.getByText("listening")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "H" } });
    expect(screen.getByText("typing")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(80));
    fireEvent.change(input, { target: { value: "Hi" } });
    expect(screen.getByTestId("typing-cadence")).toHaveTextContent("80");
    expect(resolveNiulaiGestureCycleMs(80)).toBe(480);
    act(() => vi.advanceTimersByTime(NIULAI_TYPING_STOP_MIN_MS - 1));
    expect(screen.getByText("typing")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("listening")).toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("keeps a slower continuous typist active without exceeding the stop ceiling", () => {
    vi.useFakeTimers();
    render(<TypingHarness />);
    const input = screen.getByRole("textbox", { name: "Message" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "H" } });
    act(() => vi.advanceTimersByTime(400));
    fireEvent.change(input, { target: { value: "Hi" } });
    expect(screen.getByTestId("typing-cadence")).toHaveTextContent("400");
    expect(resolveNiulaiGestureCycleMs(400)).toBe(1500);
    act(() => vi.advanceTimersByTime(NIULAI_TYPING_STOP_MAX_MS - 1));
    expect(screen.getByText("typing")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("listening")).toBeInTheDocument();
  });

  it("forces static artwork for the reduced-motion preview", () => {
    const { container } = render(<NiulaiChatRail state="typing" motionPreference="reduce" />);
    expect(container.firstChild).toHaveAttribute("data-niulai-motion-active", "none");
    expect(container.querySelector("[data-niulai-motion-asset]")).not.toBeInTheDocument();
    expect(container.querySelector('[data-niulai-pose="listening"]')).toBeInTheDocument();
  });
});

export const uiPreviewStates = [
  { value: "goal-confirmation", label: "Goal confirmation" },
  { value: "searching", label: "Searching for live options" },
  { value: "reviewing", label: "Council-review loading" },
  { value: "plan-approved", label: "Approved plan" },
  { value: "plan-disputed", label: "Disputed plan" },
  { value: "plan-blocked", label: "Blocked plan" },
  { value: "council-drawer", label: "Council drawer" },
  { value: "preview-confirmation", label: "Preview confirmation" },
  { value: "generating-preview", label: "Preview generation" },
  { value: "demo-ready", label: "Demo-ready result" },
  { value: "no-candidate", label: "No suitable candidate" },
  { value: "stale-candidate", label: "Stale candidate" },
  { value: "preview-failure", label: "Preview failure" },
  { value: "insufficient-wallet", label: "Insufficient wallet readiness" },
  { value: "reload-after-preview", label: "Reload-after-preview recovery" },
] as const;

export type UiPreviewState = (typeof uiPreviewStates)[number]["value"];

export function isDevelopmentUiPreview(nodeEnvironment: string | undefined) {
  return nodeEnvironment === "development";
}

export function parseUiPreviewState(value: string | string[] | undefined): UiPreviewState {
  const candidate = Array.isArray(value) ? value[0] : value;
  return uiPreviewStates.some((state) => state.value === candidate)
    ? candidate as UiPreviewState
    : "goal-confirmation";
}

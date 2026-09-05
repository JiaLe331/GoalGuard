/**
 * The presentation flow: a compressed, deterministic replay of one real recorded run, used
 * for live demos where the genuine council review takes minutes and can stall upstream.
 *
 * Two switches, deliberately. The environment variable arms the build; the query parameter
 * activates a single tab. That means the real live flow is always one URL away during a
 * demo, and deleting the variable disables the path everywhere.
 */
const PARAM = "flow";
const VALUE = "fast";

/** True only in the browser, only when the build is armed and this tab opted in. */
export function isPresentationFlow(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_PRESENTATION_FLOW !== "true") return false;
  try {
    return new URLSearchParams(window.location.search).get(PARAM) === VALUE;
  } catch {
    return false;
  }
}

/** Carries the opt-in across an internal navigation, e.g. composer -> goal workspace. */
export function withPresentationFlow(path: string): string {
  if (!isPresentationFlow()) return path;
  return path.includes("?") ? `${path}&${PARAM}=${VALUE}` : `${path}?${PARAM}=${VALUE}`;
}

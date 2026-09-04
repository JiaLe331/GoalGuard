import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UiPreviewLab } from "@/components/dev/ui-preview-lab";
import { isDevelopmentUiPreview, parseUiPreviewState } from "@/lib/frontend/ui-preview";

export const metadata: Metadata = {
  title: "Development UI preview | GoalGuard",
  robots: { index: false, follow: false, nocache: true },
};

export default async function UiPreviewPage({ searchParams }: { searchParams: Promise<{ state?: string | string[] }> }) {
  if (!isDevelopmentUiPreview(process.env.NODE_ENV)) notFound();

  const [params, fixtures] = await Promise.all([
    searchParams,
    import("@/test/fixtures/goalguard"),
  ]);

  return (
    <UiPreviewLab
      initialState={parseUiPreviewState(params.state)}
      samples={{
        goal: fixtures.fixtureGoal,
        candidate: fixtures.fixturePublicCandidate,
        decision: fixtures.fixtureDecision,
        disputedDecision: fixtures.fixtureDisputedDecision,
        blockedDecision: fixtures.fixtureBlockedDecision,
        preview: fixtures.previewTradeResponse.data,
        meta: fixtures.previewTradeResponse.meta,
      }}
    />
  );
}

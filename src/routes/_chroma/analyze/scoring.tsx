import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const ScoreView = lazy(() => import("@/components/views/score.view"));

export const Route = createFileRoute("/_chroma/analyze/scoring")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-xs text-muted-foreground">Loading…</div>
      }
    >
      <ScoreView />
    </Suspense>
  ),
});

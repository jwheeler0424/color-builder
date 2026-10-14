import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const VisualizeView = lazy(() => import("@/components/views/visualize.view"));

export const Route = createFileRoute("/_chroma/analyze/visualize")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-xs text-muted-foreground">Loading…</div>
      }
    >
      <VisualizeView />
    </Suspense>
  ),
});

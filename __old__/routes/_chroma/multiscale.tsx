import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
const MultiScaleView = lazy(
  () => import("@/components/views/multi-scale-view"),
);

export const Route = createFileRoute("/_chroma/multiscale")({
  component: () => (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--ch-t3)", fontSize: 13 }}>
          Loading…
        </div>
      }
    >
      <MultiScaleView />
    </Suspense>
  ),
});

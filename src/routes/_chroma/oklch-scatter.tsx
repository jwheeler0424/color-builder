import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
const OKLCHScatterView = lazy(
  () => import("@/components/views/oklch-scatter-view"),
);

export const Route = createFileRoute("/_chroma/oklch-scatter")({
  component: () => (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--ch-t3)", fontSize: 13 }}>
          Loading…
        </div>
      }
    >
      <OKLCHScatterView />
    </Suspense>
  ),
});

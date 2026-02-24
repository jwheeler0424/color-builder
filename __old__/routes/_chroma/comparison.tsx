import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
const PaletteComparisonView = lazy(
  () => import("@/components/views/palette-comparison-view"),
);

export const Route = createFileRoute("/_chroma/comparison")({
  component: () => (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--ch-t3)", fontSize: 13 }}>
          Loading…
        </div>
      }
    >
      <PaletteComparisonView />
    </Suspense>
  ),
});

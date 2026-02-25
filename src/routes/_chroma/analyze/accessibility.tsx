import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const AccessibilityView = lazy(
  () => import("@/components/views/accessibility.view"),
);

export const Route = createFileRoute("/_chroma/analyze/accessibility")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-[12px] text-muted-foreground">Loading…</div>
      }
    >
      <AccessibilityView />
    </Suspense>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const ScalesView = lazy(() => import("@/components/views/scales.view"));

export const Route = createFileRoute("/_chroma/export/scale")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-[12px] text-muted-foreground">Loading…</div>
      }
    >
      <ScalesView />
    </Suspense>
  ),
});

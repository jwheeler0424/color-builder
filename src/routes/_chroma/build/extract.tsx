import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const ExtractView = lazy(() => import("@/components/views/extract.view"));

export const Route = createFileRoute("/_chroma/build/extract")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-[12px] text-muted-foreground">Loading…</div>
      }
    >
      <ExtractView />
    </Suspense>
  ),
});

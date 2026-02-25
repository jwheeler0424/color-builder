import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const BrandComplianceView = lazy(
  () => import("@/components/views/brand-compliance-view"),
);

export const Route = createFileRoute("/_chroma/analyze/brand")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-[12px] text-muted-foreground">Loading…</div>
      }
    >
      <BrandComplianceView />
    </Suspense>
  ),
});

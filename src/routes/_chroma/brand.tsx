import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
const BrandComplianceView = lazy(
  () => import("@/components/views/brand-compliance-view"),
);

export const Route = createFileRoute("/_chroma/brand")({
  component: () => (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--ch-t3)", fontSize: 13 }}>
          Loading…
        </div>
      }
    >
      <BrandComplianceView />
    </Suspense>
  ),
});

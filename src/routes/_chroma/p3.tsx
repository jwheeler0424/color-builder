import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
const P3GamutView = lazy(() => import("@/components/views/p3-gamut-view"));

export const Route = createFileRoute("/_chroma/p3")({
  component: () => (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: "var(--ch-t3)", fontSize: 13 }}>
          Loading…
        </div>
      }
    >
      <P3GamutView />
    </Suspense>
  ),
});

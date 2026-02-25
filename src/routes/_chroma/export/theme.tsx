import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const ThemeGeneratorView = lazy(
  () => import("@/components/views/theme-generator-view"),
);

export const Route = createFileRoute("/_chroma/export/theme")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-[12px] text-muted-foreground">Loading…</div>
      }
    >
      <ThemeGeneratorView />
    </Suspense>
  ),
});

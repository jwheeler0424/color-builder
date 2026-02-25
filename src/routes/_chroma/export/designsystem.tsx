import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const TokensView = lazy(() => import("@/components/views/tokens.view"));

export const Route = createFileRoute("/_chroma/export/designsystem")({
  component: () => (
    <Suspense
      fallback={
        <div className="p-8 text-[12px] text-muted-foreground">Loading…</div>
      }
    >
      <TokensView />
    </Suspense>
  ),
});

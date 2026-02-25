/**
 * tokens.view.tsx  — Phase 1 merge
 *
 * Combines: design-system-view + css-preview
 * Sub-tabs:  [Tokens] [CSS Preview]
 *
 * Both sub-components are large self-contained views. Rather than inlining
 * all their internals, we import and render them as lazy panels under a
 * shared tab bar.  This keeps this file thin and delegates to the existing
 * components — they continue to work normally if navigated to directly
 * via their old routes during the migration window.
 */

import { Suspense, lazy, useState } from "react";

// Lazily import the two sub-views so they don't affect each other's bundle
const DesignSystemView = lazy(() => import("./design-system-view"));
const CssPreview = lazy(() => import("./css-preview"));

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "tokens" | "preview";

function TabBar({
  active,
  setActive,
}: {
  active: Tab;
  setActive: (t: Tab) => void;
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {(
        [
          ["tokens", "Design Tokens"],
          ["preview", "CSS Preview"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`px-4 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase border-r border-border cursor-pointer transition-colors ${active === id ? "text-foreground border-b-2 border-b-primary bg-accent/30 -mb-px" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const fallback = (
  <div className="flex-1 flex items-center justify-center text-muted-foreground text-[12px]">
    Loading…
  </div>
);

// ─── Root export ──────────────────────────────────────────────────────────────

export default function TokensView() {
  const [activeTab, setActiveTab] = useState<Tab>("tokens");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h2 className="mb-1">Tokens & Preview</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      <Suspense fallback={fallback}>
        {activeTab === "tokens" && <DesignSystemView />}
        {activeTab === "preview" && <CssPreview />}
      </Suspense>
    </div>
  );
}

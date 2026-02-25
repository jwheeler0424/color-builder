/**
 * nav-desktop.tsx  — Phase 3 layout component
 *
 * The 4-section top navigation bar for the Desktop Studio layout (≥1024px).
 * Sections: CREATE · ANALYZE · BUILD · EXPORT
 *
 * Each section routes to its primary tool and lights up active for all tools
 * within that section (via prefix matching).
 *
 * Sections map to the 14 consolidated tools from Phase 1:
 *   CREATE  → /palette, /picker, /saved
 *   ANALYZE → /accessibility, /scoring, /oklch-scatter
 *   BUILD   → /mixer, /gradient, /extract
 *   EXPORT  → /scale, /designsystem, /theme, /utility, /brand
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { useCommandPalette } from "../views/command-palette";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../common/theme-toggle";
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from "../modals";

// ─── Section definitions ──────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  primary: string; // primary route — navigated to when section is clicked
  routes: string[]; // all routes that belong to this section (for active detection)
  icon: string;
}

export const SECTIONS: SectionDef[] = [
  {
    id: "create",
    label: "Create",
    icon: "✦",
    primary: "/palette",
    routes: ["/palette", "/picker", "/saved"],
  },
  {
    id: "analyze",
    label: "Analyze",
    icon: "◎",
    primary: "/analyze/accessibility",
    routes: [
      "/analyze/accessibility",
      "/analyze/scoring",
      "/analyze/visualize",
      "/analyze/brand",
    ],
  },
  {
    id: "build",
    label: "Build",
    icon: "⬡",
    primary: "/build/mixer",
    routes: ["/build/mixer", "/build/gradient", "/build/extract"],
  },
  {
    id: "export",
    label: "Export",
    icon: "↗",
    primary: "/export/scale",
    routes: [
      "/export/scale",
      "/export/designsystem",
      "/export/theme",
      "/export/utility",
    ],
  },
];

// ─── Section tools (for the dropdown sub-nav inside each section) ─────────────

export const SECTION_TOOLS: Record<string, { to: string; label: string }[]> = {
  create: [
    { to: "/palette", label: "Palette" },
    { to: "/picker", label: "Color Picker" },
    { to: "/saved", label: "Saved" },
  ],
  analyze: [
    { to: "/analyze/accessibility", label: "Accessibility" },
    { to: "/analyze/scoring", label: "Score & Compare" },
    { to: "/analyze/visualize", label: "Visualize" },
    { to: "/analyze/brand", label: "Brand" },
  ],
  build: [
    { to: "/build/mixer", label: "Mixer" },
    { to: "/build/gradient", label: "Gradients" },
    { to: "/build/extract", label: "Extract & Convert" },
  ],
  export: [
    { to: "/export/scale", label: "Scales" },
    { to: "/export/designsystem", label: "Tokens & Preview" },
    { to: "/export/theme", label: "Theme" },
    { to: "/export/utility", label: "Utility Colors" },
  ],
};

// ─── NavDesktop ───────────────────────────────────────────────────────────────

interface NavDesktopProps {
  /** Extra className — typically not needed */
  className?: string;
  /** Called when theme toggle is clicked */
  onThemeToggle?: () => void;
}

export function NavDesktop({ className, onThemeToggle }: NavDesktopProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpen: openPalette } = useCommandPalette();
  const { openModal, setSaveName } = useChromaStore();

  const activeSection = SECTIONS.find((s) =>
    s.routes.some((r) => pathname.startsWith(r)),
  );

  return (
    <header
      className={cn(
        "flex items-center h-12 px-4 border-b border-border bg-card shrink-0 gap-0",
        className,
      )}
    >
      {/* Brand */}
      <div className="font-display text-[15px] font-black tracking-tight text-foreground shrink-0 pr-5">
        Chroma
        <sup className="text-[9px] text-muted-foreground font-normal">v4</sup>
      </div>

      {/* 4 section links */}
      <nav
        className="flex flex-1 items-stretch h-full"
        aria-label="Main navigation"
      >
        {SECTIONS.map((section) => {
          const isActive = section.routes.some((r) => pathname.startsWith(r));
          return (
            <Link
              key={section.id}
              to={section.primary as Parameters<typeof Link>[0]["to"]}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 text-[11px] font-bold tracking-[.07em]",
                "uppercase border-b-2 transition-colors no-underline",
                isActive
                  ? "text-foreground border-b-primary"
                  : "text-muted-foreground border-b-transparent hover:text-foreground hover:border-b-border",
              )}
            >
              <span className="text-sm leading-none">{section.icon}</span>
              {section.label}
            </Link>
          );
        })}
      </nav>

      {/* Sub-tool pills (for active section) */}
      {activeSection && SECTION_TOOLS[activeSection.id] && (
        <div className="flex items-center gap-0.5 mx-3 border-l border-r border-border px-3 h-full">
          {SECTION_TOOLS[activeSection.id].map((tool) => {
            const isToolActive = pathname === tool.to;
            return (
              <Link
                key={tool.to}
                to={tool.to as Parameters<typeof Link>[0]["to"]}
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded text-[10px] font-mono",
                  "tracking-[.04em] whitespace-nowrap no-underline transition-colors",
                  isToolActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tool.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Right: ⌘K + actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search pill */}
        <button
          onClick={() => openPalette(true)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono",
            "tracking-[.04em] whitespace-nowrap transition-colors cursor-pointer",
            "text-muted-foreground border-border bg-muted hover:text-foreground hover:border-input",
          )}
          title="Search tools (⌘K)"
        >
          <span className="opacity-70">🔍</span>
          <span className="hidden lg:inline">Search</span>
          <kbd className="text-[8px] opacity-50 ml-0.5">⌘K</kbd>
        </button>

        {/* Action buttons */}
        <ThemeToggle />
        <ShareModal />
        <SaveModal />
        <ExportModal />
        <ShortcutsModal />
      </div>
    </header>
  );
}

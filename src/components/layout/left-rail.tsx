/**
 * left-rail.tsx  — Phase 3 layout component
 *
 * The collapsible left rail in the Desktop Studio layout.
 * Contains:
 *   - Brand + collapse toggle
 *   - GenerateControls (count, harmony, seeds, temperature)
 *   - Saved palettes shortcut
 *   - Generate FAB / button
 *
 * Collapse state persists in localStorage.
 * At 240px expanded, 48px collapsed (icon-only mode).
 */

import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { GenerateControls, GenerateFooter } from "./generate-controls";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "chroma:rail-collapsed";

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}
function saveCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, String(v));
  } catch {}
}

interface LeftRailProps {
  /** Called when a seed swatch is clicked for editing */
  onEditSeed?: (index: number) => void;
  className?: string;
}

export function LeftRail({ onEditSeed, className }: LeftRailProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const generate = useChromaStore((s) => s.generate);

  // Load persisted state after mount (avoids SSR mismatch)
  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      saveCollapsed(!v);
      return !v;
    });
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-card border-r border-border shrink-0",
        "transition-all duration-200 overflow-hidden",
        collapsed ? "w-12" : "w-60",
        className,
      )}
    >
      {/* ── Rail header ── */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0 h-10",
          collapsed ? "justify-center px-0" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <div className="font-display text-sm font-black tracking-tight text-foreground">
            Chroma
            <sup className="text-[9px] text-muted-foreground font-normal">
              v4
            </sup>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-7 h-7 flex items-center justify-center rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer bg-transparent text-sm shrink-0"
          title={collapsed ? "Expand rail" : "Collapse rail"}
          aria-label={collapsed ? "Expand rail" : "Collapse rail"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* ── Collapsed icon rail ── */}
      {collapsed && (
        <div className="flex flex-col items-center gap-1 py-3 flex-1">
          {/* Generate shortcut */}
          <button
            onClick={generate}
            className="w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer bg-transparent text-base"
            title="Generate (Space)"
          >
            ⟳
          </button>

          {/* Navigate to saved */}
          <Link
            to="/saved"
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded border text-sm no-underline transition-colors",
              pathname === "/saved"
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
            title="Saved palettes"
          >
            🗂
          </Link>
        </div>
      )}

      {/* ── Expanded controls ── */}
      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
            <GenerateControls onEditSeed={onEditSeed} />

            {/* Saved palettes link */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-semibold">
                Saved Palettes
              </p>
              <Link
                to="/saved"
                className={cn(
                  "inline-flex items-center gap-2 w-full px-2 py-1.5 rounded border text-[11px] font-mono",
                  "no-underline transition-colors",
                  pathname === "/saved"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-input",
                )}
              >
                <span>🗂</span> Saved & History
              </Link>
            </div>
          </div>

          <GenerateFooter />
        </>
      )}
    </aside>
  );
}

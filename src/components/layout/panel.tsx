/**
 * panel.tsx  — Phase 2 layout component
 *
 * Closeable right panel used by the Phase 3 Desktop Studio layout.
 * In Phase 2 it's a no-op wrapper; Phase 3 wires it to the 3-column shell.
 *
 * Props:
 *   open      — controlled visibility
 *   onClose   — called when X is clicked (parent sets open=false)
 *   title     — panel header title
 *   width     — px width (default 320)
 *   children  — panel body
 */

import React from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  width?: number;
  className?: string;
  children: React.ReactNode;
}

export function Panel({
  open,
  onClose,
  title,
  width = 320,
  className,
  children,
}: PanelProps) {
  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex flex-col bg-card border-l border-border overflow-hidden shrink-0",
        "transition-all duration-200",
        className,
      )}
      style={{ width }}
      aria-label={title ?? "Panel"}
    >
      {/* Header */}
      {(title || onClose) && (
        <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
          {title && (
            <span className="text-[10px] font-bold tracking-[.08em] uppercase text-muted-foreground">
              {title}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded",
                "text-muted-foreground hover:text-foreground hover:bg-accent",
                "transition-colors text-[14px] leading-none cursor-pointer",
              )}
              title="Close panel"
              aria-label="Close panel"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
        {children}
      </div>
    </aside>
  );
}

/**
 * PanelSection — consistent padding block inside a Panel.
 * Matches the Section/SectionLabel convention from palette-view.
 */
export function PanelSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-none">
      {children}
    </div>
  );
}

export function PanelSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-semibold">
      {children}
    </p>
  );
}

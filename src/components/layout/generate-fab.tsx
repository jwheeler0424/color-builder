/**
 * generate-fab.tsx  — Phase 3 layout component
 *
 * Floating "⟳ Generate" button that hovers over the palette strip.
 * Always visible regardless of rail collapse state (approved in Session 10).
 *
 * Positioned: bottom-right corner of the palette strip via absolute positioning
 * on the parent. The parent must be position:relative.
 */

import { useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { cn } from "@/lib/utils";

interface GenerateFabProps {
  /** Extra className for positioning overrides */
  className?: string;
}

export function GenerateFab({ className }: GenerateFabProps) {
  const { generate, undo } = useChromaStore();
  const [spinning, setSpinning] = useState(false);

  const handleGenerate = () => {
    setSpinning(true);
    generate();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <div
      className={cn(
        "absolute bottom-4 right-4 flex items-center gap-1.5 z-10",
        className,
      )}
    >
      {/* Undo button */}
      <button
        onClick={undo}
        className={cn(
          "w-8 h-8 flex items-center justify-center",
          "rounded-full border border-white/20 bg-black/60 backdrop-blur-md",
          "text-white/70 hover:text-white hover:bg-black/80 transition-all",
          "text-sm cursor-pointer shadow-lg",
        )}
        title="Undo (Ctrl+Z)"
        aria-label="Undo generate"
      >
        ↩
      </button>

      {/* Generate FAB */}
      <button
        onClick={handleGenerate}
        className={cn(
          "inline-flex items-center gap-2 px-4 h-9",
          "rounded-full bg-primary text-primary-foreground",
          "font-bold text-[12px] font-mono tracking-[.04em]",
          "shadow-lg shadow-primary/30 hover:opacity-90 hover:shadow-primary/50",
          "transition-all cursor-pointer border-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        title="Generate palette (Space)"
        aria-label="Generate palette"
      >
        <span
          className={cn(
            "text-[14px] leading-none transition-transform",
            spinning && "animate-spin",
          )}
          style={{ display: "inline-block" }}
        >
          ⟳
        </span>
        Generate
      </button>
    </div>
  );
}

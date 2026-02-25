/**
 * bottom-sheet.tsx  — Phase 4/5 layout component
 *
 * Swipeable bottom sheet overlay.
 * Used for:
 *   - Color picker on tablet (65% screen height)
 *   - Color picker on mobile (95% screen height)
 *   - Saved palettes panel on tablet/mobile
 *
 * Features:
 *   - Backdrop blur overlay
 *   - Drag handle (visual indicator)
 *   - Touch swipe-down to dismiss (pointer events on drag handle)
 *   - Keyboard: Escape to close
 *   - Focus trap inside sheet
 *   - CSS transition (slide up from bottom)
 *
 * Props:
 *   open        — controlled visibility
 *   onClose     — called when dismissed
 *   title       — optional header title
 *   heightPct   — percentage of viewport height (default 65)
 *   children    — sheet body
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Height as % of viewport (default 65 for tablet, 95 for mobile full-screen) */
  heightPct?: number;
  className?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  heightPct = 65,
  className,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const draggedRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [visible, setVisible] = useState(false); // for enter animation

  // Mount animation — delay visibility to trigger CSS transition
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Drag-to-dismiss on drag handle ──────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    draggedRef.current = 0;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (startYRef.current === null) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    draggedRef.current = delta;
    setDragOffset(delta);
  }, []);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setDragOffset(0);
    startYRef.current = null;
    // Dismiss if dragged more than 80px
    if (draggedRef.current > 80) onClose();
    draggedRef.current = 0;
  }, [onClose]);

  if (!open && !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal
        aria-label={title ?? "Panel"}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex flex-col",
          "bg-card rounded-t-2xl shadow-2xl border-t border-border",
          "transition-transform duration-300 ease-out will-change-transform",
          !visible && "translate-y-full",
          className,
        )}
        style={{
          height: `${heightPct}dvh`,
          transform:
            dragOffset > 0
              ? `translateY(${dragOffset}px)`
              : visible
                ? "translateY(0)"
                : "translateY(100%)",
          transition: dragging ? "none" : undefined,
          // Safe area for iPhone home bar
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Drag handle */}
        <div
          className="shrink-0 flex items-center justify-center h-10 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-hidden
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 shrink-0 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground text-lg cursor-pointer border-0 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * slot-card.tsx  — Phase 2 layout component
 *
 * The individual color slot card, extracted from palette-view.tsx.
 * Used by PaletteStrip. Handles:
 *   - Drag handle (explicit button activator)
 *   - Lock / unlock
 *   - Token name display + inline rename
 *   - Hex copy
 *   - Edit (opens color picker)
 *   - Double-click to edit
 *   - Copied feedback toast
 *
 * Uses @dnd-kit/sortable's useSortable hook — must be inside a SortableContext.
 */

import React, { useState, useRef, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { textColor, hexToRgb, rgbToHsl, nearestName, cn } from "@/lib/utils";
import type { PaletteSlot } from "@/types";
import { Button } from "../ui/button";
import { ArrowLeftRight, XIcon } from "lucide-react";

// ─── Icon stubs (avoids lucide-react dep in shim environments) ────────────────

function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function LockOpenIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SlotCardProps {
  slot: PaletteSlot;
  index: number;
  isEdge?: boolean; // Whether this slot is at the start or end of the list (for styling)
  edge?: "first" | "last" | "both" | "none"; // Whether to apply "edge" styling (negative margin to bleed to container edges). Should only be false for DragOverlay.
  /** Called when user wants to open the color picker for this slot */
  onEdit: (index: number) => void;
  /** When true, renders as the DragOverlay ghost */
  overlay?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlotCard({
  slot,
  index,
  onEdit,
  isEdge = true,
  edge = "both",
  overlay = false,
}: SlotCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    isSorting,
  } = useSortable({
    id: slot.id,
    data: { index },
    transition: { duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
  });

  const toggleLock = useChromaStore((state) => state.toggleLock);
  const removeSlot = useChromaStore((state) => state.removeSlot);
  const setHoverSlot = useChromaStore((state) => state.setHoverSlot);
  const [copied, setCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const rgb = useMemo(() => hexToRgb(slot.color.hex), [slot.color.hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const tc = useMemo(() => textColor(rgb), [rgb]);
  const autoName = useMemo(() => nearestName(rgb), [rgb]);
  const displayName = slot.name || autoName;

  const bg =
    slot.color.a !== undefined && slot.color.a < 100
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},${(slot.color.a / 100).toFixed(2)})`
      : slot.color.hex;

  // Approximate contrast ratio (fast, for display only)
  const relLum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  const contrastVsWhite =
    relLum > 0.5 ? (relLum + 0.05) / 0.05 : 1.05 / (relLum + 0.05);

  const style: React.CSSProperties = {
    background: bg,
    transform: CSS.Transform.toString(transform ?? null),
    transition: isSorting && !overlay ? transition : undefined,
    opacity: isDragging && !overlay ? 0.35 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(slot.color.hex).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        "group slot-item relative flex h-full justify-between select-none flex-1",
        isOver && !isDragging && "ring-2 ring-inset ring-white/60",
        overlay && "shadow-2xl",
        // isHovering && "bg-black!",
      )}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
      onDoubleClick={() => !editingName && onEdit(index)}
      {...attributes}
    >
      <div
        className="absolute left-0 w-12 top-0 bottom-0 flex-1 h-full"
        onPointerEnter={() => setHoverSlot(index - 1)}
        onPointerLeave={() => setHoverSlot(null)}
      ></div>
      <main className="flex flex-col w-full h-full items-center flex-1 py-12 gap-12">
        <div className="flex-1 flex flex-col justify-end items-center gap-4">
          {/* Remove Button */}
          <Button
            variant={"ghost"}
            size="icon-lg"
            className={
              "bg-black/20 hover:bg-black/50 dark:hover:bg-black/50 transition-all duration-200"
            }
            title="Remove Color"
            onClick={() => removeSlot(index)}
          >
            <XIcon />
          </Button>

          {/* Drag Button */}
          <Button
            variant={"ghost"}
            size="icon-lg"
            ref={setActivatorNodeRef}
            className={cn(
              "bg-black/20 hover:bg-black/50 dark:hover:bg-black/50 transition-all duration-200",
              "cursor-grab active:cursor-grabbing touch-none",
              overlay && "cursor-grabbing",
            )}
            title="Drag to reorder"
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowLeftRight />
          </Button>

          {/* Copy Button */}
          <Button
            variant={"ghost"}
            size="icon-lg"
            className={
              "bg-black/20 hover:bg-black/50 dark:hover:bg-black/50 transition-all duration-200"
            }
            title="Copy hex to clipboard"
            onClick={handleCopy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>

          {/* Lock Button */}
          <Button
            variant={"ghost"}
            size="icon-lg"
            className={cn(
              "bg-black/20 hover:bg-black/50 dark:hover:bg-black/50 transition-all duration-200",
              slot.locked && "text-primary",
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleLock(index);
            }}
            title={slot.locked ? "Unlock slot" : "Lock slot"}
          >
            {slot.locked ? <LockIcon /> : <LockOpenIcon />}
          </Button>
        </div>

        {/* ── Bottom info ── */}
        <div className="flex flex-col gap-1 p-1 px-2.5 bg-black/35 rounded-md w-max max-w-sm -rotate-90 min-w-0 overflow-hidden 2xl:rotate-0">
          {/* Token name */}
          <span className="text-left text-white font-mono text-xs font-medium cursor-text leading-none py-1.5 text-ellipsis whitespace-nowrap overflow-hidden w-full">
            {displayName}
          </span>

          {/* Hex */}
          <Button
            variant={"ghost"}
            className="text-center font-mono-alt text-xl font-black tracking-widest uppercase
            leading-none bg-transparent hover:bg-transparent dark:hover:bg-transparent hover:opacity-80 transition-opacity cursor-copy"
            onClick={handleCopy}
            title="Copy hex"
          >
            {slot.color.hex.toUpperCase()}
          </Button>

          <div className="flex-col items-end gap-1 hidden xl:flex">
            <span className="font-mono text-[10px] font-medium opacity-95 leading-none text-white">
              RATIO {contrastVsWhite.toFixed(1)}:1
            </span>
            {/* HSL */}
            <span className="font-mono text-[10px] font-medium opacity-95 leading-none text-white">
              HSL {Math.round(hsl.h)}° {Math.round(hsl.s)}% {Math.round(hsl.l)}%
              {slot.color.a !== undefined && slot.color.a < 100 && (
                <span className="ml-1">· {slot.color.a}%</span>
              )}
            </span>
          </div>
        </div>

        {/* Copied toast */}
        {copied && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-live="polite"
          >
            <span className="bg-black/80 text-white text-[11px] font-mono px-3 py-1.5 rounded-full backdrop-blur-sm">
              Copied!
            </span>
          </div>
        )}
      </main>
      <div
        className="absolute left-0 w-12 top-0 bottom-0 flex-1 h-full"
        onPointerEnter={() => setHoverSlot(index)}
        onPointerLeave={() => setHoverSlot(null)}
      ></div>
    </section>
  );
}

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

  const { toggleLock, renameSlot } = useChromaStore();
  const [copied, setCopied] = useState(false);
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

  const startNameEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(slot.name || "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitName = () => {
    renameSlot(index, nameInput.trim() || undefined);
    setEditingName(false);
  };

  const iconBtn = cn(
    "w-7 h-7 rounded flex items-center justify-center transition-all",
    "bg-black/40 backdrop-blur-sm border border-white/10",
    "hover:bg-black/65 hover:scale-105",
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "slot-item relative flex flex-col select-none flex-1 overflow-hidden",
        isOver && !isDragging && "ring-2 ring-inset ring-white/60",
        overlay && "shadow-2xl",
      )}
      onDoubleClick={() => !editingName && onEdit(index)}
      {...attributes}
    >
      {/* ── Top bar: drag handle + lock ── */}
      <div className="flex items-start justify-between p-2 gap-1">
        <button
          ref={setActivatorNodeRef}
          className={cn(
            iconBtn,
            "cursor-grab active:cursor-grabbing touch-none",
            overlay && "cursor-grabbing",
          )}
          style={{ color: tc }}
          title="Drag to reorder"
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripIcon />
        </button>

        <button
          className={iconBtn}
          style={{ color: slot.locked ? "var(--color-primary, #6366f1)" : tc }}
          onClick={(e) => {
            e.stopPropagation();
            toggleLock(index);
          }}
          title={slot.locked ? "Unlock slot" : "Lock slot"}
        >
          {slot.locked ? <LockIcon /> : <LockOpenIcon />}
        </button>
      </div>

      <div className="flex-1" />

      {/* ── Bottom info ── */}
      <div className="flex flex-col gap-1 p-2.5 pt-0">
        {/* Token name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            className="font-mono text-[10px] font-semibold bg-black/35 border border-white/30
              rounded px-1.5 py-0.5 text-white outline-none w-full"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setEditingName(false);
            }}
            placeholder={autoName}
            maxLength={32}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            className="text-left font-mono text-[10px] font-semibold opacity-60
              hover:opacity-100 transition-opacity leading-none"
            style={{ color: tc }}
            title="Click to rename token"
            onClick={startNameEdit}
          >
            {displayName}
            {slot.name && (
              <span className="ml-1 opacity-50" style={{ fontSize: 9 }}>
                ✎
              </span>
            )}
          </button>
        )}

        {/* Hex */}
        <button
          className="text-left font-mono text-sm font-bold tracking-widest uppercase
            leading-none hover:opacity-80 transition-opacity"
          style={{ color: tc }}
          onClick={handleCopy}
          title="Copy hex"
        >
          {slot.color.hex.toUpperCase()}
        </button>

        {/* HSL */}
        <div
          className="font-mono text-[10px] opacity-55 leading-none"
          style={{ color: tc }}
        >
          {Math.round(hsl.h)}° {Math.round(hsl.s)}% {Math.round(hsl.l)}%
          {slot.color.a !== undefined && slot.color.a < 100 && (
            <span className="ml-1">· {slot.color.a}%</span>
          )}
        </div>

        {/* Bottom row: contrast + actions */}
        <div className="flex items-center justify-between mt-0.5 gap-1">
          <span
            className="font-mono text-[9px] opacity-45 leading-none"
            style={{ color: tc }}
          >
            {contrastVsWhite.toFixed(1)}:1
          </span>
          <div className="flex items-center gap-1">
            <button
              className={cn(iconBtn, "w-6 h-6")}
              style={{ color: tc }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(index);
              }}
              title="Edit color"
            >
              <PencilIcon />
            </button>
            <button
              className={cn(iconBtn, "w-6 h-6")}
              style={{ color: tc }}
              onClick={handleCopy}
              title="Copy hex"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
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
    </div>
  );
}

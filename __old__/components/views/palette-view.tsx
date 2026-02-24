import React, { useState, useCallback, useRef, useMemo, useId } from "react";
import {
  GripVertical,
  Lock,
  LockOpen,
  Pencil,
  Copy,
  Check,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useChromaStore } from "@/hooks/use-chroma-store";
import { cn, textColor, hexToRgb, rgbToHsl, nearestName } from "@/lib/utils";
import type { PaletteSlot } from "@/types/chroma";
import { PalettePanel } from "../elements";

// ─── Sortable Slot ─────────────────────────────────────────────────────────────

interface SortableSlotProps {
  slot: PaletteSlot;
  index: number;
  onEdit: (i: number) => void;
  overlay?: boolean;
}

function SortableSlot({
  slot,
  index,
  onEdit,
  overlay = false,
}: SortableSlotProps) {
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

  // Approximate contrast ratio for display
  const relLuminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  const contrastVsWhite =
    relLuminance > 0.5
      ? (relLuminance + 0.05) / 0.05
      : 1.05 / (relLuminance + 0.05);

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
        "slot-item relative flex flex-col select-none grow h-full",
        isOver && !isDragging && "ring-2 ring-inset ring-white/60",
        overlay && "shadow-2xl",
      )}
      onDoubleClick={() => !editingName && onEdit(index)}
      {...attributes}
    >
      {/* ── Top bar: drag handle + lock ── */}
      <div className="flex items-start justify-between p-2 gap-1  text-black dark:text-white rounded">
        {/* Explicit drag handle button */}
        <button
          ref={setActivatorNodeRef}
          className={cn(
            iconBtn,
            "cursor-grab active:cursor-grabbing touch-none",
            overlay && "cursor-grabbing",
          )}
          title="Drag to reorder"
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        {/* Lock */}
        <button
          className={iconBtn}
          style={{
            color: slot.locked ? "var(--color-primary, #6366f1)" : undefined,
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleLock(index);
          }}
          title={slot.locked ? "Unlock slot" : "Lock slot"}
        >
          {slot.locked ? <Lock size={14} /> : <LockOpen size={14} />}
        </button>
      </div>

      <div className="grow" />

      {/* ── Bottom info ── */}
      <div className="flex flex-col shrink-0 gap-1 p-2.5">
        <div className="flex flex-col shrink-0 gap-1 p-2.5 bg-background/50 text-black dark:text-white rounded">
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
              className="text-left font-mono text-[10px] font-medium opacity-65
              hover:opacity-100 transition-opacity leading-none"
              title="Click to rename token"
              onClick={startNameEdit}
            >
              {displayName}
              {slot.name && (
                <Pencil size={9} className="inline ml-1 opacity-50" />
              )}
            </button>
          )}

          {/* Hex */}
          <button
            className="text-left font-mono text-sm font-bold tracking-widest uppercase
            leading-none hover:opacity-80 transition-opacity"
            onClick={handleCopy}
            title="Copy hex"
          >
            {slot.color.hex.toUpperCase()}
          </button>

          {/* HSL */}
          <div className="font-mono text-[10px] opacity-65 leading-none">
            {Math.round(hsl.h)}° {Math.round(hsl.s)}% {Math.round(hsl.l)}%
            {slot.color.a !== undefined && slot.color.a < 100 && (
              <span className="ml-1">· {slot.color.a}%</span>
            )}
          </div>

          {/* Bottom row: contrast + edit + copy */}
          <div className="flex items-center justify-between mt-0.5 gap-1">
            <span className="font-mono text-[10px] opacity-65 leading-none">
              {contrastVsWhite.toFixed(1)}:1
            </span>
            <div className="flex items-center gap-1">
              <button
                className={cn(iconBtn, "w-6 h-6")}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(index);
                }}
                title="Edit color"
              >
                <Pencil size={13} />
              </button>
              <button
                className={cn(iconBtn, "w-6 h-6")}
                onClick={handleCopy}
                title="Copy hex"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
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

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PaletteView() {
  const { slots, reorderSlots } = useChromaStore();

  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  // Stable ID for DndContext — prevents SSR/client aria-describedby mismatch
  const dndId = useId();

  // ── Sensors ────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveSlotId(String(active.id));
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveSlotId(null);
      if (!over || active.id === over.id) return;
      const oldIndex = slots.findIndex((s) => s.id === active.id);
      const newIndex = slots.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) reorderSlots(oldIndex, newIndex);
    },
    [slots, reorderSlots],
  );

  const handleDragCancel = useCallback(() => setActiveSlotId(null), []);

  const slotIds = useMemo(() => slots.map((s) => s.id), [slots]);
  const activeSlot = activeSlotId
    ? (slots.find((s) => s.id === activeSlotId) ?? null)
    : null;
  const activeSlotIndex = activeSlot ? slots.indexOf(activeSlot) : -1;

  return (
    <div className="flex h-full w-full grow">
      {/* ── Sortable color strip ── */}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={slotIds}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex h-full w-full grow">
            {slots.map((slot, i) => (
              <SortableSlot
                key={slot.id}
                slot={slot}
                index={i}
                onEdit={setEditingSlot}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            duration: 180,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {activeSlot ? (
            <SortableSlot
              slot={activeSlot}
              index={activeSlotIndex}
              onEdit={() => {}}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <PalettePanel />
    </div>
  );
}

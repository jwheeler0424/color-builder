/**
 * palette-strip.tsx  — Phase 2 layout component
 *
 * The horizontal sortable color strip — always visible canvas of the palette.
 * Extracted from palette-view.tsx so it can be reused in:
 *   - Phase 2: current layout (side-by-side with sidebar)
 *   - Phase 3: Desktop Studio (center column, full height)
 *   - Phase 4: Tablet layout (horizontal strip, ~140px tall)
 *   - Phase 5: Mobile layout (hero strip, 44% viewport height)
 *
 * Handles all DnD setup (DndContext + SortableContext + DragOverlay).
 * Calls onEditSlot(index) when a slot is double-clicked or edit button pressed.
 */

import { useState, useCallback, useMemo, useId } from "react";
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { SlotCard } from "./slot-card";
import { cn } from "@/lib/utils";

interface PaletteStripProps {
  /** Called when a slot's edit button is pressed or double-clicked */
  onEditSlot: (index: number) => void;
  /** Extra classes on the outer container */
  className?: string;
}

export function PaletteStrip({ onEditSlot, className }: PaletteStripProps) {
  const { slots, reorderSlots } = useChromaStore();
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  // Stable ID so SSR/client aria-describedby always matches
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={slotIds} strategy={horizontalListSortingStrategy}>
        <div className={cn("flex flex-1 overflow-hidden", className)}>
          {slots.map((slot, i) => (
            <SlotCard key={slot.id} slot={slot} index={i} onEdit={onEditSlot} />
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
          <SlotCard
            slot={activeSlot}
            index={activeSlotIndex}
            onEdit={() => {}}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

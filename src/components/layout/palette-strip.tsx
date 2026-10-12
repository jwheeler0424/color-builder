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
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IconPlus as PlusIcon } from '@tabler/icons-react';
import { Fragment, useState, useCallback, useLayoutEffect, useMemo, useId, useRef } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  StripLayoutContext,
  useStackedPalette,
  type StripLayout,
} from '@/hooks/use-stacked-palette';
import { MAX_SLOTS } from '@/lib/constants/chroma';
import { cn } from '@/lib/utils';

import { SlotButton } from './slot-button';
import { SlotCard } from './slot-card';

// Narrower columns can no longer hold the buttons and rotated info, so swatches become rows
const MIN_COLUMN_WIDTH = 72;

interface PaletteStripProps {
  /** Called when a slot's edit button is pressed or double-clicked */
  onEditSlot: (index: number) => void;
  /** Extra classes on the outer container */
  className?: string;
}

export function PaletteStrip({ onEditSlot, className }: PaletteStripProps) {
  const { slots, reorderSlots, insertSlot } = useChromaStore();
  const tallRows = useStackedPalette();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || tallRows) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [tallRows]);

  const crowded = !tallRows && width > 0 && width / slots.length < MIN_COLUMN_WIDTH;
  const layout: StripLayout = tallRows || crowded ? 'rows' : 'columns';
  const stacked = layout === 'rows';
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
  const activeSlot = activeSlotId ? (slots.find((s) => s.id === activeSlotId) ?? null) : null;
  const activeSlotIndex = activeSlot ? slots.indexOf(activeSlot) : -1;

  return (
    <StripLayoutContext.Provider value={layout}>
      <div
        ref={wrapRef}
        className={cn(
          tallRows
            ? 'contents'
            : crowded
              ? 'flex h-full w-full flex-col overflow-y-auto'
              : 'flex h-full w-full',
          className,
        )}>
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}>
          <SortableContext
            items={slotIds}
            strategy={stacked ? verticalListSortingStrategy : horizontalListSortingStrategy}>
            {slots.map((slot, i) => (
              <Fragment key={slot.id}>
                {!stacked && slots.length < MAX_SLOTS && i === 0 && (
                  <SlotButton key={`button-${slot.id}`} index={-1} adjust={true} />
                )}
                <SlotCard key={slot.id} slot={slot} index={i} onEdit={onEditSlot} />
                {!stacked && slots.length < MAX_SLOTS && (
                  <SlotButton
                    key={`button-after-${slot.id}`}
                    index={i}
                    adjust={i === slots.length - 1}
                  />
                )}
              </Fragment>
            ))}
            {stacked && slots.length < MAX_SLOTS && (
              <button
                type='button'
                onClick={() => insertSlot(slots.length)}
                className='flex h-14 w-full shrink-0 cursor-pointer items-center justify-center gap-2 border-t border-dashed border-border bg-card text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground'>
                <PlusIcon className='size-4' />
                Add a color
              </button>
            )}
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              duration: 180,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            }}>
            {activeSlot ? (
              <SlotCard slot={activeSlot} index={activeSlotIndex} onEdit={() => {}} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </StripLayoutContext.Provider>
  );
}

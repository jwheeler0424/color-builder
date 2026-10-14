// ─── Props ────────────────────────────────────────────────────────────────────

import { IconPlus as PlusIcon } from '@tabler/icons-react';
import { useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils/tw';

import { Button } from '../ui/button';
import { paletteAddIconClassName, paletteAddSlotButtonClassName } from './palette-add-button';

export interface SlotButtonProps {
  index: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlotButton({ index, className }: SlotButtonProps) {
  const hoverSlot = useChromaStore((state) => state.hoverSlot);
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringSlot = hoverSlot === index;
  const insertAt = index + 1;
  const { insertSlot } = useChromaStore();

  return (
    <aside
      className={cn(
        'relative z-10 flex h-full w-0 shrink-0 flex-col items-center justify-center',
        className,
      )}>
      <Tooltip>
        <TooltipContent
          onMouseOver={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}>
          Add a color
        </TooltipContent>
        <TooltipTrigger
          onMouseOver={() => setIsHovering(true)}
          render={
            <Button
              variant='secondary'
              size='icon-lg'
              className={cn(
                paletteAddSlotButtonClassName,
                'top-1/2 z-20 size-12 -translate-y-1/2 scale-70 rounded-full opacity-0',
                (isHovering || isHoveringSlot) && 'scale-100 opacity-100',
              )}
              onPointerEnter={() => setIsHovering(true)}
              onPointerLeave={() => setIsHovering(false)}
              onClick={() => insertSlot(insertAt)}>
              <PlusIcon className={cn('size-6', paletteAddIconClassName)} aria-hidden='true' />
            </Button>
          }
        />
      </Tooltip>
    </aside>
  );
}

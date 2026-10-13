// ─── Props ────────────────────────────────────────────────────────────────────

import { IconPlus as PlusIcon } from '@tabler/icons-react';
import { useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils/tw';

import { Button } from '../ui/button';

export interface SlotButtonProps {
  index: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlotButton({ index }: SlotButtonProps) {
  const hoverSlot = useChromaStore((state) => state.hoverSlot);
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringSlot = hoverSlot === index;
  const insertAt = index + 1;
  const { insertSlot } = useChromaStore();

  return (
    <aside
      className={cn('relative z-10 flex h-full w-0 shrink-0 flex-col items-center justify-center')}>
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
                'palette-add-button palette-add-button--slot absolute top-1/2 z-20 size-12 -translate-y-1/2 rounded-full',
                'scale-70 opacity-0',
                'transition-all duration-200 ease-in-out',
                (isHovering || isHoveringSlot) && 'scale-100 opacity-100',
              )}
              onPointerEnter={() => setIsHovering(true)}
              onPointerLeave={() => setIsHovering(false)}
              onClick={() => insertSlot(insertAt)}>
              <PlusIcon className='palette-add-icon size-6' aria-hidden='true' />
            </Button>
          }
        />
      </Tooltip>
    </aside>
  );
}

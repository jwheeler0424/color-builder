/**
 * generate-fab.tsx  — Phase 3 layout component
 *
 * Floating Generate button that hovers over the palette strip.
 * Always visible regardless of rail collapse state (approved in Session 10).
 *
 * Positioned: bottom-right corner of the palette strip via absolute positioning
 * on the parent. The parent must be position:relative.
 */

import { IconArrowBackUp, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils';

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
    <div className={cn('absolute right-4 bottom-4 z-10 flex items-center gap-1.5', className)}>
      {/* Undo button */}
      <button
        onClick={undo}
        className={cn(
          'flex h-8 w-8 items-center justify-center',
          'rounded-full border border-white/20 bg-black/60 backdrop-blur-md',
          'text-white/70 transition-all hover:bg-black/80 hover:text-white',
          'cursor-pointer text-sm shadow-lg',
        )}
        title='Undo (Ctrl+Z)'
        aria-label='Undo generate'>
        <IconArrowBackUp className='size-4' aria-hidden='true' />
      </button>

      {/* Generate FAB */}
      <button
        onClick={handleGenerate}
        className={cn(
          'inline-flex h-9 items-center gap-2 px-4',
          'rounded-full bg-primary text-primary-foreground',
          'font-mono text-xs font-bold tracking-[.04em]',
          'shadow-lg shadow-primary/30 hover:opacity-90 hover:shadow-primary/50',
          'cursor-pointer border-0 transition-all',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
        title='Generate palette (Space)'
        aria-label='Generate palette'>
        <IconRefresh
          className={cn('size-4 transition-transform', spinning && 'animate-spin')}
          aria-hidden='true'
        />
        Generate
      </button>
    </div>
  );
}

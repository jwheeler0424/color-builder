import { useChromaStore } from '@/hooks/use-chroma-store';

import { PaletteStudioPanel } from '../views/palette-view';
import { GenerateControlsAccordion } from './generate-controls-accordion';
import { PaletteStripHorizontal } from './palette-strip-horizontal';

/** Tappable palette summary shown above tool pages on tablet/mobile */
export function PaletteBar({ onOpen }: { onOpen: () => void }) {
  const slots = useChromaStore((s) => s.slots);

  return (
    <div className='shrink-0 border-b border-border bg-card px-4 py-3'>
      <button
        type='button'
        onClick={onOpen}
        className='flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0'
        aria-label={`Open palette and controls (${slots.length} colors)`}>
        <span className='flex h-8 flex-1 gap-0.5 overflow-hidden rounded-md'>
          {slots.map((s) => (
            <span key={s.id} className='flex-1' style={{ background: s.color.hex }} />
          ))}
        </span>
        <span className='shrink-0 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
          Palette ›
        </span>
      </button>
    </div>
  );
}

/** Palette summary, swatches and generate controls for the tablet/mobile sheet */
export function PaletteSheetBody({
  onEditSlot,
  showFooter,
}: {
  onEditSlot: (index: number) => void;
  showFooter: boolean;
}) {
  return (
    <div className='flex-1 scrollbar-thin overflow-y-auto'>
      <PaletteStudioPanel onEditSlot={onEditSlot} />
      <PaletteStripHorizontal onEditSlot={onEditSlot} height={140} slotWidth={100} />
      <GenerateControlsAccordion onEditSeed={onEditSlot} showFooter={showFooter} />
    </div>
  );
}

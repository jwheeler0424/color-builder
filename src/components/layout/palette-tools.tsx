import { useChromaStore } from '@/hooks/use-chroma-store';
import { HARMONIES } from '@/lib/constants/chroma';
import { cn } from '@/lib/utils';

import ColorPickerView from '../views/color-picker-view';
import { GenerateControls, GenerateFooter } from './generate-controls';

export type PaletteToolTab = 'generate' | 'themes' | 'picker';

const TABS: { id: PaletteToolTab; label: string }[] = [
  { id: 'generate', label: 'Generate' },
  { id: 'themes', label: 'Themes' },
  { id: 'picker', label: 'Picker' },
];

interface PaletteToolsProps {
  tab: PaletteToolTab;
  onTabChange: (tab: PaletteToolTab) => void;
  /** Called when a swatch in the summary is clicked */
  onSelectSlot: (index: number) => void;
}

/** The current palette at a glance; the one copy shown on every route */
function PaletteSummary({ onSelect }: { onSelect: (index: number) => void }) {
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const harmony = HARMONIES.find((h) => h.id === mode)?.label ?? mode;
  const locked = slots.filter((s) => s.locked).length;

  return (
    <div className='mx-1 pt-1 pb-4'>
      <div className='mb-2 flex items-baseline justify-between gap-2'>
        <p className='text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
          Palette
        </p>
        <p className='truncate text-[11px] text-muted-foreground'>
          {slots.length} colors · {harmony}
          {locked > 0 && ` · ${locked} locked`}
        </p>
      </div>
      <div className='flex h-9 gap-0.5 overflow-hidden rounded-md'>
        {slots.map((s, i) => (
          <button
            key={s.id}
            type='button'
            onClick={() => onSelect(i)}
            className='relative flex-1 cursor-pointer border-0 p-0'
            style={{ background: s.color.css ?? s.color.hex }}
            title={`Edit ${s.color.hex.toUpperCase()}`}
            aria-label={`Color ${i + 1}, ${s.color.hex.toUpperCase()}${s.locked ? ', locked' : ''}`}>
            {s.locked && (
              <span className='absolute inset-x-0 bottom-0.5 mx-auto size-1.5 rounded-full bg-white/80 shadow' />
            )}
          </button>
        ))}
      </div>
      <p className='mt-2 text-[10.5px] leading-relaxed text-muted-foreground'>
        Click a color to edit it. Drag to reorder, lock to keep it when generating.
      </p>
    </div>
  );
}

/** Side panel: palette summary, one tab per tool group, Generate and Undo pinned below */
export function PaletteTools({ tab, onTabChange, onSelectSlot }: PaletteToolsProps) {
  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-gutter:stable_both-edges] overflow-y-auto'>
        <PaletteSummary onSelect={onSelectSlot} />

        <div className='sticky top-0 z-10 bg-background'>
          <div
            role='tablist'
            aria-label='Palette tools'
            className='mx-1 flex border-b border-border'>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                id={`palette-tab-${id}`}
                role='tab'
                aria-selected={tab === id}
                aria-controls='palette-tabpanel'
                onClick={() => onTabChange(id)}
                className={cn(
                  'flex-1 cursor-pointer border-0 px-2.5 py-2.5 text-[11px] font-bold tracking-[.06em] uppercase transition-colors',
                  tab === id
                    ? '-mb-px border-b-2 border-b-primary bg-accent/30 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div id='palette-tabpanel' role='tabpanel' aria-labelledby={`palette-tab-${tab}`}>
          {tab === 'picker' ? (
            <ColorPickerView showPalette={false} />
          ) : (
            <GenerateControls section={tab} />
          )}
        </div>
      </div>
      <GenerateFooter />
    </div>
  );
}

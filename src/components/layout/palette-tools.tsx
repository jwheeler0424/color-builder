import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import ColorPickerView from '../views/color-picker-view';
import { GenerateControls, GenerateFooter, type GenerateSection } from './generate-controls';

export type PaletteToolTab = Exclude<GenerateSection, 'preview'> | 'picker';

const TABS: { id: PaletteToolTab; label: string }[] = [
  { id: 'colors', label: 'Colors' },
  { id: 'harmony', label: 'Harmony' },
  { id: 'themes', label: 'Themes' },
  { id: 'picker', label: 'Picker' },
];

interface PaletteToolsProps {
  tab: PaletteToolTab;
  onTabChange: (tab: PaletteToolTab) => void;
  /** Palette summary pinned above the tabs */
  top: ReactNode;
}

/** Side-panel palette tools: summary on top, one tab per tool group, Generate pinned below */
export function PaletteTools({ tab, onTabChange, top }: PaletteToolsProps) {
  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto'>
        <div className='pb-3'>{top}</div>

        <div className='sticky top-0 z-10 overflow-x-auto bg-background'>
          <div
            role='tablist'
            aria-label='Palette tools'
            className='flex w-full min-w-max border-b border-border'>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                id={`palette-tab-${id}`}
                role='tab'
                aria-selected={tab === id}
                aria-controls='palette-tabpanel'
                onClick={() => onTabChange(id)}
                className={cn(
                  'flex-1 cursor-pointer border-r border-border px-2.5 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase transition-colors last:border-r-0',
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

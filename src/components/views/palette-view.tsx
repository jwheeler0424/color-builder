/**
 * palette-view.tsx  — Phase 2/3 refactored
 *
 * The /palette route component. Adapts based on shell context:
 *
 *   Desktop (StudioShell):
 *     - Strip + controls already visible in shell columns
 *     - Renders PaletteStudioPanel (quick actions) in the right panel
 *
 *   Tablet (TabletShell) / Mobile (MobileShell):
 *     - CREATE section bypasses <Outlet> entirely — this component not rendered
 *
 *   Standalone (no shell / direct embed):
 *     - Renders full layout: PaletteStrip + sidebar controls
 */

import { IconArrowBackUp, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { useShell } from '@/providers/shell.provider';

import { GenerateControls, GenerateFooter } from '../layout/generate-controls';
import { PaletteStrip } from '../layout/palette-strip';

// ─── Standalone full layout ───────────────────────────────────────────────────

function StandalonePaletteView() {
  const [, setEditingSlot] = useState<number | null>(null);

  return (
    <div className='flex flex-1 overflow-hidden'>
      <PaletteStrip onEditSlot={setEditingSlot} />
      <aside className='flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-border bg-card'>
        <div className='flex-1 scrollbar-thin overflow-y-auto'>
          <GenerateControls onEditSeed={setEditingSlot} />
        </div>
        <GenerateFooter />
      </aside>
    </div>
  );
}

// ─── Studio panel ────────────────────────────────────────────────────────────────────
// Palette summary + Generate/Undo for the tablet and mobile palette sheet.

export function PaletteStudioPanel({ onEditSlot }: { onEditSlot?: (index: number) => void }) {
  const { generate, undo, slots } = useChromaStore();

  return (
    <div className='tool-panel-space tool-panel-stack flex flex-col'>
      <div>
        <p className='mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
          Palette
        </p>
        <p className='text-[11px] leading-relaxed text-muted-foreground'>
          {slots.length} colors · drag slots to reorder, lock to protect, double-click to edit
          color.
        </p>
      </div>

      {slots.length > 0 && (
        <div className='flex h-8 gap-0.5 overflow-hidden rounded-md'>
          {slots.map((s, i) =>
            onEditSlot ? (
              <button
                key={s.id}
                type='button'
                onClick={() => onEditSlot(i)}
                className='flex-1 cursor-pointer border-0 p-0'
                style={{ background: s.color.hex }}
                title={`Edit ${s.color.hex.toUpperCase()}`}
                aria-label={`Edit color ${i + 1}, ${s.color.hex.toUpperCase()}${s.locked ? ', locked' : ''}`}
              />
            ) : (
              <div key={s.id} className='flex-1' style={{ background: s.color.hex }} />
            ),
          )}
        </div>
      )}

      <div className='flex gap-2'>
        <button
          onClick={() => undo()}
          aria-label='Undo last generate'
          className='h-10 cursor-pointer rounded-md border border-border bg-secondary px-4 font-mono text-[11px] text-secondary-foreground transition-colors hover:border-input'>
          <IconArrowBackUp className='mr-1.5 inline size-4' aria-hidden='true' />
          Undo
        </button>
        <button
          onClick={() => generate()}
          className='h-10 flex-1 cursor-pointer rounded-md border-0 bg-primary text-[12px] font-bold text-primary-foreground transition-opacity hover:opacity-90'>
          <IconRefresh className='mr-1.5 inline size-4' aria-hidden='true' />
          Generate
        </button>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PaletteView() {
  const shell = useShell();

  // Inside any shell, the palette strip and controls are already mounted
  // by the shell layout — render the quick-action panel variant instead
  if (shell === 'studio') return <PaletteStudioPanel />;

  // Tablet/mobile: CREATE section bypasses <Outlet>, so this component
  // is only rendered for non-CREATE routes — render nothing meaningful
  if (shell === 'tablet' || shell === 'mobile') return null;

  // No shell — standalone/legacy embed: full layout
  return <StandalonePaletteView />;
}

export default PaletteView;

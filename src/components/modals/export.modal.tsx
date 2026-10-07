import { ExternalLinkIcon } from 'lucide-react';
import { useState, useMemo } from 'react';

import type { ExportTab } from '@/types';

import {
  buildColorStoryHtml,
  buildFigmaTokens,
  buildTailwindV3,
  deriveThemeTokens,
  formatColor,
  generateSvgSwatch,
  parseColor,
  semanticSlotNames,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';
import { useChromaStore } from '@/stores/chroma.store';

import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

// ─── Export Modal ─────────────────────────────────────────────────────────────

const EXPORT_TABS: { id: ExportTab; label: string }[] = [
  { id: 'hex', label: 'HEX' },
  { id: 'css', label: 'CSS' },
  { id: 'array', label: 'JS Array' },
  { id: 'scss', label: 'SCSS' },
  { id: 'figma', label: 'Figma' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'svg', label: 'SVG' },
];

export function ExportModal() {
  // Include alpha bytes in hex when a slot has transparency (#RRGGBBAA format)
  const modal = useChromaStore((s) => s.modal);
  const slots = useChromaStore((s) => s.slots);
  const utilityColors = useChromaStore((s) => s.utilityColors);
  const exportTab = useChromaStore((s) => s.exportTab);
  const setExportTab = useChromaStore((s) => s.setExportTab);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const palette = useMemo(
    () => slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex)),
    [slots],
  );
  const hexes = useMemo(() => palette.map((color) => formatColor(color, 'hex')), [palette]);

  const [copied, setCopied] = useState(false);

  const tokens = useMemo(() => deriveThemeTokens(palette, utilityColors), [palette, utilityColors]);

  const svgContent = useMemo(
    () =>
      exportTab === 'svg'
        ? generateSvgSwatch(slots, {
            title: 'Palette',
            names: slots.map(
              (slot, index) =>
                slot.name || lookupColorName(palette[index]!, formatColor(palette[index]!, 'hex')),
            ),
          })
        : '',
    [exportTab, slots, palette],
  );

  const content = useMemo((): string => {
    switch (exportTab) {
      case 'hex':
        return hexes.join('\n');
      case 'css': {
        const cssVars = slots
          .map((s, i) => {
            const name = s.name || `color-${i + 1}`;
            const val = formatColor(palette[i]!, 'rgb');
            return `  --${name}: ${val};`;
          })
          .join('\n');
        return `:root {\n${cssVars}\n}`;
      }
      case 'array':
        return `const palette = [\n${hexes.map((h) => `  '${h}'`).join(',\n')}\n];`;
      case 'scss':
        return slots.map((s, i) => `$${s.name || `color-${i + 1}`}: ${hexes[i]};`).join('\n');
      case 'figma':
        return buildFigmaTokens(tokens, utilityColors);
      case 'tailwind':
        return buildTailwindV3(tokens);
      case 'svg':
        return svgContent;
      default:
        return '';
    }
  }, [exportTab, hexes, slots, palette, tokens, utilityColors, svgContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'palette.svg';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadStory = () => {
    const names = semanticSlotNames(palette);
    const html = buildColorStoryHtml(palette, useChromaStore.getState().mode, utilityColors, names);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-story.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={modal === 'export'} onOpenChange={(open) => !open && closeModal()}>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon-lg'
            title='Export'
            onClick={() => openModal('export')}
            className='text-muted-foreground'>
            <ExternalLinkIcon className='size-5' />
          </Button>
        }
      />
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Export Palette</DialogTitle>
        </DialogHeader>
        {/* Tab bar */}
        <div className='flex flex-wrap gap-1'>
          {EXPORT_TABS.map(({ id, label }) => (
            <Button
              key={id}
              variant={exportTab === id ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setExportTab(id)}>
              {label}
            </Button>
          ))}
        </div>

        {/* SVG preview */}
        {exportTab === 'svg' ? (
          <div
            className='w-full overflow-auto rounded border border-border bg-muted'
            style={{ maxHeight: 220 }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <textarea
            readOnly
            value={content}
            rows={10}
            onFocus={(e) => e.target.select()}
            className='w-full resize-none rounded border border-border bg-muted px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground transition-colors outline-none focus:border-ring'
          />
        )}

        {/* Palette preview strip */}
        <div className='flex h-5 gap-px overflow-hidden rounded'>
          {slots.map((s) => (
            <div key={s.id} className='flex-1' style={{ background: s.color.hex }} />
          ))}
        </div>
        <DialogFooter>
          {exportTab === 'svg' ? (
            <Button variant='ghost' onClick={handleDownloadSvg}>
              ↓ Download SVG
            </Button>
          ) : (
            <Button variant='ghost' onClick={downloadStory}>
              ↓ Color Story
            </Button>
          )}
          <DialogClose render={<Button variant='ghost'>Close</Button>} />
          <Button variant='default' onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

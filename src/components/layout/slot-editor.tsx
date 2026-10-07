import { CheckIcon, CopyIcon, LockIcon, LockOpenIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { hexToStop } from '@/lib/engine/browser';
import { cn } from '@/lib/utils';

import { InlineColorPicker } from '../common/inline-color-picker';
import { Button } from '../ui/button';

/** Lock / copy / remove for one slot — the SlotCard actions, usable outside the strip */
export function SlotActions({ index, onRemoved }: { index: number; onRemoved: () => void }) {
  const slot = useChromaStore((s) => s.slots[index]);
  const toggleLock = useChromaStore((s) => s.toggleLock);
  const removeSlot = useChromaStore((s) => s.removeSlot);
  const [copied, setCopied] = useState(false);

  if (!slot) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(slot.color.hex).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='ghost'
        size='icon-lg'
        className={cn(slot.locked && 'text-primary')}
        onClick={() => toggleLock(index)}
        title={slot.locked ? 'Unlock slot' : 'Lock slot'}
        aria-label={slot.locked ? 'Unlock slot' : 'Lock slot'}
        aria-pressed={slot.locked}>
        {slot.locked ? <LockIcon /> : <LockOpenIcon />}
      </Button>
      <Button
        variant='ghost'
        size='icon-lg'
        onClick={handleCopy}
        title='Copy hex to clipboard'
        aria-label={copied ? 'Copied' : 'Copy hex to clipboard'}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
      <Button
        variant='ghost'
        size='icon-lg'
        onClick={() => {
          removeSlot(index);
          onRemoved();
        }}
        title='Remove color'
        aria-label='Remove color'>
        <Trash2Icon />
      </Button>
    </div>
  );
}

/** Slot color editor for the desktop side panel */
export function SlotEditor({ index, onClose }: { index: number; onClose: () => void }) {
  const slot = useChromaStore((s) => s.slots[index]);
  const editSlotColor = useChromaStore((s) => s.editSlotColor);

  if (!slot) return null;

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5'>
        <button
          onClick={onClose}
          className='inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground'>
          ← Back
        </button>
        <span className='flex-1 text-[11px] font-bold text-foreground'>
          Slot {index + 1} — Edit Color
        </span>
        <SlotActions index={index} onRemoved={onClose} />
      </div>
      <div className='flex-1 [scrollbar-width:thin] overflow-auto p-4'>
        <InlineColorPicker
          key={slot.id}
          initialHex={slot.color.hex}
          title={`Slot ${index + 1}`}
          onApply={(hex) => {
            editSlotColor(index, hexToStop(hex));
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

import { IconHeart as HeartIcon } from '@tabler/icons-react';

import { savePalette } from '@/lib/utils';
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

// ─── Save Modal ───────────────────────────────────────────────────────────────

export function SaveModal() {
  const modal = useChromaStore((s) => s.modal);
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const saveName = useChromaStore((s) => s.saveName);
  const setSaveName = useChromaStore((s) => s.setSaveName);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const hexes = slots.map((s) => s.color.hex);

  const handleSave = () => {
    savePalette(saveName.trim() || 'Unnamed', hexes, mode);
    closeModal();
  };

  return (
    <Dialog open={modal === 'save'} onOpenChange={(open) => !open && closeModal()}>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon-lg'
            onClick={() => {
              setSaveName('');
              openModal('save');
            }}
            title='Save palette'
            className='text-muted-foreground'>
            <HeartIcon className='size-5' />
          </Button>
        }
      />
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Save Palette</DialogTitle>
        </DialogHeader>
        <div className='flex h-9 gap-px overflow-hidden rounded'>
          {hexes.map((h, i) => (
            <div key={`${h}-${i}`} className='flex-1' style={{ background: h }} />
          ))}
        </div>

        <input
          className='w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs tracking-[.06em] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-ring'
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder='Name your palette…'
          maxLength={40}
          autoFocus
          autoComplete='off'
        />
        <DialogFooter>
          <DialogClose render={<Button variant='ghost'>Cancel</Button>} />
          <Button variant='default' onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

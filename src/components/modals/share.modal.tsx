import { IconCheck, IconShare as ShareIcon } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { encodeUrl } from '@/lib/utils';
import { useChromaStore } from '@/stores/chroma.store';

import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

// ─── Share Modal ──────────────────────────────────────────────────────────────

export function ShareModal() {
  const modal = useChromaStore((s) => s.modal);
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const hexes = slots.map((s) => s.color.hex);
    return encodeUrl(hexes, mode);
  }, [slots, mode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Dialog open={modal === 'share'} onOpenChange={(open) => !open && closeModal()}>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon-lg'
            title='Share URL'
            onClick={() => openModal('share')}
            className='text-md text-muted-foreground'>
            <ShareIcon className='size-5' />
          </Button>
        }
      />
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Share Palette</DialogTitle>
          <DialogDescription>Anyone with this URL can load your exact palette.</DialogDescription>
        </DialogHeader>
        <textarea
          readOnly
          value={url}
          rows={2}
          onFocus={(e) => e.target.select()}
          className='w-full resize-none rounded border border-border bg-muted px-2.5 py-2 font-mono text-xs leading-relaxed text-secondary-foreground transition-colors outline-none focus:border-ring'
        />

        <div className='flex h-6 gap-px overflow-hidden rounded'>
          {slots.map((s, i) => (
            <div
              key={`${s.color.hex}-${i}`}
              className='flex-1'
              style={{ background: s.color.hex }}
            />
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant='ghost'>Close</Button>} />
          <Button variant='default' onClick={handleCopy}>
            {copied && <IconCheck className='size-4' aria-hidden='true' />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

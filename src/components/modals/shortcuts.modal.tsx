import { IconSquareAsterisk as SquareAsterisk } from '@tabler/icons-react';

import { useCommandModifier } from '@/hooks/use-command-modifier';
import { useHotkeyList } from '@/providers/hotkey.provider';
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
import { Kbd, KbdGroup } from '../ui/kbd';

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────

export function ShortcutsModal() {
  const modal = useChromaStore((s) => s.modal);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const hotkeys = useHotkeyList(modal === 'shortcuts');
  const commandModifier = useCommandModifier();

  // Group by .group field
  const groups: Record<string, typeof hotkeys> = {};
  for (const hk of hotkeys) {
    const g = hk.group || 'General';
    if (!groups[g]) groups[g] = [];
    groups[g].push(hk);
  }

  function keyParts(hk: (typeof hotkeys)[0]): string[] {
    const parts: string[] = [];
    if (hk.ctrl) parts.push(commandModifier);
    if (hk.shift) parts.push(commandModifier === '⌘' ? '⇧' : 'Shift');
    const keyNames: Record<string, string> = {
      space: 'Space',
      arrowleft: '←',
      arrowright: '→',
      arrowup: '↑',
      arrowdown: '↓',
      escape: 'Esc',
      delete: 'Del',
      backspace: 'Backspace',
    };
    const k = keyNames[hk.key.toLowerCase()] ?? hk.key.toUpperCase();
    parts.push(k);
    return parts;
  }
  return (
    <Dialog open={modal === 'shortcuts'} onOpenChange={(open) => !open && closeModal()}>
      <DialogTrigger
        render={
          <Button
            variant='ghost'
            size='icon-lg'
            title='Shortcuts'
            onClick={() => openModal('shortcuts')}
            className='text-muted-foreground'>
            <SquareAsterisk className='size-5' />
          </Button>
        }
      />
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className='flex min-w-85 flex-col gap-5'>
          {Object.entries(groups).map(([group, keys]) => (
            <div key={group}>
              <div className='mb-2 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                {group}
              </div>
              <div className='flex flex-col gap-1.5'>
                {keys.map((hk) => (
                  <div
                    key={hk.key + (hk.ctrl ? 'c' : '') + (hk.shift ? 's' : '')}
                    className='flex items-center justify-between gap-4'>
                    <span className='text-[12px] text-secondary-foreground'>{hk.label}</span>
                    <KbdGroup className='shrink-0 gap-1' aria-label={`${hk.label} shortcut`}>
                      {keyParts(hk).map((part, index) => (
                        <Kbd
                          key={`${part}-${index}`}
                          className='h-5 min-w-0 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-foreground shadow-sm'>
                          {part}
                        </Kbd>
                      ))}
                    </KbdGroup>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {hotkeys.length === 0 && (
            <p className='text-[12px] text-muted-foreground'>
              Navigate to a view to see its shortcuts.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant='ghost'>Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

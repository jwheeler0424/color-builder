import { useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';

import type { SavedPalette } from '@/types';

import { Button } from '@/components/ui/button';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { hexToStop, loadSaved, deleteSaved, clearSaved, encodeUrl } from '@/lib/utils';

export default function SavedView() {
  const loadPalette = useChromaStore((s) => s.loadPalette);
  const navigate = useNavigate();
  const [palettes, setPalettes] = useState<SavedPalette[]>([]);
  const [sharedId, setSharedId] = useState<string | null>(null);

  const refresh = () => setPalettes(loadSaved());

  useEffect(() => {
    refresh();
  }, []);

  // Renamed to avoid collision with the store's loadPalette method
  const handleLoad = (p: SavedPalette) => {
    const slots = p.hexes.map((hex, i) => ({
      id: crypto.randomUUID(),
      color: hexToStop(hex),
      locked: false,
      name: p.slotNames?.[i],
    }));
    loadPalette(slots, p.mode, p.hexes.length);
    navigate({ to: '/palette' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this palette?')) return;
    deleteSaved(id);
    refresh();
  };

  const handleClearAll = () => {
    if (!confirm('Clear all saved palettes?')) return;
    clearSaved();
    refresh();
  };

  const handleShare = (p: SavedPalette) => {
    const url = encodeUrl(p.hexes, p.mode);
    navigator.clipboard.writeText(url).catch(() => {});
    setSharedId(p.id);
    setTimeout(() => setSharedId(null), 2000);
  };

  if (!palettes.length) {
    return (
      <div className='min-h-0 flex-1 overflow-auto p-6'>
        <div className='mb-5'>
          <h2>Saved Palettes</h2>
        </div>
        <div className='text-center text-muted-foreground' style={{ padding: '48px 20px' }}>
          <div className='mb-2 font-display text-lg font-bold text-secondary-foreground'>
            No saved palettes yet
          </div>
          <p className='text-[12px]'>Generate a palette you love, then click ♡ to save it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-auto p-6'>
      <div className='min-w-0'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='font-display text-xl font-extrabold'>Saved Palettes</h2>
          <Button variant='destructive' size='sm' onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
        <div className='grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2.5'>
          {palettes.map((p) => (
            <div
              key={p.id}
              className='overflow-hidden rounded border border-border bg-card transition-colors hover:border-input'>
              <div className='flex h-11'>
                {p.hexes.map((h, i) => (
                  <div key={i} className='flex-1' style={{ background: h }} />
                ))}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div className='mb-0.5 font-display text-sm font-bold'>{p.name || 'Unnamed'}</div>
                <div className='mb-2 text-[10px] tracking-[.06em] text-muted-foreground uppercase'>
                  {p.mode} · {p.hexes.length} colors
                </div>
                <div className='flex gap-1.5'>
                  <Button variant='ghost' size='sm' onClick={() => handleLoad(p)}>
                    ↓ Load
                  </Button>
                  <Button variant='ghost' size='sm' onClick={() => handleShare(p)}>
                    {sharedId === p.id ? '✓ Copied!' : '⤴ Share'}
                  </Button>
                  <Button variant='destructive' size='sm' onClick={() => handleDelete(p.id)}>
                    × Del
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

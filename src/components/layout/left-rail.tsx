/**
 * left-rail.tsx  — Phase 3 layout component
 *
 * The collapsible left rail in the Desktop Studio layout.
 * Contains:
 *   - Brand + collapse toggle
 *   - GenerateControls (count, harmony, seeds, temperature)
 *   - Generate FAB / button
 *
 * Collapse state persists in localStorage.
 * At 240px expanded, 48px collapsed (icon-only mode).
 */

import { useState, useEffect } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils';

import { LogoIcon } from '../logo-icon';
import { GenerateControls, GenerateFooter } from './generate-controls';

const COLLAPSE_KEY = 'chroma:rail-collapsed';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    return false;
  }
}
function saveCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, String(v));
  } catch {}
}

interface LeftRailProps {
  /** Called when a seed swatch is clicked for editing */
  onEditSeed?: (index: number) => void;
  className?: string;
}

export function LeftRail({ onEditSeed, className }: LeftRailProps) {
  const [collapsed, setCollapsed] = useState(false);
  const generate = useChromaStore((s) => s.generate);

  // Load persisted state after mount (avoids SSR mismatch)
  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      saveCollapsed(!v);
      return !v;
    });
  };

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-0 bg-card',
        'overflow-hidden transition-all duration-200',
        collapsed ? 'w-12' : 'w-60',
        className,
      )}>
      {/* ── Rail header ── */}
      <div
        className={cn(
          'flex h-12 shrink-0 flex-wrap items-center border-b border-border',
          collapsed ? 'justify-center px-0' : 'justify-between px-4',
        )}>
        {/* Brand */}
        {!collapsed && (
          <div className='flex items-center gap-3'>
            <LogoIcon className='size-5' />
            <div className='flex gap-0.5'>
              <span className='shrink-0 font-display text-lg font-black tracking-tight text-foreground'>
                Chroma
              </span>
              <span className='font-display text-lg font-normal tracking-tight text-muted-foreground'>
                ELITE
              </span>
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          className='flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-transparent bg-transparent text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground'
          title={collapsed ? 'Expand rail' : 'Collapse rail'}
          aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* ── Collapsed icon rail ── */}
      {collapsed && (
        <div className='flex flex-1 flex-col items-center gap-1 py-3'>
          {/* Generate shortcut */}
          <button
            onClick={generate}
            className='flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            title='Generate (Space)'>
            ⟳
          </button>
        </div>
      )}

      {/* ── Expanded controls ── */}
      {!collapsed && (
        <>
          <div className='flex-1 [scrollbar-width:thin] overflow-y-auto border-r border-border'>
            <GenerateControls onEditSeed={onEditSeed} />
          </div>

          <GenerateFooter />
        </>
      )}
    </aside>
  );
}

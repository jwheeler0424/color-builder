/**
 * accordion-section.tsx  — Phase 4 layout component
 *
 * Collapsible section for the tablet/mobile GenerateControlsAccordion.
 * State persists to sessionStorage so sections remember open/close status.
 *
 * Height animation uses measured pixel height (not height:auto → 0)
 * so the CSS transition actually works.
 */

import React, { useState, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

interface AccordionSectionProps {
  id: string;
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

function loadOpen(id: string, defaultOpen: boolean): boolean {
  try {
    const stored = sessionStorage.getItem(`chroma:accordion:${id}`);
    return stored === null ? defaultOpen : stored === 'true';
  } catch {
    return defaultOpen;
  }
}

function saveOpen(id: string, open: boolean) {
  try {
    sessionStorage.setItem(`chroma:accordion:${id}`, String(open));
  } catch {}
  sectionListeners.get(id)?.forEach((listener) => listener());
}

const sectionListeners = new Map<string, Set<() => void>>();

function subscribeOpen(id: string, listener: () => void) {
  const listeners = sectionListeners.get(id) ?? new Set<() => void>();
  listeners.add(listener);
  sectionListeners.set(id, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) sectionListeners.delete(id);
  };
}

export function AccordionSection({
  id,
  title,
  defaultOpen = false,
  className,
  children,
}: AccordionSectionProps) {
  const subscribe = React.useCallback((listener: () => void) => subscribeOpen(id, listener), [id]);
  const getSnapshot = React.useCallback(() => loadOpen(id, defaultOpen), [id, defaultOpen]);
  const open = React.useSyncExternalStore(subscribe, getSnapshot, () => defaultOpen);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update pixel height when open state changes
  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      // Measure natural height then animate to it
      const h = contentRef.current.scrollHeight;
      setHeight(h);
      // After transition complates, set to undefined so content can grow freely
      const t = setTimeout(() => setHeight(undefined), 210);
      return () => clearTimeout(t);
    } else {
      // First snap to pixel height so transition has a from-value
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open]);

  const toggle = () => {
    saveOpen(id, !open);
  };

  return (
    <div className={cn('border-b border-border', className)}>
      <button
        onClick={toggle}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          'cursor-pointer border-0 bg-transparent text-left',
          'transition-colors hover:bg-accent/40',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
        )}
        aria-expanded={open}>
        <span className='text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
          {title}
        </span>
        <span
          className={cn(
            'text-[10px] text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden>
          ▾
        </span>
      </button>

      <div
        ref={contentRef}
        className='overflow-hidden transition-[height] duration-200 ease-in-out'
        style={{ height: height === undefined ? 'auto' : height }}>
        <div className='px-4 pb-3'>{children}</div>
      </div>
    </div>
  );
}

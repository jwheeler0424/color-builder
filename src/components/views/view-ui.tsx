/**
 * Shared layout + type tokens for tool pages, so every view uses one scale.
 */

import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const CARD = 'rounded-md border border-muted bg-card';

export const SECTION_LABEL =
  'font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase';

// The only type styles tool pages should use, largest to smallest
export const TYPE = {
  hero: 'font-display text-5xl leading-none font-extrabold tabular-nums',
  metric: 'font-display text-2xl leading-none font-extrabold tabular-nums',
  stat: 'font-display text-lg leading-none font-extrabold tabular-nums',
  title: 'text-[13px] leading-snug font-semibold text-foreground',
  body: 'text-xs leading-relaxed text-foreground/80',
  meta: 'text-[11px] leading-snug text-muted-foreground',
  mono: 'font-mono text-[11px] leading-snug text-muted-foreground',
  label: SECTION_LABEL,
};

export function ToolButton({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} className={cn('font-mono text-[10px] font-semibold', className)} />;
}

type ToolOption<Value extends string> = { id: Value; label: string; title?: string };

export function ToolTabs<Value extends string>({
  value,
  onValueChange,
  items,
  label,
  stretch = false,
}: {
  value: Value;
  onValueChange: (value: Value) => void;
  items: readonly ToolOption<Value>[];
  label: string;
  stretch?: boolean;
}) {
  return (
    <div className='shrink-0 overflow-x-auto'>
      <div role='tablist' aria-label={label} className='flex min-w-max border-b border-border'>
        {items.map((item, index) => (
          <button
            key={item.id}
            type='button'
            role='tab'
            aria-selected={value === item.id}
            tabIndex={value === item.id ? 0 : -1}
            onClick={() => onValueChange(item.id)}
            onKeyDown={(event) => {
              let nextIndex = index;
              if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
              else if (event.key === 'ArrowLeft')
                nextIndex = (index - 1 + items.length) % items.length;
              else if (event.key === 'Home') nextIndex = 0;
              else if (event.key === 'End') nextIndex = items.length - 1;
              else return;
              event.preventDefault();
              onValueChange(items[nextIndex].id);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [nextIndex]?.focus();
            }}
            className={cn(
              'cursor-pointer border-r border-border px-4 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase transition-colors outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              stretch && 'flex-1 px-2.5',
              value === item.id
                ? '-mb-px border-b-2 border-b-primary bg-accent/30 text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToolSegments<Value extends string>({
  value,
  onValueChange,
  items,
  label,
}: {
  value: Value;
  onValueChange: (value: Value) => void;
  items: readonly ToolOption<Value>[];
  label: string;
}) {
  return (
    <div
      role='group'
      aria-label={label}
      className='inline-flex max-w-full flex-wrap gap-0.5 rounded-md border border-border bg-background p-0.5'>
      {items.map((item) => (
        <ToolButton
          key={item.id}
          type='button'
          size='xs'
          variant='ghost'
          aria-pressed={value === item.id}
          title={item.title}
          onClick={() => onValueChange(item.id)}
          className={
            value === item.id
              ? 'border-border bg-accent/30 text-foreground'
              : 'text-muted-foreground'
          }>
          {item.label}
        </ToolButton>
      ))}
    </div>
  );
}

export function ViewHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className='shrink-0 px-6 pt-5 pb-3'>
      <h2 className='font-display text-xl font-bold'>{title}</h2>
      <p className={`mt-0.5 ${TYPE.meta}`}>{description}</p>
    </div>
  );
}

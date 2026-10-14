import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function SectionLabel({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'mb-2.5 text-2xs font-semibold tracking-widest text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

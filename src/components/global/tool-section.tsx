import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function ToolSection({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mx-1 border-b border-border py-3.5 last:border-b-0', className)}
      {...props}
    />
  );
}

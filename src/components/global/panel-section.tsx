import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function PanelSection({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('border-b border-border px-4 py-3.5', className)} {...props} />;
}

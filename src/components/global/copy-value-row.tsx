import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export function CopyValueRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className='flex items-center justify-between gap-1.5'>
      <span className='min-w-9.5 shrink-0 text-muted-foreground'>{label}</span>
      <button
        type='button'
        aria-label={copied ? `${label} copied` : `Copy ${label}: ${value}`}
        className={cn(
          'min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-right outline-none focus-visible:ring-2 focus-visible:ring-ring',
          mono && 'font-mono text-2xs',
        )}
        style={{
          color: 'var(--color-foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={`Click to copy: ${value}`}
        onClick={copy}>
        {copied ? (
          <>
            <IconCheck className='mr-1 inline size-3' aria-hidden='true' />
            Copied
          </>
        ) : (
          value
        )}
      </button>
    </div>
  );
}

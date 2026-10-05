import React, { useState, useCallback } from 'react';

import { parseHex, cn } from '@/lib/utils';

interface HexInputProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  'aria-label'?: string;
  showSwatch?: boolean;
  allowAlpha?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function HexInput({
  value,
  onChange,
  label,
  'aria-label': ariaLabel,
  showSwatch = true,
  allowAlpha = false,
  className = '',
  style,
}: HexInputProps) {
  const [raw, setRaw] = useState(value);
  const [invalid, setInvalid] = useState(false);

  const displayVal = invalid ? raw : value;

  const validate = useCallback(
    (s: string): string | null => {
      const h = parseHex(s);
      if (h) return h;
      if (allowAlpha) {
        const c = s.trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{8}$/.test(c)) return '#' + c;
      }
      return null;
    },
    [allowAlpha],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value;
    setRaw(s);
    const valid = validate(s);
    if (valid) {
      setInvalid(false);
      onChange(valid);
    } else setInvalid(true);
  };

  const handleBlur = () => {
    if (!validate(raw)) {
      setRaw(value);
      setInvalid(false);
    }
  };

  const resolvedHex = invalid ? (validate(raw) ?? value) : value;

  return (
    <div className={cn('flex items-center gap-2', className)} style={style}>
      {showSwatch && (
        <div
          className='h-7 w-7 shrink-0 rounded border border-white/20 shadow-inner'
          style={{ background: resolvedHex }}
        />
      )}
      <div className='min-w-0 flex-1'>
        {label && (
          <div className='mb-0.5 text-[9px] font-bold tracking-[.07em] text-muted-foreground uppercase'>
            {label}
          </div>
        )}
        <input
          aria-label={ariaLabel ?? label}
          value={displayVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          maxLength={allowAlpha ? 9 : 7}
          spellCheck={false}
          autoComplete='off'
          className={cn(
            'w-full rounded border bg-muted px-2 py-1.5 font-mono text-[12px] text-foreground',
            'tracking-[.06em] transition-colors outline-none',
            'placeholder:text-muted-foreground',
            'focus:border-ring',
            invalid ? 'border-destructive' : 'border-border',
          )}
        />
      </div>
    </div>
  );
}

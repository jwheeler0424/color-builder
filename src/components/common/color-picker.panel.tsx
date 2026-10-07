import React, { useMemo } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCmykProfile } from '@/hooks/use-cmyk-profile';
import {
  hexToRgb,
  rgbToHsl,
  rgbToHsv,
  rgbToCmyk,
  rgbToOklab,
  rgbToOklch,
  oklabToLch,
  nearestName,
  luminance,
  parseHexAlpha,
  opaqueHex,
  toCssRgb,
  toCssHsl,
  toCssHsv,
  toCssOklch,
  toCssOklab,
  toHexAlpha,
} from '@/lib/utils';

import { Button } from '../ui/button';
import { CmykProfileControl } from './cmyk-profile-control';

// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className='mb-2.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
      {children}
    </p>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className='border-b border-border px-4 py-3.5'>{children}</div>;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  return (
    <div className='flex items-center justify-between gap-1.5'>
      <span className='min-w-9.5 shrink-0 text-muted-foreground'>{label}</span>
      <span
        style={{
          fontFamily: mono ? 'var(--font-mono)' : undefined,
          fontSize: mono ? 9.5 : undefined,
          color: 'var(--color-foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'right',
          cursor: 'pointer',
        }}
        title={`Click to copy: ${value}`}
        onClick={copy}>
        {copied ? '✓ copied' : value}
      </span>
    </div>
  );
}

export function ColorPickerPanel() {
  const { pickerHex, pickerAlpha, setPickerHex, setPickerAlpha, recentColors, slots } =
    useChromaStore();

  // All derived values from canonical hex
  const rgb = useMemo(() => hexToRgb(pickerHex), [pickerHex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const profile = useCmykProfile();
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb, profile.converter]);
  const lch = useMemo(() => oklabToLch(oklab), [oklab]); // for display only

  const displayHex = toHexAlpha(pickerHex, pickerAlpha);

  return (
    <aside className='flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card'>
      {/* Recent colors */}
      {recentColors.length > 0 && (
        <Section>
          <SectionLabel>Recent</SectionLabel>
          <div className='flex items-center gap-2.5'>
            {recentColors.map((rh, i) => (
              <div
                key={i}
                className='h-5.5 w-5.5 cursor-pointer rounded border border-white/10 transition-transform hover:scale-110'
                style={{ background: rh }}
                title={rh}
                onClick={() => {
                  const alpha = parseHexAlpha(rh);
                  setPickerHex(opaqueHex(rh));
                  if (alpha !== null) setPickerAlpha(alpha);
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Color info — all formats */}
      <Section>
        <SectionLabel>Color Values</SectionLabel>
        <div className='text-[11px] leading-[2.1] text-muted-foreground'>
          <InfoRow label='Name' value={nearestName(rgb)} />
          <InfoRow label='HEX' value={displayHex.toUpperCase()} mono />
          <InfoRow label='RGB' value={toCssRgb(rgb, pickerAlpha)} mono />
          <InfoRow label='HSL' value={toCssHsl(hsl, pickerAlpha)} mono />
          <InfoRow label='HSV' value={toCssHsv(hsv, pickerAlpha)} mono />
          <InfoRow label='OKLCH' value={toCssOklch(oklch, pickerAlpha)} mono />
          <InfoRow label='OKLab' value={toCssOklab(oklab, pickerAlpha)} mono />
          <InfoRow
            label='CMYK'
            value={cmyk ? `${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%` : 'ICC profile required'}
          />
          <InfoRow label='Lum.' value={`${(luminance(rgb) * 100).toFixed(1)}%`} />
        </div>
      </Section>

      {/* Palette quick-pick */}
      <Section>
        <SectionLabel>CMYK Profile</SectionLabel>
        <CmykProfileControl />
      </Section>
      {slots.length > 0 && (
        <Section>
          <SectionLabel>Palette</SectionLabel>
          <div className='flex flex-wrap gap-2.5 p-px'>
            {slots.map((slot, i) => (
              <Button
                key={i}
                className='cursor-pointer transition-transform hover:scale-110'
                style={{ background: slot.color.hex }}
                title={slot.color.hex}
                size={'icon-sm'}
                onClick={() => setPickerHex(slot.color.hex)}
              />
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}

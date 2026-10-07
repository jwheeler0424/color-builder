import React, { useMemo } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCmykProfile } from '@/hooks/use-cmyk-profile';
import {
  colorValue,
  formatColor,
  luminance,
  parseColor,
  parseHexInput,
  pickerReadings,
  renderColor,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';

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

  const profile = useCmykProfile();
  const color = useMemo(() => {
    const parsed = parseColor(pickerHex);
    return colorValue(parsed.xyz, pickerAlpha / 100, parsed.display);
  }, [pickerHex, pickerAlpha]);
  const { rgb, hsl, hsv, oklch, oklab, cmyk } = useMemo(
    () => pickerReadings(color, profile.converter ?? undefined),
    [color, profile.converter],
  );
  const displayHex = formatColor(color, 'hex');

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
                  const parsed = parseHexInput(rh);
                  if (!parsed) return;
                  setPickerHex(parsed.hex);
                  if (parsed.hasAlpha) setPickerAlpha(parsed.alphaPercent);
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
          <InfoRow label='Name' value={lookupColorName(color, renderColor(color).hex)} />
          <InfoRow label='HEX' value={displayHex.toUpperCase()} mono />
          <InfoRow label='RGB' value={formatColor(color, 'rgb')} mono />
          <InfoRow label='HSL' value={formatColor(color, 'hsl')} mono />
          <InfoRow label='HSV' value={formatColor(color, 'hsv')} mono />
          <InfoRow label='OKLCH' value={formatColor(color, 'oklch')} mono />
          <InfoRow label='OKLab' value={formatColor(color, 'oklab')} mono />
          <InfoRow
            label='CMYK'
            value={cmyk ? `${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%` : 'ICC profile required'}
          />
          <InfoRow label='Lum.' value={`${(luminance(color.xyz) * 100).toFixed(1)}%`} />
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

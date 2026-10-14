import { useMemo } from 'react';

import { CopyValueRow } from '@/components/global/copy-value-row';
import { PanelSection as Section } from '@/components/global/panel-section';
import { SectionLabel } from '@/components/global/section-label';
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
import { lookupColorName } from '@/lib/engine/colors/color-names';

import { Button } from '../ui/button';
import { CmykProfileControl } from './cmyk-profile-control';

// ─── Section helpers ──────────────────────────────────────────────────────────

export function ColorPickerPanel() {
  const { pickerHex, pickerAlpha, setPickerHex, setPickerAlpha, recentColors, slots } =
    useChromaStore();

  const profile = useCmykProfile();
  const color = useMemo(() => {
    const parsed = parseColor(pickerHex);
    return colorValue(parsed.xyz, pickerAlpha / 100, parsed.display);
  }, [pickerHex, pickerAlpha]);
  const { cmyk } = useMemo(
    () => pickerReadings(color, profile.converter ?? undefined),
    [color, profile.converter],
  );
  const displayHex = formatColor(color, 'hex');

  return (
    <aside className='flex h-full w-80 shrink-0 flex-col border-l border-border bg-card'>
      {/* Recent colors */}
      {recentColors.length > 0 && (
        <Section>
          <SectionLabel>Recent</SectionLabel>
          <div className='flex items-center gap-2.5'>
            {recentColors.map((rh, i) => (
              <button
                key={i}
                type='button'
                aria-label={`Use recent color ${rh.toUpperCase()}`}
                className='h-5.5 w-5.5 cursor-pointer rounded border border-white/10 p-0 transition-transform hover:scale-110'
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
        <div className='text-xs leading-[2.1] text-muted-foreground'>
          <CopyValueRow label='Name' value={lookupColorName(color, renderColor(color).hex)} />
          <CopyValueRow label='HEX' value={displayHex.toUpperCase()} mono />
          <CopyValueRow label='RGB' value={formatColor(color, 'rgb')} mono />
          <CopyValueRow label='HSL' value={formatColor(color, 'hsl')} mono />
          <CopyValueRow label='HSV' value={formatColor(color, 'hsv')} mono />
          <CopyValueRow label='OKLCH' value={formatColor(color, 'oklch')} mono />
          <CopyValueRow label='OKLab' value={formatColor(color, 'oklab')} mono />
          <CopyValueRow
            label='CMYK'
            value={cmyk ? `${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%` : 'ICC profile required'}
          />
          <CopyValueRow label='Lum.' value={`${(luminance(color.xyz) * 100).toFixed(1)}%`} />
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

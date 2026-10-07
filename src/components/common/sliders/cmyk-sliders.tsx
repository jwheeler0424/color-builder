import { useCmykProfile } from '@/hooks/use-cmyk-profile';
import { cmykToColor, renderColor } from '@/lib/engine/browser';
import { CMYK } from '@/types';

import { CmykProfileControl } from '../cmyk-profile-control';
import { SliderRow } from '../slider-row';
import { AlphaSlider } from './alpha-slider';
import { channelGrad } from './channel-grad';

function cmykChannelGrad(
  channel: 'c' | 'm' | 'y' | 'k',
  cmyk: CMYK,
  converter: NonNullable<ReturnType<typeof useCmykProfile>['converter']>,
) {
  return channelGrad(8, (t) => {
    const c: CMYK =
      channel === 'c'
        ? { ...cmyk, c: t * 100 }
        : channel === 'm'
          ? { ...cmyk, m: t * 100 }
          : channel === 'y'
            ? { ...cmyk, y: t * 100 }
            : { ...cmyk, k: t * 100 };
    return renderColor(cmykToColor([c.c, c.m, c.y, c.k], converter)).hex;
  });
}

export function CmykSliders({
  cmyk,
  alpha,
  hex,
  onCmyk,
  onAlpha,
}: {
  cmyk: CMYK | null;
  alpha: number;
  hex: string;
  onCmyk: (c: CMYK) => void;
  onAlpha: (a: number) => void;
}) {
  const profile = useCmykProfile();
  if (!profile.converter || !cmyk) return <CmykProfileControl />;
  return (
    <div className='flex w-full max-w-100 flex-col gap-3.5'>
      <CmykProfileControl />
      <SliderRow
        label='Cyan'
        display={`${Math.round(cmyk.c)}%`}
        value={Math.round(cmyk.c * 10)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad('c', cmyk, profile.converter)}
        onChange={(v) => onCmyk({ ...cmyk, c: v / 10 })}
      />
      <SliderRow
        label='Magenta'
        display={`${Math.round(cmyk.m)}%`}
        value={Math.round(cmyk.m * 10)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad('m', cmyk, profile.converter)}
        onChange={(v) => onCmyk({ ...cmyk, m: v / 10 })}
      />
      <SliderRow
        label='Yellow'
        display={`${Math.round(cmyk.y)}%`}
        value={Math.round(cmyk.y * 10)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad('y', cmyk, profile.converter)}
        onChange={(v) => onCmyk({ ...cmyk, y: v / 10 })}
      />
      <SliderRow
        label='Black'
        display={`${Math.round(cmyk.k)}%`}
        value={Math.round(cmyk.k * 10)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad('k', cmyk, profile.converter)}
        onChange={(v) => onCmyk({ ...cmyk, k: v / 10 })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        className='rounded px-2 py-1.25 text-[9.5px] leading-normal text-muted-foreground'
        style={{
          background: 'rgba(99,102,241,.08)',
          border: '1px solid rgba(99,102,241,.18)',
        }}>
        <strong className='text-secondary-foreground'>CMYK</strong> — Cyan, Magenta, Yellow, and
        Black color model. Used in color printing.
      </div>
    </div>
  );
}

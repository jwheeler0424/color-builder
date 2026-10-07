import { OKLAB, clamp, fitHex } from '@/lib/engine/browser';
import { OKLCH } from '@/types';

import { SliderRow } from '../slider-row';
import { AlphaSlider } from './alpha-slider';
import { channelGrad } from './channel-grad';

function oklchChannelGrad(channel: 'L' | 'C' | 'H', oklch: OKLCH) {
  return channelGrad(8, (t) => {
    const c: OKLCH =
      channel === 'L'
        ? { ...oklch, L: t }
        : channel === 'C'
          ? { ...oklch, C: t * 0.4 }
          : { ...oklch, H: t * 360 };
    return fitHex(OKLAB, { l: c.L, c: c.C, h: c.H });
  });
}

export function OklchSliders({
  oklch,
  alpha,
  hex,
  onOklch,
  onAlpha,
}: {
  oklch: OKLCH;
  alpha: number;
  hex: string;
  onOklch: (o: OKLCH) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className='flex w-full max-w-100 flex-col gap-3.5'>
      <SliderRow
        label='Lightness'
        display={`${Math.round(oklch.L * 100)}%`}
        value={Math.round(oklch.L * 100)}
        min={0}
        max={100}
        trackBg={oklchChannelGrad('L', oklch)}
        onChange={(v) => onOklch({ ...oklch, L: v / 100 })}
      />
      <SliderRow
        label='Chroma'
        display={oklch.C.toFixed(3)}
        value={Math.round(oklch.C * 1000)}
        min={0}
        max={400}
        trackBg={oklchChannelGrad('C', oklch)}
        onChange={(v) => onOklch({ ...oklch, C: clamp(v / 1000, 0, 0.4) })}
      />
      <SliderRow
        label='Hue'
        display={`${Math.round(oklch.H)}°`}
        value={Math.round(oklch.H)}
        min={0}
        max={359}
        trackBg={oklchChannelGrad('H', oklch)}
        onChange={(v) => onOklch({ ...oklch, H: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        className='rounded px-2 py-1.25 text-[9.5px] leading-normal text-muted-foreground'
        style={{
          background: 'rgba(99,102,241,.08)',
          border: '1px solid rgba(99,102,241,.18)',
        }}>
        <strong className='text-secondary-foreground'>OKLCH</strong> — perceptually uniform. Chroma
        = vividness (0 = gray, 0.4 = max). Lightness shifts won't change perceived hue.
      </div>
    </div>
  );
}

import { hsvPercentToRgb8, rgb8ToHex } from '@/lib/engine/browser';
import { HSV } from '@/types';

import { SliderRow } from '../slider-row';
import { AlphaSlider } from './alpha-slider';
import { channelGrad } from './channel-grad';

function hsvChannelGrad(channel: 'h' | 's' | 'v', hsv: HSV) {
  return channelGrad(8, (t) => {
    const ch =
      channel === 'h'
        ? { ...hsv, h: t * 360 }
        : channel === 's'
          ? { ...hsv, s: t * 100 }
          : { ...hsv, v: t * 100 };
    return rgb8ToHex(hsvPercentToRgb8(ch));
  });
}

export function HsvSliders({
  hsv,
  alpha,
  hex,
  onHsv,
  onAlpha,
}: {
  hsv: HSV;
  alpha: number;
  hex: string;
  onHsv: (hsv: HSV) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className='flex flex-col gap-3.5'>
      <SliderRow
        label='Hue'
        display={`${Math.round(hsv.h)}°`}
        value={Math.round(hsv.h)}
        min={0}
        max={359}
        trackBg={hsvChannelGrad('h', hsv)}
        onChange={(v) => onHsv({ ...hsv, h: v })}
      />
      <SliderRow
        label='Sat'
        display={`${Math.round(hsv.s)}%`}
        value={Math.round(hsv.s)}
        min={0}
        max={100}
        trackBg={hsvChannelGrad('s', hsv)}
        onChange={(v) => onHsv({ ...hsv, s: v })}
      />
      <SliderRow
        label='Value'
        display={`${Math.round(hsv.v)}%`}
        value={Math.round(hsv.v)}
        min={0}
        max={100}
        trackBg={hsvChannelGrad('v', hsv)}
        onChange={(v) => onHsv({ ...hsv, v: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
    </div>
  );
}

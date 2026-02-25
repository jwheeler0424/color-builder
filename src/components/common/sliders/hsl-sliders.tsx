import { HSL } from "@/types";
import { channelGrad } from "./channel-grad";
import { hslToRgb, rgbToHex } from "@/lib/utils";
import { SliderRow } from "../slider-row";
import { AlphaSlider } from "./alpha-slider";

function hslChannelGrad(channel: "h" | "s" | "l", hsl: HSL) {
  return channelGrad(8, (t) => {
    const c: HSL =
      channel === "h"
        ? { ...hsl, h: t * 360 }
        : channel === "s"
          ? { ...hsl, s: t * 100 }
          : { ...hsl, l: t * 100 };
    return rgbToHex(hslToRgb(c));
  });
}

export function HslSliders({
  hsl,
  alpha,
  hex,
  onHsl,
  onAlpha,
}: {
  hsl: HSL;
  alpha: number;
  hex: string;
  onHsl: (hsl: HSL) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="w-full max-w-100 flex flex-col gap-3.5">
      <SliderRow
        label="Hue"
        display={`${Math.round(hsl.h)}°`}
        value={Math.round(hsl.h)}
        min={0}
        max={359}
        trackBg={hslChannelGrad("h", hsl)}
        onChange={(v) => onHsl({ ...hsl, h: v })}
      />
      <SliderRow
        label="Saturation"
        display={`${Math.round(hsl.s)}%`}
        value={Math.round(hsl.s)}
        min={0}
        max={100}
        trackBg={hslChannelGrad("s", hsl)}
        onChange={(v) => onHsl({ ...hsl, s: v })}
      />
      <SliderRow
        label="Lightness"
        display={`${Math.round(hsl.l)}%`}
        value={Math.round(hsl.l)}
        min={0}
        max={100}
        trackBg={hslChannelGrad("l", hsl)}
        onChange={(v) => onHsl({ ...hsl, l: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
    </div>
  );
}

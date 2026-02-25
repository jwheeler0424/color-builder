import { RGB } from "@/types";
import { SliderRow } from "../slider-row";
import { rgbToHex } from "@/lib/utils";
import { channelGrad } from "./channel-grad";
import { AlphaSlider } from "./alpha-slider";

function rgbChannelGrad(channel: "r" | "g" | "b", rgb: RGB) {
  return channelGrad(6, (t) => {
    const v = Math.round(t * 255);
    const c =
      channel === "r"
        ? { ...rgb, r: v }
        : channel === "g"
          ? { ...rgb, g: v }
          : { ...rgb, b: v };
    return rgbToHex(c);
  });
}

export function RgbSliders({
  rgb,
  alpha,
  hex,
  onRgb,
  onAlpha,
}: {
  rgb: RGB;
  alpha: number;
  hex: string;
  onRgb: (rgb: RGB) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="w-full max-w-100 flex flex-col gap-3.5">
      <SliderRow
        label="Red"
        display={String(rgb.r)}
        value={rgb.r}
        min={0}
        max={255}
        trackBg={rgbChannelGrad("r", rgb)}
        onChange={(v) => onRgb({ ...rgb, r: v })}
      />
      <SliderRow
        label="Green"
        display={String(rgb.g)}
        value={rgb.g}
        min={0}
        max={255}
        trackBg={rgbChannelGrad("g", rgb)}
        onChange={(v) => onRgb({ ...rgb, g: v })}
      />
      <SliderRow
        label="Blue"
        display={String(rgb.b)}
        value={rgb.b}
        min={0}
        max={255}
        trackBg={rgbChannelGrad("b", rgb)}
        onChange={(v) => onRgb({ ...rgb, b: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
    </div>
  );
}

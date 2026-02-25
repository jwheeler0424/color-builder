import { OKLCH } from "@/types";
import { SliderRow } from "../slider-row";
import { channelGrad } from "./channel-grad";
import { clamp, oklchToRgb, rgbToHex } from "@/lib/utils";
import { AlphaSlider } from "./alpha-slider";

function oklchChannelGrad(channel: "L" | "C" | "H", oklch: OKLCH) {
  return channelGrad(8, (t) => {
    const c: OKLCH =
      channel === "L"
        ? { ...oklch, L: t }
        : channel === "C"
          ? { ...oklch, C: t * 0.4 }
          : { ...oklch, H: t * 360 };
    return rgbToHex(oklchToRgb(c));
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
    <div className="w-full max-w-100 flex flex-col gap-3.5">
      <SliderRow
        label="Lightness"
        display={`${Math.round(oklch.L * 100)}%`}
        value={Math.round(oklch.L * 100)}
        min={0}
        max={100}
        trackBg={oklchChannelGrad("L", oklch)}
        onChange={(v) => onOklch({ ...oklch, L: v / 100 })}
      />
      <SliderRow
        label="Chroma"
        display={oklch.C.toFixed(3)}
        value={Math.round(oklch.C * 1000)}
        min={0}
        max={400}
        trackBg={oklchChannelGrad("C", oklch)}
        onChange={(v) => onOklch({ ...oklch, C: clamp(v / 1000, 0, 0.4) })}
      />
      <SliderRow
        label="Hue"
        display={`${Math.round(oklch.H)}°`}
        value={Math.round(oklch.H)}
        min={0}
        max={359}
        trackBg={oklchChannelGrad("H", oklch)}
        onChange={(v) => onOklch({ ...oklch, H: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        className="rounded text-[9.5px] text-muted-foreground leading-normal px-2 py-1.25"
        style={{
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
        }}
      >
        <strong className="text-secondary-foreground">OKLCH</strong> —
        perceptually uniform. Chroma = vividness (0 = gray, 0.4 = max).
        Lightness shifts won't change perceived hue.
      </div>
    </div>
  );
}

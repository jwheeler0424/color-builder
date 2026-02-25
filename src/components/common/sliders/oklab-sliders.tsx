import { OKLab } from "@/types";
import { SliderRow } from "../slider-row";
import { channelGrad } from "./channel-grad";
import { oklabToRgb, rgbToHex } from "@/lib/utils";
import { AlphaSlider } from "./alpha-slider";

function oklabChannelGrad(channel: "L" | "a" | "b", oklab: OKLab) {
  return channelGrad(8, (t) => {
    const c =
      channel === "L"
        ? { ...oklab, L: t }
        : channel === "a"
          ? { ...oklab, a: (t - 0.5) * 0.8 }
          : { ...oklab, b: (t - 0.5) * 0.8 };
    return rgbToHex(oklabToRgb(c));
  });
}

export function OklabSliders({
  oklab,
  alpha,
  hex,
  onOklab,
  onAlpha,
}: {
  oklab: OKLab;
  alpha: number;
  hex: string;
  onOklab: (o: OKLab) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="w-full max-w-100 flex flex-col gap-3.5">
      <SliderRow
        label="Lightness"
        display={`${Math.round(oklab.L * 100)}%`}
        value={Math.round(oklab.L * 1000)}
        min={0}
        max={1000}
        trackBg={oklabChannelGrad("L", oklab)}
        onChange={(v) => onOklab({ ...oklab, L: v / 1000 })}
      />
      <SliderRow
        label="a (green↔red)"
        display={oklab.a.toFixed(3)}
        value={Math.round((oklab.a + 0.4) * 1000)}
        min={0}
        max={800}
        trackBg={oklabChannelGrad("a", oklab)}
        onChange={(v) => onOklab({ ...oklab, a: v / 1000 - 0.4 })}
      />
      <SliderRow
        label="b (blue↔yellow)"
        display={oklab.b.toFixed(3)}
        value={Math.round((oklab.b + 0.4) * 1000)}
        min={0}
        max={800}
        trackBg={oklabChannelGrad("b", oklab)}
        onChange={(v) => onOklab({ ...oklab, b: v / 1000 - 0.4 })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        className="rounded text-[9.5px] text-muted-foreground leading-normal px-2 py-1.25"
        style={{
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
        }}
      >
        <strong className="text-secondary-foreground">OKLab</strong> —
        perceptual Lab space. a = green↔red axis, b = blue↔yellow axis. Same
        axes as Photoshop Lab.
      </div>
    </div>
  );
}

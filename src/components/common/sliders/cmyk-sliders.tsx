import { CMYK } from "@/types";
import { SliderRow } from "../slider-row";
import { channelGrad } from "./channel-grad";
import { cmykToRgb, rgbToHex } from "@/lib/utils";
import { AlphaSlider } from "./alpha-slider";

function cmykChannelGrad(channel: "c" | "m" | "y" | "k", cmyk: CMYK) {
  return channelGrad(8, (t) => {
    const c: CMYK =
      channel === "c"
        ? { ...cmyk, c: t }
        : channel === "m"
          ? { ...cmyk, m: t }
          : channel === "y"
            ? { ...cmyk, y: t }
            : { ...cmyk, k: t };
    return rgbToHex(cmykToRgb(c));
  });
}

export function CmykSliders({
  cmyk,
  alpha,
  hex,
  onCmyk,
  onAlpha,
}: {
  cmyk: CMYK;
  alpha: number;
  hex: string;
  onCmyk: (c: CMYK) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="w-full max-w-100 flex flex-col gap-3.5">
      <SliderRow
        label="Cyan"
        display={`${Math.round(cmyk.c * 100)}%`}
        value={Math.round(cmyk.c * 1000)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad("c", cmyk)}
        onChange={(v) => onCmyk({ ...cmyk, c: v / 1000 })}
      />
      <SliderRow
        label="Magenta"
        display={`${Math.round(cmyk.m * 100)}%`}
        value={Math.round(cmyk.m * 1000)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad("m", cmyk)}
        onChange={(v) => onCmyk({ ...cmyk, m: v / 1000 })}
      />
      <SliderRow
        label="Yellow"
        display={`${Math.round(cmyk.y * 100)}%`}
        value={Math.round(cmyk.y * 1000)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad("y", cmyk)}
        onChange={(v) => onCmyk({ ...cmyk, y: v / 1000 })}
      />
      <SliderRow
        label="Black"
        display={`${Math.round(cmyk.k * 100)}%`}
        value={Math.round(cmyk.k * 1000)}
        min={0}
        max={1000}
        trackBg={cmykChannelGrad("k", cmyk)}
        onChange={(v) => onCmyk({ ...cmyk, k: v / 1000 })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        className="rounded text-[9.5px] text-muted-foreground leading-normal px-2 py-1.25"
        style={{
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
        }}
      >
        <strong className="text-secondary-foreground">CMYK</strong> — Cyan,
        Magenta, Yellow, and Black color model. Used in color printing.
      </div>
    </div>
  );
}

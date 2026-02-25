// ─── Alpha slider (shared across all modes) ───────────────────────────────────

import { SliderRow } from "../slider-row";

function alphaGrad(hex: string) {
  return `linear-gradient(to right, transparent, ${hex})`;
}

export function AlphaSlider({
  alpha,
  hex,
  onChange,
}: {
  alpha: number;
  hex: string;
  onChange: (a: number) => void;
}) {
  return (
    <SliderRow
      label="Alpha"
      display={`${alpha}%`}
      value={alpha}
      min={0}
      max={100}
      trackBg={alphaGrad(hex)}
      onChange={onChange}
      isAlpha
    />
  );
}

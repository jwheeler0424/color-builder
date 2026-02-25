import { ColorSlider } from "../ui/slider-color";

// ─── Shared slider row ────────────────────────────────────────────────────────
export function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  trackBg,
  onChange,
  isAlpha = false,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  trackBg: string;
  onChange: (v: number) => void;
  isAlpha?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-[11px] font-medium px-0.5">
        <span className="text-muted-foreground uppercase tracking-tight">
          {label}
        </span>
        <span className="font-mono text-foreground tabular-nums bg-secondary/30 px-1.5 py-0.5 rounded leading-none">
          {display}
        </span>
      </div>
      <ColorSlider
        // Use a key based on label to reset internal state if we switch modes (RGB -> HSL)
        key={label}
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        trackBg={trackBg}
        isAlpha={isAlpha}
      />
    </div>
  );
}

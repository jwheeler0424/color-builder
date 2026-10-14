import { ColorSlider } from '../ui/slider-color';

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
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between px-0.5 text-[11px] font-medium'>
        <span className='tracking-tight text-muted-foreground uppercase'>{label}</span>
        <span className='rounded bg-secondary/30 px-1.5 py-0.5 font-mono leading-none text-foreground tabular-nums'>
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

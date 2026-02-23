"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

interface ColorSliderProps extends Omit<
  SliderPrimitive.Root.Props,
  "value" | "onValueChange"
> {
  value: number;
  onValueChange: (v: number) => void;
  trackBg: string;
  isAlpha?: boolean;
}

export function ColorSlider({
  className,
  value,
  min = 0,
  max = 100,
  step = 1,
  trackBg,
  isAlpha,
  onValueChange,
  ...props
}: ColorSliderProps) {
  const lastValueRef = React.useRef(value);

  React.useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full items-center", className)}
      value={[value]}
      onValueChange={(vals) => {
        const next = Array.isArray(vals) ? vals[0] : vals;
        if (
          typeof next === "number" &&
          !isNaN(next) &&
          next !== lastValueRef.current
        ) {
          lastValueRef.current = next;
          onValueChange(next);
        }
      }}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none py-2.5">
        <SliderPrimitive.Track
          className={cn(
            "relative h-3 w-full grow rounded-full",
            // FIX: Remove 'overflow-hidden' and 'border' which cause the artifacts.
            // We use 'ring-1 ring-inset ring-black/10' instead of a border.
            "ring-1 ring-inset ring-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]",
          )}
          style={{
            background: trackBg,
            // FIX: Add background-clip to ensure the gradient doesn't bleed
            // under the rounded corners of the ring/border.
            backgroundClip: "content-box",
          }}
        >
          {isAlpha && (
            <div
              className="absolute inset-0 -z-10 rounded-full"
              style={{
                backgroundImage:
                  "conic-gradient(#ccc 90deg, #fff 90deg 180deg, #ccc 180deg 270deg, #fff 270deg)",
                backgroundSize: "8px 8px",
                // Ensures the checkerboard follows the rounded track perfectly
                borderRadius: "inherit",
              }}
            />
          )}
          <SliderPrimitive.Indicator className="hidden" />
        </SliderPrimitive.Track>

        <SliderPrimitive.Thumb className="z-20 block size-4 rounded-full border-2 border-white bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.3)] transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

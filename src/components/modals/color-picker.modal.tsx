"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { RGB, HSL, HSV, OKLCH } from "@/types";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  rgbToOklch,
  oklchToRgb,
  rgbToOklab,
  oklabToRgb,
  nearestName,
  parseHex,
} from "@/lib/utils";
import ColorWheel from "@/components/color-wheel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
// Import the shared SliderRow we exported from your view file
import { SliderRow } from "../views/color-picker-view";

// ─── Mode Slider Sets ─────────────────────────────────────────────────────────

function channelGrad(steps: number, sample: (t: number) => string): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => sample(i / steps));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function RgbSliders({ rgb, onRgb }: { rgb: RGB; onRgb: (r: RGB) => void }) {
  const grad = (ch: "r" | "g" | "b") =>
    channelGrad(6, (t) => rgbToHex({ ...rgb, [ch]: Math.round(t * 255) }));
  return (
    <div className="flex flex-col gap-3.5">
      <SliderRow
        label="Red"
        display={String(rgb.r)}
        value={rgb.r}
        min={0}
        max={255}
        trackBg={grad("r")}
        onChange={(v) => onRgb({ ...rgb, r: v })}
      />
      <SliderRow
        label="Green"
        display={String(rgb.g)}
        value={rgb.g}
        min={0}
        max={255}
        trackBg={grad("g")}
        onChange={(v) => onRgb({ ...rgb, g: v })}
      />
      <SliderRow
        label="Blue"
        display={String(rgb.b)}
        value={rgb.b}
        min={0}
        max={255}
        trackBg={grad("b")}
        onChange={(v) => onRgb({ ...rgb, b: v })}
      />
    </div>
  );
}

function HslSliders({ hsl, onHsl }: { hsl: HSL; onHsl: (h: HSL) => void }) {
  const grad = (ch: "h" | "s" | "l") =>
    channelGrad(8, (t) =>
      rgbToHex(hslToRgb({ ...hsl, [ch]: ch === "h" ? t * 360 : t * 100 })),
    );
  return (
    <div className="flex flex-col gap-3.5">
      <SliderRow
        label="Hue"
        display={`${Math.round(hsl.h)}°`}
        value={Math.round(hsl.h)}
        min={0}
        max={359}
        trackBg={grad("h")}
        onChange={(v) => onHsl({ ...hsl, h: v })}
      />
      <SliderRow
        label="Sat"
        display={`${Math.round(hsl.s)}%`}
        value={Math.round(hsl.s)}
        min={0}
        max={100}
        trackBg={grad("s")}
        onChange={(v) => onHsl({ ...hsl, s: v })}
      />
      <SliderRow
        label="Light"
        display={`${Math.round(hsl.l)}%`}
        value={Math.round(hsl.l)}
        min={0}
        max={100}
        trackBg={grad("l")}
        onChange={(v) => onHsl({ ...hsl, l: v })}
      />
    </div>
  );
}

function HsvSliders({ hsv, onHsv }: { hsv: HSV; onHsv: (h: HSV) => void }) {
  const hsvToRgb = (h: number, s: number, v: number): RGB => {
    const sn = s / 100,
      vn = v / 100,
      c = vn * sn,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = vn - c;
    let r = 0,
      g = 0,
      b = 0;
    const seg = Math.floor(h / 60) % 6;
    if (seg === 0) {
      r = c;
      g = x;
    } else if (seg === 1) {
      r = x;
      g = c;
    } else if (seg === 2) {
      g = c;
      b = x;
    } else if (seg === 3) {
      g = x;
      b = c;
    } else if (seg === 4) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  };
  const grad = (ch: "h" | "s" | "v") =>
    channelGrad(8, (t) =>
      rgbToHex(
        hsvToRgb(
          ch === "h" ? t * 360 : hsv.h,
          ch === "s" ? t * 100 : hsv.s,
          ch === "v" ? t * 100 : hsv.v,
        ),
      ),
    );
  return (
    <div className="flex flex-col gap-3.5">
      <SliderRow
        label="Hue"
        display={`${Math.round(hsv.h)}°`}
        value={Math.round(hsv.h)}
        min={0}
        max={359}
        trackBg={grad("h")}
        onChange={(v) => onHsv({ ...hsv, h: v })}
      />
      <SliderRow
        label="Sat"
        display={`${Math.round(hsv.s)}%`}
        value={Math.round(hsv.s)}
        min={0}
        max={100}
        trackBg={grad("s")}
        onChange={(v) => onHsv({ ...hsv, s: v })}
      />
      <SliderRow
        label="Value"
        display={`${Math.round(hsv.v)}%`}
        value={Math.round(hsv.v)}
        min={0}
        max={100}
        trackBg={grad("v")}
        onChange={(v) => onHsv({ ...hsv, v: v })}
      />
    </div>
  );
}

function OklchSliders({
  oklch,
  onOklch,
}: {
  oklch: OKLCH;
  onOklch: (o: OKLCH) => void;
}) {
  const grad = (ch: "L" | "C" | "H") =>
    channelGrad(8, (t) =>
      rgbToHex(
        oklchToRgb({
          ...oklch,
          [ch]: ch === "L" ? t : ch === "C" ? t * 0.4 : t * 360,
        }),
      ),
    );
  return (
    <div className="flex flex-col gap-3.5">
      <SliderRow
        label="Light"
        display={`${Math.round(oklch.L * 100)}%`}
        value={Math.round(oklch.L * 100)}
        min={0}
        max={100}
        trackBg={grad("L")}
        onChange={(v) => onOklch({ ...oklch, L: v / 100 })}
      />
      <SliderRow
        label="Chroma"
        display={oklch.C.toFixed(3)}
        value={Math.round(oklch.C * 1000)}
        min={0}
        max={400}
        trackBg={grad("C")}
        onChange={(v) => onOklch({ ...oklch, C: v / 1000 })}
      />
      <SliderRow
        label="Hue"
        display={`${Math.round(oklch.H)}°`}
        value={Math.round(oklch.H)}
        min={0}
        max={359}
        trackBg={grad("H")}
        onChange={(v) => onOklch({ ...oklch, H: v })}
      />
    </div>
  );
}

function OklabSliders({
  oklab,
  onOklab,
}: {
  oklab: { L: number; a: number; b: number };
  onOklab: (o: any) => void;
}) {
  const grad = (ch: "L" | "a" | "b") =>
    channelGrad(8, (t) =>
      rgbToHex(
        oklabToRgb({ ...oklab, [ch]: ch === "L" ? t : (t - 0.5) * 0.8 }),
      ),
    );
  return (
    <div className="flex flex-col gap-3.5">
      <SliderRow
        label="Light"
        display={`${Math.round(oklab.L * 100)}%`}
        value={Math.round(oklab.L * 100)}
        min={0}
        max={100}
        trackBg={grad("L")}
        onChange={(v) => onOklab({ ...oklab, L: v / 100 })}
      />
      <SliderRow
        label="a axis"
        display={oklab.a.toFixed(3)}
        value={Math.round((oklab.a + 0.4) * 1000)}
        min={0}
        max={800}
        trackBg={grad("a")}
        onChange={(v) => onOklab({ ...oklab, a: v / 1000 - 0.4 })}
      />
      <SliderRow
        label="b axis"
        display={oklab.b.toFixed(3)}
        value={Math.round((oklab.b + 0.4) * 1000)}
        min={0}
        max={800}
        trackBg={grad("b")}
        onChange={(v) => onOklab({ ...oklab, b: v / 1000 - 0.4 })}
      />
    </div>
  );
}

// ─── HSV to RGB (needed for committing HSV slider changes) ───────────────────

function hsvToRgbFn(h: number, s: number, v: number): RGB {
  const sn = s / 100,
    vn = v / 100;
  const c = vn * sn,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = vn - c;
  let r = 0,
    g = 0,
    b = 0;
  const seg = Math.floor(h / 60) % 6;
  if (seg === 0) {
    r = c;
    g = x;
  } else if (seg === 1) {
    r = x;
    g = c;
  } else if (seg === 2) {
    g = c;
    b = x;
  } else if (seg === 3) {
    g = x;
    b = c;
  } else if (seg === 4) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ColorPickerModalProps {
  isOpen: boolean;
  initialHex: string;
  title?: string;
  onApply: (hex: string) => void;
  onClose: () => void;
}

export default function ColorPickerModal({
  isOpen,
  initialHex,
  title,
  onApply,
  onClose,
}: ColorPickerModalProps) {
  const [hex, setHex] = useState(initialHex);
  const [mode, setMode] = useState<"hsl" | "rgb" | "hsv" | "oklch" | "oklab">(
    "hsl",
  );
  const [hexInput, setHexInput] = useState(initialHex);

  useEffect(() => {
    if (isOpen) {
      setHex(initialHex);
      setHexInput(initialHex);
    }
  }, [initialHex, isOpen]);

  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const name = useMemo(() => nearestName(rgb), [rgb]);

  const updateColor = useCallback((newHex: string) => {
    setHex(newHex);
    setHexInput(newHex);
  }, []);

  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const dropper = new (window as any).EyeDropper();
        const { sRGBHex } = await dropper.open();
        const h = parseHex(sRGBHex);
        if (h) updateColor(h);
      } catch (e) {
        /* cancelled */
      }
    }
  };

  const MODES = [
    { id: "hsl", label: "HSL" },
    { id: "rgb", label: "RGB" },
    { id: "hsv", label: "HSV" },
    { id: "oklch", label: "OKLCH" },
    { id: "oklab", label: "OKLab" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-105 bg-background border-border shadow-2xl p-0 overflow-hidden outline-none">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
          <div className="flex shrink-0 rounded-xl overflow-hidden border border-border h-12 w-24 shadow-inner bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACtJREFUGFdjZEADJmDMBmS9Z8AEEBMBmCCMBmEiMAnAGAzARCASjCHMAAByfQgLDX8mZwAAAABJRU5ErkJggg==')]">
            <div
              className="flex-1"
              title="Original"
              style={{ background: initialHex }}
            />
            <div className="flex-1" title="New" style={{ background: hex }} />
          </div>
          <div className="flex flex-col min-w-0">
            <DialogTitle className="text-sm font-bold uppercase tracking-tight truncate">
              {title ?? "Edit Color Swatch"}
            </DialogTitle>
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest truncate">
              {name}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 flex flex-col gap-6">
          <div className="flex justify-center py-4 bg-secondary/10 rounded-3xl border border-border/40">
            <ColorWheel
              hsl={hsl}
              size={210}
              onChange={(p) =>
                updateColor(rgbToHex(hslToRgb({ ...hsl, ...p })))
              }
            />
          </div>

          <div className="flex p-1 bg-secondary/40 rounded-xl gap-1 border border-border/50">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all ${
                  mode === m.id
                    ? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="min-h-36.25 px-0.5">
            {mode === "rgb" && (
              <RgbSliders rgb={rgb} onRgb={(r) => updateColor(rgbToHex(r))} />
            )}
            {mode === "hsl" && (
              <HslSliders
                hsl={hsl}
                onHsl={(h) => updateColor(rgbToHex(hslToRgb(h)))}
              />
            )}
            {mode === "hsv" && (
              <HsvSliders
                hsv={hsv}
                onHsv={(h) =>
                  updateColor(
                    rgbToHex(oklchToRgb(rgbToOklch(hsvToRgbFn(h.h, h.s, h.v)))),
                  )
                }
              />
            )}
            {mode === "oklch" && (
              <OklchSliders
                oklch={oklch}
                onOklch={(o) => updateColor(rgbToHex(oklchToRgb(o)))}
              />
            )}
            {mode === "oklab" && (
              <OklabSliders
                oklab={oklab}
                onOklab={(o) => updateColor(rgbToHex(oklabToRgb(o)))}
              />
            )}
          </div>

          <div className="flex items-center gap-3 p-2 bg-secondary/20 rounded-2xl border border-border/50">
            <div
              className="size-10 rounded-xl border border-border shadow-sm shrink-0"
              style={{ background: hex }}
            />
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mb-0.5">
                HEX CODE
              </span>
              <input
                className="w-full bg-transparent font-mono text-sm font-bold outline-none focus:text-primary transition-colors"
                value={hexInput}
                onChange={(e) => {
                  setHexInput(e.target.value);
                  const p = parseHex(e.target.value);
                  if (p) setHex(p);
                }}
                spellCheck={false}
              />
            </div>
            {typeof window !== "undefined" && "EyeDropper" in window && (
              <Button
                variant="secondary"
                size="icon"
                className="size-9 rounded-xl shrink-0 shadow-sm"
                onClick={handleEyeDropper}
              >
                <span className="text-lg">⊕</span>
              </Button>
            )}
          </div>

          <div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
              Hue Suggestions
            </div>
            <div className="flex justify-between px-0.5">
              {Array.from({ length: 10 }, (_, i) => {
                const h = (i / 10) * 360;
                const sugHex = rgbToHex(hslToRgb({ h, s: hsl.s, l: hsl.l }));
                return (
                  <button
                    key={i}
                    onClick={() => updateColor(sugHex)}
                    className="size-7 rounded-lg border border-black/10 transition-transform hover:scale-125 hover:z-10 shadow-sm"
                    style={{ background: sugHex }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[11px] font-bold uppercase tracking-wider h-9"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onApply(hex)}
            className="text-[11px] font-bold uppercase tracking-wider px-8 h-9 shadow-lg shadow-primary/20"
          >
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

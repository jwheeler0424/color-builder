/**
 * extract.view.tsx  — Phase 1 merge
 *
 * Combines: image-extract-view + converter-view
 * Sub-tabs:  [From Image] [Convert]
 */

import { useState, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  rgbToHex,
  parseAny,
  rgbToHsl,
  rgbToHsv,
  rgbToCmyk,
  rgbToOklab,
  oklabToLch,
  nearestName,
  extractColors,
  hexToStop,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ColorPickerModal from "@/components/modals/color-picker.modal";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "image" | "convert";

function TabBar({
  active,
  setActive,
}: {
  active: Tab;
  setActive: (t: Tab) => void;
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {(
        [
          ["image", "From Image"],
          ["convert", "Convert"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`px-4 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase border-r border-border cursor-pointer transition-colors ${active === id ? "text-foreground border-b-2 border-b-primary bg-accent/30 -mb-px" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FROM IMAGE TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ImageTab() {
  const { extractedColors, imgSrc, setExtracted, setSeeds, generate } =
    useChromaStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(false);
    try {
      const colors = await extractColors(file, 8);
      const objectUrl = URL.createObjectURL(file);
      setExtracted(colors, objectUrl);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const useOne = (index: number) => {
    const rgb = extractedColors[index];
    if (!rgb) return;
    setSeeds([hexToStop(rgbToHex(rgb))]);
    generate();
    navigate({ to: "/palette" });
  };

  const useAll = () => {
    setSeeds(
      extractedColors.slice(0, 5).map((rgb) => hexToStop(rgbToHex(rgb))),
    );
    generate();
    navigate({ to: "/palette" });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 780 }}>
        <p className="text-muted-foreground text-[11px] mb-5">
          Upload an image to extract dominant colors and seed your palette.
        </p>

        <div
          className={`border-2 border-dashed rounded-md py-12 px-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-input hover:border-primary hover:bg-primary/5"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          <div className="font-display text-[17px] font-bold text-secondary-foreground mb-1.5">
            Drop an image here
          </div>
          <div className="text-[11px] text-muted-foreground">
            or click to browse · JPG, PNG, WebP, GIF
          </div>
        </div>

        {(imgSrc || loading) && (
          <div className="flex mt-5 gap-4">
            {imgSrc && (
              <div className="flex-1" style={{ maxWidth: 380 }}>
                <img
                  src={imgSrc}
                  alt="Uploaded"
                  className="w-full rounded border border-input block"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Extracted Colors
              </div>
              {loading && (
                <p className="text-muted-foreground text-[12px]">
                  Extracting colors…
                </p>
              )}
              {error && (
                <p className="text-destructive text-[12px]">
                  Extraction failed. Try another image.
                </p>
              )}
              {!loading &&
                !error &&
                extractedColors.map((rgb, i) => {
                  const hex = rgbToHex(rgb);
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <div
                        className="rounded shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          background: hex,
                          border: "1px solid rgba(255,255,255,.08)",
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-mono uppercase font-bold text-[11px]">
                          {hex.toUpperCase()}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {nearestName(rgb)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => useOne(i)}
                      >
                        Use
                      </Button>
                    </div>
                  );
                })}
              {!loading && extractedColors.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  style={{ marginTop: 14 }}
                  onClick={useAll}
                >
                  Use as Seed Colors →
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ConvCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-card border border-border rounded p-3.5 relative">
      <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5 font-display">
        {label}
      </div>
      <div className="font-mono text-[12px] break-all mb-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      <button
        className="absolute top-2.5 right-2.5 bg-secondary border border-border rounded text-muted-foreground text-[10px] px-1.5 py-0.5 cursor-pointer font-mono hover:text-foreground transition-colors"
        onClick={() => {
          navigator.clipboard.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "✓" : "copy"}
      </button>
    </div>
  );
}

function ConvertTab() {
  const [showPicker, setShowPicker] = useState(false);
  const convInput = useChromaStore((s) => s.convInput);
  const setConvInput = useChromaStore((s) => s.setConvInput);

  const rgb = useMemo(
    () => parseAny(convInput) ?? { r: 224, g: 122, b: 95 },
    [convInput],
  );
  const hex = useMemo(() => rgbToHex(rgb), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const lch = useMemo(() => oklabToLch(oklab), [oklab]);
  const name = useMemo(() => nearestName(rgb), [rgb]);

  return (
    <>
      <div className="flex-1 overflow-auto p-7">
        <div className="mx-auto max-w-165">
          <p className="text-muted-foreground text-[11px] mb-5">
            Paste any hex, rgb(), or hsl() value to see all formats instantly.
          </p>

          <div className="flex gap-2.5 mb-6 items-center">
            <div
              className="w-14 h-14 rounded border-2 border-input shrink-0 cursor-pointer transition-colors duration-150"
              style={{ background: hex }}
              title="Click to pick color"
              onClick={() => setShowPicker(true)}
            />
            <input
              className="w-full bg-muted border border-border rounded px-3 py-2.5 text-sm text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              placeholder="#F4A261  ·  rgb(244,162,97)  ·  hsl(27,89%,67%)"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ConvCard label="HEX" value={hex} />
            <ConvCard
              label="CSS RGB"
              value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
              sub={`R:${rgb.r} G:${rgb.g} B:${rgb.b}`}
            />
            <ConvCard
              label="CSS HSL"
              value={`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`}
              sub={`H:${Math.round(hsl.h)}° S:${Math.round(hsl.s)}% L:${Math.round(hsl.l)}%`}
            />
            <ConvCard
              label="HSV / HSB"
              value={`hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`}
              sub={`H:${Math.round(hsv.h)}° S:${Math.round(hsv.s)}% V:${Math.round(hsv.v)}%`}
            />
            <ConvCard
              label="CMYK"
              value={`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`}
              sub={`C:${cmyk.c} M:${cmyk.m} Y:${cmyk.y} K:${cmyk.k}`}
            />
            <ConvCard
              label="OKLab"
              value={`oklab(${oklab.L.toFixed(3)}, ${oklab.a.toFixed(3)}, ${oklab.b.toFixed(3)})`}
            />
            <ConvCard
              label="OKLCH"
              value={`oklch(${lch.L.toFixed(1)}% ${(lch.C / 100).toFixed(3)} ${Math.round(lch.H)})`}
              sub={`L:${lch.L.toFixed(1)} C:${(lch.C / 100).toFixed(3)} H:${Math.round(lch.H)}°`}
            />
            <ConvCard label="Nearest Name" value={name} />
          </div>
        </div>
      </div>

      <ColorPickerModal
        isOpen={showPicker}
        initialHex={hex}
        title="Color Converter"
        onApply={(h) => {
          setConvInput(h);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ExtractView() {
  const [activeTab, setActiveTab] = useState<Tab>("image");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h2 className="mb-1">Extract & Convert</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "image" && <ImageTab />}
      {activeTab === "convert" && <ConvertTab />}
    </div>
  );
}

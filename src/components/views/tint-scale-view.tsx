import { useNavigate } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { generateScale, textColor, parseHex, hexToStop } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ColorPickerModal from "@/components/modals/color-picker.modal";

const TOKEN_TABS = ["css", "js", "tailwind", "json"] as const;

function buildTokens(
  scale: ReturnType<typeof generateScale>,
  name: string,
  tab: string,
): string {
  switch (tab) {
    case "css":
      return `:root {\n${scale.map(({ step, hex }) => `  --${name}-${step}: ${hex};`).join("\n")}\n}`;
    case "js":
      return `export const ${name} = {\n${scale.map(({ step, hex }) => `  '${step}': '${hex}',`).join("\n")}\n};`;
    case "tailwind":
      return `// tailwind.config.js\ncolors: {\n  ${name}: {\n${scale.map(({ step, hex }) => `    '${step}': '${hex}',`).join("\n")}\n  }\n}`;
    case "json":
      return JSON.stringify(
        {
          [name]: Object.fromEntries(scale.map(({ step, hex }) => [step, hex])),
        },
        null,
        2,
      );
    default:
      return "";
  }
}

export default function TintScaleView() {
  const {
    scaleHex,
    scaleName,
    scaleTokenTab,
    slots,
    generate,
    setSeeds,
    setScaleHex,
    setScaleName,
    setScaleTokenTab,
  } = useChromaStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [inputVal, setInputVal] = useState(scaleHex);
  const [showPicker, setShowPicker] = useState(false);

  // Keep local input in sync if scaleHex changes from the store (e.g. after undo)
  React.useEffect(() => {
    setInputVal(scaleHex);
  }, [scaleHex]);

  const scale = useMemo(() => generateScale(scaleHex), [scaleHex]);
  const tokens = useMemo(
    () => buildTokens(scale, scaleName, scaleTokenTab),
    [scale, scaleName, scaleTokenTab],
  );

  const handleInput = (v: string) => {
    setInputVal(v);
    const h = parseHex(v);
    if (h) setScaleHex(h);
  };

  const handleGenerate = () => {
    const h = parseHex(inputVal);
    if (h) setScaleHex(h);
    else if (slots.length) {
      const h2 = slots[0].color.hex;
      setInputVal(h2);
      setScaleHex(h2);
    }
  };

  const copyTokens = () => {
    navigator.clipboard.writeText(tokens).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const useAsSeeds = () => {
    const picks = [1, 3, 5, 7, 9].map((i) => scale[i]).filter(Boolean);
    setSeeds(picks.map(({ hex }) => hexToStop(hex)));
    generate();
    navigate({ to: "/palette" });
  };

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-auto p-6">
          <div className="mb-5">
            <h2>Tint / Shade Scale</h2>
            <p>
              50–950 design token scale from any base color. Click a chip to
              copy.
            </p>
          </div>

          <div className="flex gap-2 items-center mb-6 max-w-[600px]">
            <div
              className="w-11 h-11 rounded border-2 border-input shrink-0 cursor-pointer"
              style={{ background: scaleHex }}
              title="Click to pick color"
              onClick={() => setShowPicker(true)}
            />
            <input
              className="w-full bg-muted flex-1 border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
              value={inputVal}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="#3B82F6"
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
            />
            <Button variant="default" size="sm" onClick={handleGenerate}>
              Generate
            </Button>
          </div>

          <div className="flex rounded overflow-hidden h-[52px] max-w-[900px]">
            {scale.map(({ step, hex, rgb }) => {
              const tc = textColor(rgb);
              return (
                <div
                  key={step}
                  className="scale-chip flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] cursor-pointer"
                  style={{ background: hex }}
                  title={`${step}: ${hex} — click to copy`}
                  onClick={() => {
                    navigator.clipboard.writeText(hex).catch(() => {});
                  }}
                >
                  <div
                    className="font-bold tracking-[.04em]"
                    style={{ color: tc }}
                  >
                    {step}
                  </div>
                  <div className="opacity-65 text-[9px]" style={{ color: tc }}>
                    {hex.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-[320px] bg-card border-l border-border overflow-y-auto shrink-0 p-4">
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Token Name
          </div>
          <input
            className="w-full bg-muted border border-border rounded mb-3 px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
            value={scaleName}
            onChange={(e) => setScaleName(e.target.value.trim() || "default")}
            placeholder="default"
            maxLength={24}
            autoComplete="off"
          />

          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Export Format
          </div>
          <div className="flex-wrap mb-2.5 flex gap-1">
            {TOKEN_TABS.map((tab) => (
              <Button
                key={tab}
                variant={scaleTokenTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setScaleTokenTab(tab)}
              >
                {tab.toUpperCase()}
              </Button>
            ))}
          </div>

          <pre className="bg-secondary border border-border rounded p-2.5 text-[10px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-[300px] overflow-y-auto">
            {tokens}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={copyTokens}
          >
            {copied ? "✓ Copied" : "Copy"}
          </Button>

          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mt-4">
            Use in Palette
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={useAsSeeds}
          >
            Use scale as seeds →
          </Button>
        </div>
      </div>
      {showPicker && (
        <ColorPickerModal
          initialHex={scaleHex}
          title="Base color — Tint Scale"
          onApply={(hex) => {
            setScaleHex(hex);
            setInputVal(hex);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

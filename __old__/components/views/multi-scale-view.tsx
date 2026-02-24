import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  generateScale,
  textColor,
  hexToRgb,
  nearestName,
  semanticSlotNames,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

type ExportFmt = "css" | "tailwind" | "json";

function buildMultiScaleTokens(
  scales: { name: string; steps: ReturnType<typeof generateScale> }[],
  fmt: ExportFmt,
): string {
  switch (fmt) {
    case "css":
      return `:root {\n${scales
        .flatMap(({ name, steps }) =>
          steps.map(({ step, hex }) => `  --${name}-${step}: ${hex};`),
        )
        .join("\n")}\n}`;

    case "tailwind":
      return `// tailwind.config.js\ncolors: {\n${scales
        .map(
          ({ name, steps }) =>
            `  ${name}: {\n${steps.map(({ step, hex }) => `    '${step}': '${hex}',`).join("\n")}\n  },`,
        )
        .join("\n")}\n}`;

    case "json":
      return JSON.stringify(
        Object.fromEntries(
          scales.map(({ name, steps }) => [
            name,
            Object.fromEntries(steps.map(({ step, hex }) => [step, hex])),
          ]),
        ),
        null,
        2,
      );
  }
}

export default function MultiScaleView() {
  const { slots } = useChromaStore();
  const [fmt, setFmt] = useState<ExportFmt>("css");
  const [copied, setCopied] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    slot: number;
    step: number;
  } | null>(null);

  const slotNames = useMemo(() => semanticSlotNames(slots), [slots]);

  const scales = useMemo(
    () =>
      slots.map((slot, i) => ({
        name: slotNames[i] ?? `color-${i + 1}`,
        hex: slot.color.hex,
        steps: generateScale(slot.color.hex),
      })),
    [slots, slotNames],
  );

  const tokens = useMemo(
    () =>
      buildMultiScaleTokens(
        scales.map((s) => ({ name: s.name, steps: s.steps })),
        fmt,
      ),
    [scales, fmt],
  );

  const copy = () => {
    navigator.clipboard.writeText(tokens).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (!slots.length) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Multi-Scale Palette</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-5">
          <h2>Multi-Scale Palette</h2>
          <p>
            Full 50–950 tint scale for every palette color simultaneously — like
            Tailwind, Radix, or shadcn's color system. Click any chip to copy
            its hex.
          </p>
        </div>

        {/* Scale grid */}
        <div className="overflow-x-auto mb-7">
          <table style={{ borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                <th
                  className="text-[9px] font-bold text-muted-foreground uppercase tracking-[.07em] whitespace-nowrap text-left"
                  style={{ padding: "0 8px 8px 0" }}
                >
                  Color
                </th>
                {STEPS.map((step) => (
                  <th
                    key={step}
                    className="text-[9px] font-bold text-muted-foreground uppercase tracking-[.06em] text-center"
                    style={{ padding: "0 2px 8px", minWidth: 44 }}
                  >
                    {step}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scales.map((scale, si) => (
                <tr key={si}>
                  {/* Row label */}
                  <td
                    className="pb-1 whitespace-nowrap"
                    style={{ paddingRight: 10 }}
                  >
                    <div className="items-center flex gap-1.5">
                      <div
                        className="rounded shrink-0 w-[14px] h-[14px]"
                        style={{
                          background: scale.hex,
                          border: "1px solid rgba(128,128,128,.2)",
                        }}
                      />
                      <span className="text-secondary-foreground font-bold text-[10px]">
                        {scale.name}
                      </span>
                    </div>
                    <div
                      className="text-[8.5px] text-muted-foreground mt-0.5"
                      style={{ paddingLeft: 20 }}
                    >
                      {nearestName(hexToRgb(scale.hex))}
                    </div>
                  </td>

                  {/* Scale chips */}
                  {scale.steps.map(({ step, hex, rgb }) => {
                    const tc = textColor(rgb);
                    const isHovered =
                      hoveredCell?.slot === si && hoveredCell?.step === step;
                    return (
                      <td
                        key={step}
                        className="text-center"
                        style={{ padding: "0 2px 4px" }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 5,
                            background: hex,
                            cursor: "pointer",
                            border: isHovered
                              ? "2px solid var(--color-foreground)"
                              : "1px solid rgba(128,128,128,.15)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            padding: "0 0 3px",
                            transition: "transform .1s",
                            transform: isHovered ? "scale(1.12)" : "none",
                          }}
                          title={`${scale.name}-${step}: ${hex}`}
                          onClick={() =>
                            navigator.clipboard.writeText(hex).catch(() => {})
                          }
                          onMouseEnter={() =>
                            setHoveredCell({ slot: si, step })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {isHovered && (
                            <span
                              className="text-[7.5px] font-mono font-bold"
                              style={{ color: tc }}
                            >
                              {hex.slice(1).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {scales.map((scale, i) => {
            const s500 = scale.steps.find((s) => s.step === 500);
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-card rounded-md border border-muted px-2.5 py-1.5"
              >
                <div
                  className="rounded shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    background: scale.hex,
                    border: "1px solid rgba(128,128,128,.2)",
                  }}
                />
                <div>
                  <div className="text-foreground font-bold text-[10px]">
                    {scale.name}
                  </div>
                  <div className="font-mono text-muted-foreground text-[8.5px]">
                    500: {s500?.hex ?? "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export */}
        <div>
          <div className="justify-between items-center flex-wrap mb-2.5 flex gap-1.5">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
              Export All Scales
            </div>
            <div className="flex gap-1">
              {(["css", "tailwind", "json"] as const).map((f) => (
                <Button
                  key={f}
                  variant={fmt === f ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFmt(f)}
                >
                  {f === "css"
                    ? "CSS Vars"
                    : f === "tailwind"
                      ? "Tailwind"
                      : "JSON"}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <pre
            className="bg-secondary border border-border rounded p-2.5 text-[10px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-[300px] overflow-y-auto text-[9px]"
            style={{ maxHeight: 320 }}
          >
            {tokens}
          </pre>
        </div>
      </div>
    </div>
  );
}

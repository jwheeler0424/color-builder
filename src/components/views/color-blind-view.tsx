import { useChromaStore } from "@/hooks/use-chroma-store";
import { applySimMatrix, hexToRgb, rgbToHex, textColor } from "@/lib/utils";
import { CB_TYPES } from "@/lib/constants/chroma";

export default function ColorBlindView() {
  const slots = useChromaStore((s) => s.slots);

  if (!slots.length) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Color Blindness Simulator</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-5">
        <h2>Color Blindness Simulator</h2>
        <p>
          How your palette appears under different types of color vision
          deficiency.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3.5 max-w-[960px]">
        {CB_TYPES.map((cbType) => {
          const simSlots =
            cbType.id === "normal"
              ? slots
              : slots.map((slot) => ({
                  ...slot,
                  color: {
                    ...slot.color,
                    rgb: applySimMatrix(
                      hexToRgb(slot.color.hex),
                      cbType.matrix,
                    ),
                    hex: rgbToHex(
                      applySimMatrix(hexToRgb(slot.color.hex), cbType.matrix),
                    ),
                  },
                }));

          return (
            <div
              key={cbType.id}
              className="bg-card border border-border rounded overflow-hidden"
            >
              <div className="px-3.5 py-2.5 border-b border-border flex justify-between items-baseline gap-2">
                <div className="font-display text-[13px] font-bold">
                  {cbType.name}
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  {cbType.desc}
                </div>
              </div>
              <div className="h-[60px] flex">
                {simSlots.map((slot, i) => {
                  const tc = textColor(hexToRgb(slot.color.hex));
                  return (
                    <div
                      key={i}
                      className="flex-1 flex items-end p-1"
                      style={{ background: slot.color.hex }}
                    >
                      <span
                        className="text-[9px] font-mono [writing-mode:vertical-rl] rotate-180 opacity-70"
                        style={{ color: tc }}
                      >
                        {slot.color.hex.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { PaletteSlot } from "@/types";
import { textColor, parseHex } from "@/lib/utils/colorMath";
import { nearestName, hexToStop } from "@/lib/utils/paletteUtils";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { Button } from "../ui/button";
import { PalettePanel } from "../elements";

function PaletteSlotComponent({
  slot,
  index,
}: {
  slot: PaletteSlot;
  index: number;
}) {
  const { toggleLock, editSlotColor } = useChromaStore();
  const [toastVisible, setToastVisible] = useState(false);
  const tc = textColor(slot.color.rgb);
  const name = nearestName(slot.color.rgb);

  const handleCopy = () => {
    navigator.clipboard.writeText(slot.color.hex).catch(() => {});
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1100);
  };

  return (
    <div className="ch-slot" style={{ background: slot.color.hex }}>
      {toastVisible && <div className="ch-toast">Copied!</div>}
      <div className="ch-slot-acts">
        <button
          className={`ch-sbtn${slot.locked ? " locked" : ""}`}
          style={{ color: slot.locked ? "var(--ch-acc)" : tc }}
          onClick={() => toggleLock(index)}
          title={slot.locked ? "Unlock" : "Lock"}
        >
          {slot.locked ? "🔒" : "🔓"}
        </button>
        <button
          className="ch-sbtn"
          style={{ color: tc }}
          onClick={handleCopy}
          title="Copy hex"
        >
          📋
        </button>
      </div>
      <div className="ch-slot-info">
        <div className="ch-slot-name" style={{ color: tc }}>
          {name}
        </div>
        <div className="ch-slot-hex" style={{ color: tc }} onClick={handleCopy}>
          {slot.color.hex.toUpperCase()}
        </div>
        <div className="ch-slot-hsl" style={{ color: tc }}>
          {Math.round(slot.color.hsl.h)}° {Math.round(slot.color.hsl.s)}%{" "}
          {Math.round(slot.color.hsl.l)}%
        </div>
      </div>
    </div>
  );
}

function SlotEditPopover({
  slotHex,
  onClose,
  onApply,
}: {
  slotHex: string;
  onClose: () => void;
  onApply: (hex: string) => void;
}) {
  const [value, setValue] = useState(slotHex);
  const [error, setError] = useState(false);
  const handleChange = (v: string) => {
    setValue(v);
    const h = parseHex(v);
    if (h) {
      setError(false);
      onApply(h);
    } else setError(true);
  };
  return (
    <div className="ch-slot-edit-popover" onClick={(e) => e.stopPropagation()}>
      <div
        className="ch-slot-edit-swatch"
        style={{ background: parseHex(value) || slotHex }}
      />
      <input
        className={`ch-inp${error ? " err" : ""}`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        maxLength={7}
        spellCheck={false}
        autoFocus
        style={{
          fontFamily: "var(--ch-fm)",
          letterSpacing: ".06em",
          width: 100,
        }}
      />
      <Button variant="default" size="sm" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

export default function PaletteView() {
  const { slots, editSlotColor } = useChromaStore();
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  return (
    <div className="ch-view-pal">
      <div
        className="ch-pstrip"
        onClick={() => editingSlot !== null && setEditingSlot(null)}
      >
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <PaletteSlotComponent slot={slot} index={i} />
            {editingSlot === i && (
              <SlotEditPopover
                slotHex={slot.color.hex}
                onClose={() => setEditingSlot(null)}
                onApply={(hex) => editSlotColor(i, hexToStop(hex))}
              />
            )}
            <button
              className="ch-sbtn"
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                color: textColor(slot.color.rgb),
              }}
              onClick={() => setEditingSlot(editingSlot === i ? null : i)}
              title="Edit color"
            >
              ✏️
            </button>
          </div>
        ))}
      </div>

      <PalettePanel />
    </div>
  );
}

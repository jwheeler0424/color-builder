import { useState, useCallback } from "react";
import type { PaletteSlot } from "@/types";
import { textColor, hexToRgb, parseHex, rgbToHsl } from "@/lib/utils/colorMath";
import { nearestName, hexToStop } from "@/lib/utils/paletteUtils";
import { HARMONIES, THEMES } from "@/lib/constants/chroma";
import { useChromaStore } from "@/hooks/useChromaStore";
import { Button } from "@/components/ui/button";
import ColorPickerModal from "@/components/modals/color-picker.modal";

function PaletteSlotComponent({
  slot,
  index,
  onEdit,
}: {
  slot: PaletteSlot;
  index: number;
  onEdit: (index: number) => void;
}) {
  const { toggleLock, editSlotColor } = useChromaStore();
  const [toastVisible, setToastVisible] = useState(false);
  const rgb = hexToRgb(slot.color.hex);
  const hsl = rgbToHsl(rgb);
  const tc = textColor(rgb);
  const name = nearestName(rgb);

  const handleCopy = () => {
    navigator.clipboard.writeText(slot.color.hex).catch(() => {});
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1100);
  };

  return (
    <div
      className="ch-slot"
      onDoubleClick={() => onEdit(index)}
      style={{
        background:
          slot.color.a !== undefined && slot.color.a < 100
            ? `rgba(${slot.color.rgb.r},${slot.color.rgb.g},${slot.color.rgb.b},${(slot.color.a / 100).toFixed(2)})`
            : slot.color.hex,
      }}
    >
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
          {Math.round(hsl.h)}° {Math.round(hsl.s)}% {Math.round(hsl.l)}%
          {slot.color.a !== undefined && slot.color.a < 100 && (
            <> · {slot.color.a}%</>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaletteView() {
  const {
    slots,
    seeds,
    count,
    mode,
    seedMode,
    temperature,
    generate,
    setMode,
    setCount,
    addSeed,
    removeSeed,
    setSeeds,
    editSlotColor,
    setSeedMode,
    setTemperature,
  } = useChromaStore();
  const [seedInp, setSeedInp] = useState("");
  const [seedErr, setSeedErr] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editingSeed, setEditingSeed] = useState<number | null>(null);

  const handleAddSeed = useCallback(() => {
    const hex = parseHex(seedInp);
    if (!hex) {
      setSeedErr(true);
      setTimeout(() => setSeedErr(false), 600);
      return;
    }
    addSeed(hexToStop(hex));
    setSeedInp("");
  }, [seedInp, addSeed]);

  return (
    <div className="ch-view-pal">
      <div className="ch-pstrip">
        {slots.map((slot, i) => (
          <PaletteSlotComponent
            key={i}
            slot={slot}
            index={i}
            onEdit={setEditingSlot}
          />
        ))}
      </div>

      {/* Slot color picker modal */}
      {editingSlot !== null && slots[editingSlot] && (
        <ColorPickerModal
          initialHex={slots[editingSlot].color.hex}
          title={`Slot ${editingSlot + 1} — ${nearestName(hexToRgb(slots[editingSlot].color.hex))}`}
          onApply={(hex) => {
            editSlotColor(editingSlot, hexToStop(hex));
            setEditingSlot(null);
          }}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {/* Seed color picker modal */}
      {editingSeed !== null && seeds[editingSeed] && (
        <ColorPickerModal
          initialHex={seeds[editingSeed].hex}
          title={`Seed ${editingSeed + 1} — ${nearestName(hexToRgb(seeds[editingSeed].hex))}`}
          onApply={(hex) => {
            const updated = seeds.map((s, i) =>
              i === editingSeed ? hexToStop(hex) : s,
            );
            setSeeds(updated);
            setEditingSeed(null);
          }}
          onClose={() => setEditingSeed(null)}
        />
      )}

      <aside className="ch-panel">
        <div className="ch-pscroll">
          <div className="ch-psec">
            <div className="ch-slabel">Colors</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="ch-count-num">{count}</div>
              <input
                type="range"
                min={4}
                max={12}
                value={count}
                onChange={(e) => setCount(+e.target.value)}
                className="ch-range"
              />
              <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>12</span>
            </div>
          </div>

          <div className="ch-psec">
            <div className="ch-slabel">Themes</div>
            <div className="ch-themes-grid">
              {THEMES.map((t, i) => (
                <div
                  key={i}
                  className="ch-theme-card"
                  title={t.name}
                  onClick={() => {
                    setMode(t.mode);
                    setSeeds(t.seeds.map((h) => hexToStop(h.toLowerCase())));
                    generate();
                  }}
                >
                  <div className="ch-theme-strip">
                    {t.seeds.slice(0, 5).map((h, j) => (
                      <div
                        key={j}
                        className="ch-theme-chip"
                        style={{ background: h }}
                      />
                    ))}
                  </div>
                  <div className="ch-theme-label">{t.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="ch-psec">
            <div className="ch-slabel">Seed Colors</div>
            <div className="ch-seedlist">
              {seeds.map((s, i) => (
                <div key={i} className="ch-seeditem">
                  <div
                    className="ch-seedsw"
                    style={{ background: s.hex, cursor: "pointer" }}
                    title="Click to edit seed color"
                    onClick={() => setEditingSeed(i)}
                  />
                  <span
                    className="ch-seedhex"
                    style={{ cursor: "pointer" }}
                    onClick={() => setEditingSeed(i)}
                  >
                    {s.hex.toUpperCase()}
                  </span>
                  <button className="ch-seedrm" onClick={() => removeSeed(i)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="ch-seedrow">
              <input
                className={`ch-inp${seedErr ? " err" : ""}`}
                value={seedInp}
                onChange={(e) => setSeedInp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSeed()}
                placeholder="#F4A261"
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                style={{ fontSize: 11 }}
              />
              <Button variant="ghost" size="sm" onClick={handleAddSeed}>
                + Add
              </Button>
            </div>
          </div>

          <div className="ch-psec">
            <div className="ch-slabel">Seed Behavior</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {(
                [
                  {
                    id: "influence",
                    label: "Influence",
                    title:
                      "Seed hue and lightness guide generation — exact color not forced",
                  },
                  {
                    id: "pin",
                    label: "Pin",
                    title: "Seed color appears verbatim as a locked slot",
                  },
                ] as const
              ).map(({ id, label, title }) => (
                <Button
                  key={id}
                  variant={seedMode === id ? "default" : "ghost"}
                  size="sm"
                  title={title}
                  onClick={() => setSeedMode(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div
              style={{
                fontSize: 9.5,
                color: "var(--ch-t3)",
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              {seedMode === "pin"
                ? "Seed colors appear exactly in the palette as locked slots."
                : "Seed hue guides generation but the exact color may shift."}
            </div>
          </div>

          <div className="ch-psec">
            <div className="ch-slabel">
              Temperature{" "}
              <span style={{ fontWeight: 400, color: "var(--ch-t3)" }}>
                {temperature < -0.2
                  ? "❄ Cool"
                  : temperature > 0.2
                    ? "🌅 Warm"
                    : "⚪ Neutral"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>❄</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={Math.round(temperature * 100)}
                onChange={(e) => setTemperature(+e.target.value / 100)}
                className="ch-range"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>🌅</span>
            </div>
          </div>

          <div className="ch-psec">
            <div className="ch-slabel">Harmony</div>
            <div className="ch-hdesc">
              {HARMONIES.find((h) => h.id === mode)?.desc || ""}
            </div>
            <div className="ch-hgrid">
              {HARMONIES.map((h) => (
                <button
                  key={h.id}
                  className={`ch-hbtn${mode === h.id ? " on" : ""}`}
                  onClick={() => {
                    setMode(h.id);
                    generate();
                  }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {slots.length > 0 && (
            <div className="ch-psec">
              <div className="ch-slabel">Preview</div>
              <div className="ch-prevstrip">
                {slots.map((s, i) => (
                  <div key={i} style={{ flex: 1, background: s.color.hex }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ch-genbar">
          <Button variant="default" className="ch-gen-btn" onClick={generate}>
            ⟳ Generate
          </Button>
          <div className="ch-hint">
            Press <kbd>Space</kbd> to generate · <kbd>Ctrl+Z</kbd> to undo
          </div>
        </div>
      </aside>
    </div>
  );
}

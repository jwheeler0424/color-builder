import { useState, useCallback } from "react";
import type { HarmonyMode } from "@/types";
import { textColor, parseHex } from "@/lib/utils/colorMath";
import { nearestName, hexToStop } from "@/lib/utils/paletteUtils";
import { HARMONIES, THEMES } from "@/lib/utils/constants";
import { useChromaStore } from "@/hooks/useChromaStore";
import Button from "../Button";

function PaletteSlotComponent({
  slot,
  index,
}: {
  slot: ReturnType<typeof useChromaStore.getState>["slots"][0];
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
      <Button variant="primary" size="sm" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

export default function PaletteView() {
  const {
    slots,
    seeds,
    count,
    mode,
    generate,
    setMode,
    setCount,
    addSeed,
    removeSeed,
    setSeeds,
    editSlotColor,
  } = useChromaStore();
  const [seedInp, setSeedInp] = useState("");
  const [seedErr, setSeedErr] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

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
                    setMode(t.mode as HarmonyMode);
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
                  <div className="ch-seedsw" style={{ background: s.hex }} />
                  <span className="ch-seedhex">{s.hex.toUpperCase()}</span>
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
          <Button variant="primary" className="ch-gen-btn" onClick={generate}>
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

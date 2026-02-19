import React, { useState, useCallback } from "react";
import type { ChromaState, ChromaAction, HarmonyMode } from "@/types";
import { textColor, parseHex } from "@/lib/utils/colorMath";
import { nearestName, hexToStop } from "@/lib/utils/paletteUtils";
import { HARMONIES, THEMES } from "@/lib/utils/constants";
import Button from "../Button";

interface Props {
  state: ChromaState;
  dispatch: React.Dispatch<ChromaAction>;
  generate: () => void;
}

function PaletteSlotComponent({
  slot,
  index,
  onLock,
  onCopy,
  onEdit,
}: {
  slot: ChromaState["slots"][0];
  index: number;
  onLock: (i: number) => void;
  onCopy: (i: number) => void;
  onEdit: (i: number) => void;
}) {
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
          onClick={() => onLock(index)}
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
        <button
          className="ch-sbtn"
          style={{ color: tc }}
          onClick={() => onEdit(index)}
          title="Edit color"
        >
          ✏️
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

// Inline mini-picker for slot editing (Phase 1.3)
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

export default function PaletteView({ state, dispatch, generate }: Props) {
  const [seedInp, setSeedInp] = useState("");
  const [seedErr, setSeedErr] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  const addSeed = useCallback(() => {
    const hex = parseHex(seedInp);
    if (!hex) {
      setSeedErr(true);
      setTimeout(() => setSeedErr(false), 600);
      return;
    }
    dispatch({ type: "ADD_SEED", seed: hexToStop(hex) });
    setSeedInp("");
  }, [seedInp, dispatch]);

  const handleEditApply = useCallback(
    (index: number, hex: string) => {
      dispatch({ type: "EDIT_SLOT_COLOR", index, color: hexToStop(hex) });
    },
    [dispatch],
  );

  return (
    <div className="ch-view-pal">
      {/* Palette strip */}
      <div
        className="ch-pstrip"
        onClick={() => editingSlot !== null && setEditingSlot(null)}
      >
        {state.slots.map((slot, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <PaletteSlotComponent
              slot={slot}
              index={i}
              onLock={(idx) => dispatch({ type: "TOGGLE_LOCK", index: idx })}
              onCopy={(idx) => {
                navigator.clipboard
                  .writeText(state.slots[idx]?.color.hex || "")
                  .catch(() => {});
              }}
              onEdit={(idx) => setEditingSlot(editingSlot === idx ? null : idx)}
            />
            {editingSlot === i && (
              <SlotEditPopover
                slotHex={slot.color.hex}
                onClose={() => setEditingSlot(null)}
                onApply={(hex) => handleEditApply(i, hex)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="ch-panel">
        <div className="ch-pscroll">
          {/* Count */}
          <div className="ch-psec">
            <div className="ch-slabel">Colors</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="ch-count-num">{state.count}</div>
              <input
                type="range"
                min={4}
                max={12}
                value={state.count}
                onChange={(e) =>
                  dispatch({ type: "SET_COUNT", count: +e.target.value })
                }
                className="ch-range"
              />
              <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>12</span>
            </div>
          </div>

          {/* Themes */}
          <div className="ch-psec">
            <div className="ch-slabel">Themes</div>
            <div className="ch-themes-grid">
              {THEMES.map((t, i) => (
                <div
                  key={i}
                  className="ch-theme-card"
                  title={t.name}
                  onClick={() => {
                    const seeds = t.seeds.map((h) =>
                      hexToStop(h.toLowerCase()),
                    );
                    dispatch({ type: "SET_MODE", mode: t.mode as HarmonyMode });
                    dispatch({ type: "SET_SEEDS", seeds });
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

          {/* Seeds */}
          <div className="ch-psec">
            <div className="ch-slabel">Seed Colors</div>
            <div className="ch-seedlist">
              {state.seeds.map((s, i) => (
                <div key={i} className="ch-seeditem">
                  <div className="ch-seedsw" style={{ background: s.hex }} />
                  <span className="ch-seedhex">{s.hex.toUpperCase()}</span>
                  <button
                    className="ch-seedrm"
                    onClick={() => dispatch({ type: "REMOVE_SEED", index: i })}
                  >
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
                onKeyDown={(e) => e.key === "Enter" && addSeed()}
                placeholder="#F4A261"
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                style={{ fontSize: 11 }}
              />
              <Button variant="ghost" size="sm" onClick={addSeed}>
                + Add
              </Button>
            </div>
          </div>

          {/* Harmony */}
          <div className="ch-psec">
            <div className="ch-slabel">Harmony</div>
            <div className="ch-hdesc">
              {HARMONIES.find((h) => h.id === state.mode)?.desc || ""}
            </div>
            <div className="ch-hgrid">
              {HARMONIES.map((h) => (
                <button
                  key={h.id}
                  className={`ch-hbtn${state.mode === h.id ? " on" : ""}`}
                  onClick={() => {
                    dispatch({ type: "SET_MODE", mode: h.id });
                    generate();
                  }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview strip */}
          {state.slots.length > 0 && (
            <div className="ch-psec">
              <div className="ch-slabel">Preview</div>
              <div className="ch-prevstrip">
                {state.slots.map((s, i) => (
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

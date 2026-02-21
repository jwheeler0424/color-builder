import React, { useState, useCallback } from "react";
import { parseHex } from "@/lib/utils/colorMath";

interface HexInputProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  /** Show a color swatch preview next to the input */
  showSwatch?: boolean;
  /** Allow 8-char hex (with alpha) */
  allowAlpha?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Shared hex color input with inline validation.
 * Uses parseHex() as the single validator — handles 3, 6, and optionally 8-char hex.
 * Shows red border on invalid input; reverts to last valid value on blur.
 */
export default function HexInput({
  value,
  onChange,
  label,
  showSwatch = true,
  allowAlpha = false,
  className = "",
  style,
}: HexInputProps) {
  const [raw, setRaw] = useState(value);
  const [invalid, setInvalid] = useState(false);

  // Keep raw in sync when external value changes (e.g. palette click sets it)
  const displayVal = invalid ? raw : value;

  const validate = useCallback(
    (s: string): string | null => {
      const h = parseHex(s);
      if (h) return h;
      // Also allow 8-char hex if allowAlpha is on
      if (allowAlpha) {
        const c = s.trim().replace(/^#/, "");
        if (/^[0-9a-fA-F]{8}$/.test(c)) return "#" + c;
      }
      return null;
    },
    [allowAlpha],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value;
    setRaw(s);
    const valid = validate(s);
    if (valid) {
      setInvalid(false);
      onChange(valid);
    } else {
      setInvalid(true);
    }
  };

  const handleBlur = () => {
    const valid = validate(raw);
    if (!valid) {
      // Revert to last known good value
      setRaw(value);
      setInvalid(false);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const resolvedHex = validate(raw) ?? value;

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, ...style }}
      className={className}
    >
      {showSwatch && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            flexShrink: 0,
            background: resolvedHex,
            border: "1px solid rgba(128,128,128,.25)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              color: "var(--ch-t3)",
              marginBottom: 3,
            }}
          >
            {label}
          </div>
        )}
        <input
          className="ch-inp"
          value={displayVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          maxLength={allowAlpha ? 9 : 7}
          spellCheck={false}
          autoComplete="off"
          style={{
            fontFamily: "var(--ch-fm)",
            letterSpacing: ".06em",
            borderColor: invalid ? "rgba(239,68,68,.7)" : undefined,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}

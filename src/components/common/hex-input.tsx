import React, { useState, useCallback } from "react";
import { parseHex, cn } from "@/lib/utils";

interface HexInputProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  showSwatch?: boolean;
  allowAlpha?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

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

  const displayVal = invalid ? raw : value;

  const validate = useCallback(
    (s: string): string | null => {
      const h = parseHex(s);
      if (h) return h;
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
    } else setInvalid(true);
  };

  const handleBlur = () => {
    if (!validate(raw)) {
      setRaw(value);
      setInvalid(false);
    }
  };

  const resolvedHex = validate(raw) ?? value;

  return (
    <div className={cn("flex items-center gap-2", className)} style={style}>
      {showSwatch && (
        <div
          className="w-7 h-7 rounded shrink-0 border border-white/20 shadow-inner"
          style={{ background: resolvedHex }}
        />
      )}
      <div className="flex-1 min-w-0">
        {label && (
          <div className="text-[9px] font-bold uppercase tracking-[.07em] text-muted-foreground mb-0.5">
            {label}
          </div>
        )}
        <input
          value={displayVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          maxLength={allowAlpha ? 9 : 7}
          spellCheck={false}
          autoComplete="off"
          className={cn(
            "w-full bg-muted border rounded px-2 py-1.5 text-[12px] text-foreground font-mono",
            "tracking-[.06em] outline-none transition-colors",
            "placeholder:text-muted-foreground",
            "focus:border-ring",
            invalid ? "border-destructive" : "border-border",
          )}
        />
      </div>
    </div>
  );
}

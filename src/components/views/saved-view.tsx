import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { SavedPalette } from "@/types";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  hexToStop,
  loadSaved,
  deleteSaved,
  clearSaved,
  encodeUrl,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SavedView() {
  const loadPalette = useChromaStore((s) => s.loadPalette);
  const navigate = useNavigate();
  const [palettes, setPalettes] = useState<SavedPalette[]>([]);
  const [sharedId, setSharedId] = useState<string | null>(null);

  const refresh = () => setPalettes(loadSaved());

  useEffect(() => {
    refresh();
  }, []);

  // Renamed to avoid collision with the store's loadPalette method
  const handleLoad = (p: SavedPalette) => {
    const slots = p.hexes.map((hex, i) => ({
      id: crypto.randomUUID(),
      color: hexToStop(hex),
      locked: false,
      name: p.slotNames?.[i],
    }));
    loadPalette(slots, p.mode, p.hexes.length);
    navigate({ to: "/palette" });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this palette?")) return;
    deleteSaved(id);
    refresh();
  };

  const handleClearAll = () => {
    if (!confirm("Clear all saved palettes?")) return;
    clearSaved();
    refresh();
  };

  const handleShare = (p: SavedPalette) => {
    const url = encodeUrl(p.hexes, p.mode);
    navigator.clipboard.writeText(url).catch(() => {});
    setSharedId(p.id);
    setTimeout(() => setSharedId(null), 2000);
  };

  if (!palettes.length) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Saved Palettes</h2>
        </div>
        <div
          className="text-center text-muted-foreground"
          style={{ padding: "48px 20px" }}
        >
          <div className="font-display text-secondary-foreground mb-2 font-bold text-lg">
            No saved palettes yet
          </div>
          <p className="text-[12px]">
            Generate a palette you love, then click ♡ to save it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 920 }}>
        <div className="justify-between items-center mb-4 flex">
          <h2 className="font-display font-extrabold text-xl">
            Saved Palettes
          </h2>
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
        <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
          {palettes.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded overflow-hidden hover:border-input transition-colors"
            >
              <div className="h-11 flex">
                {p.hexes.map((h, i) => (
                  <div key={i} className="flex-1" style={{ background: h }} />
                ))}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div className="font-display text-sm font-bold mb-0.5">
                  {p.name || "Unnamed"}
                </div>
                <div className="text-muted-foreground uppercase tracking-[.06em] mb-2 text-[10px]">
                  {p.mode} · {p.hexes.length} colors
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLoad(p)}
                  >
                    ↓ Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(p)}
                  >
                    {sharedId === p.id ? "✓ Copied!" : "⤴ Share"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    × Del
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

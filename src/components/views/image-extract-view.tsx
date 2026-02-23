import { useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { rgbToHex, nearestName, extractColors, hexToStop } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ImageExtractView() {
  const { extractedColors, imgSrc, setExtracted, setSeeds, generate } =
    useChromaStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(false);
    try {
      const colors = await extractColors(file, 8);
      const objectUrl = URL.createObjectURL(file);
      setExtracted(colors, objectUrl);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const useOne = (index: number) => {
    const rgb = extractedColors[index];
    if (!rgb) return;
    const hex = rgbToHex(rgb);
    setSeeds([hexToStop(hex)]);
    generate();
    navigate({ to: "/palette" });
  };

  const useAll = () => {
    const seeds = extractedColors
      .slice(0, 5)
      .map((rgb) => hexToStop(rgbToHex(rgb)));
    setSeeds(seeds);
    generate();
    navigate({ to: "/palette" });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 780 }}>
        <div className="mb-5">
          <h2>Image Color Extraction</h2>
          <p>
            Upload an image to extract dominant colors and seed your palette.
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-md py-12 px-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-input hover:border-primary hover:bg-primary/5"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          <div className="font-display text-[17px] font-bold text-secondary-foreground mb-1.5">
            Drop an image here
          </div>
          <div className="text-[11px] text-muted-foreground">
            or click to browse · JPG, PNG, WebP, GIF
          </div>
        </div>

        {/* Preview + extracted colors */}
        {(imgSrc || loading) && (
          <div className="flex mt-5 gap-4">
            {imgSrc && (
              <div className="flex-1" style={{ maxWidth: 380 }}>
                <img
                  src={imgSrc}
                  alt="Uploaded"
                  className="w-full rounded border border-input block"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2.5">
                Extracted Colors
              </div>
              {loading && (
                <p className="text-muted-foreground text-[12px]">
                  Extracting colors…
                </p>
              )}
              {error && (
                <p className="text-destructive text-[12px]">
                  Extraction failed. Try another image.
                </p>
              )}
              {!loading &&
                !error &&
                extractedColors.map((rgb, i) => {
                  const hex = rgbToHex(rgb);
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <div
                        className="rounded shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          background: hex,
                          border: "1px solid rgba(255,255,255,.08)",
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-mono uppercase font-bold text-[11px]">
                          {hex.toUpperCase()}
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          {nearestName(rgb)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => useOne(i)}
                      >
                        Use
                      </Button>
                    </div>
                  );
                })}
              {!loading && extractedColors.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  style={{ marginTop: 14 }}
                  onClick={useAll}
                >
                  Use as Seed Colors →
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

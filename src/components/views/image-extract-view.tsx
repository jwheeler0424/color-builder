import { useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import { rgbToHex } from "@/lib/utils/colorMath";
import {
  nearestName,
  extractColors,
  hexToStop,
} from "@/lib/utils/paletteUtils";
import { Button } from "../ui/button";

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
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Image Color Extraction</h2>
          <p>
            Upload an image to extract dominant colors and seed your palette.
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`ch-drop-zone${dragOver ? " dragover" : ""}`}
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
            style={{ display: "none" }}
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          <div className="ch-drop-title">Drop an image here</div>
          <div className="ch-drop-sub">
            or click to browse · JPG, PNG, WebP, GIF
          </div>
        </div>

        {/* Preview + extracted colors */}
        {(imgSrc || loading) && (
          <div className="ch-img-row">
            {imgSrc && (
              <div style={{ flex: 1, maxWidth: 380 }}>
                <img src={imgSrc} alt="Uploaded" className="ch-img-preview" />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div className="ch-slabel" style={{ marginBottom: 10 }}>
                Extracted Colors
              </div>
              {loading && (
                <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
                  Extracting colors…
                </p>
              )}
              {error && (
                <p style={{ color: "var(--ch-danger)", fontSize: 12 }}>
                  Extraction failed. Try another image.
                </p>
              )}
              {!loading &&
                !error &&
                extractedColors.map((rgb, i) => {
                  const hex = rgbToHex(rgb);
                  return (
                    <div key={i} className="ch-img-color-row">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 3,
                          background: hex,
                          border: "1px solid rgba(255,255,255,.08)",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: "var(--ch-fm)",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {hex.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ch-t3)" }}>
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

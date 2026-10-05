import { join } from "node:path";
import { expect, test } from "bun:test";
import { NAMED } from "@/lib/constants/chroma";
import { generateSvgSwatch, hexToRgb, nearestName, rgbToHsl } from "@/lib/utils";

test("nearestName is callable after loading constants through the utility barrel", () => {
  const color = NAMED[0];
  expect(typeof nearestName).toBe("function");
  expect(nearestName(hexToRgb(color.hex))).toBe(color.name);
  expect(nearestName({ r: 123, g: 45, b: 67 })).toBeString();
});

test("SVG export can resolve automatic color names without a barrel cycle", () => {
  const rgb = hexToRgb("#ff0000");
  const svg = generateSvgSwatch([
    {
      id: "regression",
      color: { hex: "#ff0000", rgb, hsl: rgbToHsl(rgb) },
      locked: false,
    },
  ]);
  expect(svg).toContain(nearestName(rgb));
});

test("browser-bundled utilities expose a callable nearestName", async () => {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "../src/lib/utils/index.ts")],
    target: "browser",
  });
  expect(result.success).toBe(true);
  const source = await result.outputs[0].text();
  const bundled = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
  expect(typeof bundled.nearestName).toBe("function");
  expect(bundled.nearestName({ r: 255, g: 0, b: 0 })).toBe(nearestName({ r: 255, g: 0, b: 0 }));
});

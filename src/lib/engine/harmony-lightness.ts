export function anchorLightness(base: number, count: number): number[] {
  const step = Math.min(0.15, 0.35 / Math.max(1, Math.ceil((count - 1) / 2)));
  const values = Array.from({ length: count }, (_, index) => {
    if (index === 0) return base;
    const shift = (index % 2 === 1 ? 1 : -1) * Math.ceil(index / 2) * step;
    return Math.min(0.95, Math.max(0.15, base + shift));
  });
  if (new Set(values).size === count) return values;

  const darkRange = base - Math.min(base, Math.max(0.15, base - 0.35));
  const lightRange = Math.max(base, Math.min(0.95, base + 0.35)) - base;
  const darkCount = Math.round(((count - 1) * darkRange) / (darkRange + lightRange));
  const lightCount = count - 1 - darkCount;
  const darkStep = Math.min(0.15, darkRange / Math.max(1, darkCount));
  const lightStep = Math.min(0.15, lightRange / Math.max(1, lightCount));
  let dark = 0;
  let light = 0;
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return base;
    if (light < lightCount && (index % 2 === 1 || dark === darkCount)) {
      return base + ++light * lightStep;
    }
    return base - ++dark * darkStep;
  });
}

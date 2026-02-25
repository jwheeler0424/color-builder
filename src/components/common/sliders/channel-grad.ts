export function channelGrad(steps: number, fn: (t: number) => string): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => fn(i / steps));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

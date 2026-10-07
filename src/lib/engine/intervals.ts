export type Interval = [number, number];

export function intersect(x: Interval[], y: Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    const lo = Math.max(x[i]![0], y[j]![0]);
    const hi = Math.min(x[i]![1], y[j]![1]);
    if (lo <= hi) out.push([lo, hi]);
    if (x[i]![1] < y[j]![1]) i++;
    else j++;
  }
  return out;
}

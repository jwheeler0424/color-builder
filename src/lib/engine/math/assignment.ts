/**
 * Optimal assignment (Hungarian algorithm, O(n²·m)).
 *
 * Given an n×m cost matrix with n ≤ m, picks one distinct column per row so
 * the total cost is minimal. Used to snap a whole palette to a catalog so the
 * *set* of matches is as close as possible, instead of letting the first
 * colors grab their favourites greedily.
 *
 * Returns, for each row, the index of its assigned column.
 */
export function minCostAssignment(cost: readonly (readonly number[])[]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0]!.length;
  if (n > m) throw new Error('minCostAssignment needs at least as many columns as rows.');

  // Potentials and matching, 1-indexed with a virtual 0th row/column.
  const u = new Float64Array(n + 1);
  const v = new Float64Array(m + 1);
  const matchedRow = new Int32Array(m + 1); // matchedRow[j] = row assigned to column j
  const way = new Int32Array(m + 1);

  for (let i = 1; i <= n; i++) {
    matchedRow[0] = i;
    let j0 = 0;
    const minSlack = new Float64Array(m + 1).fill(Infinity);
    const used = new Uint8Array(m + 1);

    do {
      used[j0] = 1;
      const i0 = matchedRow[j0]!;
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const reduced = cost[i0 - 1]![j - 1]! - u[i0]! - v[j]!;
        if (reduced < minSlack[j]!) {
          minSlack[j] = reduced;
          way[j] = j0;
        }
        if (minSlack[j]! < delta) {
          delta = minSlack[j]!;
          j1 = j;
        }
      }

      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[matchedRow[j]!] = u[matchedRow[j]!]! + delta;
          v[j] = v[j]! - delta;
        } else {
          minSlack[j] = minSlack[j]! - delta;
        }
      }
      j0 = j1;
    } while (matchedRow[j0] !== 0);

    // Flip the augmenting path.
    do {
      const j1 = way[j0]!;
      matchedRow[j0] = matchedRow[j1]!;
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (matchedRow[j] !== 0) assignment[matchedRow[j]! - 1] = j - 1;
  }
  return assignment;
}

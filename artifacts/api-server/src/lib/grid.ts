// The fan wall is a fixed grid of slots. A flag's stored x/y are its
// column/row indices (0-based). One flag is visible per cell — the most
// recently placed — so a new flag "covers" whatever was there before.
// Keep these in sync with the frontend's src/lib/grid.ts.
export const GRID_COLS = 48;
export const GRID_ROWS = 32;

/** Clamp a value to a valid grid index in [0, max-1]. */
export function clampCell(value: unknown, max: number): number {
  const n = Math.floor(Number(value));
  if (Number.isNaN(n)) return 0;
  return Math.min(max - 1, Math.max(0, n));
}

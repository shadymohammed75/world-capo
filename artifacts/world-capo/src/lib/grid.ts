// Fan-wall grid. A flag's x/y are its column/row indices (0-based).
// One flag is visible per cell — the latest placed covers older ones.
// Keep in sync with the API's src/lib/grid.ts.
export const GRID_COLS = 48;
export const GRID_ROWS = 32;

// On-screen pixel size of one cell on the board.
export const CELL_PX = 40;

export const BOARD_W = GRID_COLS * CELL_PX;
export const BOARD_H = GRID_ROWS * CELL_PX;

export const cellKey = (col: number, row: number) => `${col},${row}`;

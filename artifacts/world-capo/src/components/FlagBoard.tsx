import { useRef, useState, useMemo } from "react";
import { TEAMS } from "@/lib/teams";
import { FlagImg } from "@/components/FlagImg";
import { GRID_COLS, GRID_ROWS, CELL_PX, BOARD_W, BOARD_H, cellKey } from "@/lib/grid";

export interface Cell { col: number; row: number; }

interface FlagBoardProps {
  flags: { teamId: string; x: number; y: number }[];
  height?: number;
  selectable?: boolean;
  selectedCell?: Cell | null;
  selectedTeamId?: string;
  onSelectCell?: (cell: Cell) => void;
}

const flagOf = (teamId: string) => TEAMS.find(t => t.id === teamId)?.flag ?? "";

export function FlagBoard({
  flags,
  height = 320,
  selectable = false,
  selectedCell = null,
  selectedTeamId,
  onSelectCell,
}: FlagBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Pointer tracking — distinguishes a drag (pan) from a tap (select).
  const down = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // One flag per cell (latest wins, in case the list isn't pre-deduped).
  const cellMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of flags) m.set(cellKey(f.x, f.y), f.teamId);
    return m;
  }, [flags]);

  const clampPan = (x: number, y: number, rect: DOMRect) => ({
    x: Math.min(0, Math.max(rect.width - BOARD_W, x)),
    y: Math.min(0, Math.max(rect.height - BOARD_H, y)),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    down.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!down.current || !containerRef.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;
    setPan(clampPan(start.current.panX + dx, start.current.panY + dy, containerRef.current.getBoundingClientRect()));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    down.current = false;
    if (!selectable || moved.current || !onSelectCell || !containerRef.current) return;
    // It was a tap — resolve which cell was hit.
    const rect = containerRef.current.getBoundingClientRect();
    const boardX = e.clientX - rect.left - pan.x;
    const boardY = e.clientY - rect.top - pan.y;
    const col = Math.floor(boardX / CELL_PX);
    const row = Math.floor(boardY / CELL_PX);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      onSelectCell({ col, row });
    }
  };

  const selectedKey = selectedCell ? cellKey(selectedCell.col, selectedCell.row) : null;
  const coveringTeam = selectedKey ? cellMap.get(selectedKey) : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-border/40 bg-[#0a0f0a] touch-none select-none ${selectable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      style={{ height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { down.current = false; }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: BOARD_W,
          height: BOARD_H,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          // Clear, visible cell borders.
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: `${CELL_PX}px ${CELL_PX}px`,
        }}
      >
        {/* Placed flags — one per occupied cell */}
        {Array.from(cellMap.entries()).map(([key, teamId]) => {
          const [col, row] = key.split(",").map(Number);
          const emoji = flagOf(teamId);
          if (!emoji) return null;
          return (
            <div
              key={key}
              className="absolute flex items-center justify-center"
              style={{ left: col * CELL_PX, top: row * CELL_PX, width: CELL_PX, height: CELL_PX }}
            >
              <FlagImg emoji={emoji} size={CELL_PX - 8} alt={teamId} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }} />
            </div>
          );
        })}

        {/* Selected cell highlight (checkout) */}
        {selectable && selectedCell && (
          <div
            className="absolute flex items-center justify-center rounded-sm ring-2 ring-primary z-10"
            style={{
              left: selectedCell.col * CELL_PX,
              top: selectedCell.row * CELL_PX,
              width: CELL_PX,
              height: CELL_PX,
              background: "rgba(74,222,128,0.18)",
            }}
          >
            {selectedTeamId && (
              <FlagImg emoji={flagOf(selectedTeamId)} size={CELL_PX - 6} alt={selectedTeamId} style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,1))" }} />
            )}
          </div>
        )}
      </div>

      {/* Covering indicator */}
      {selectable && coveringTeam && coveringTeam !== selectedTeamId && (
        <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none">
          <span className="bg-primary/90 text-primary-foreground text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1">
            Covering {TEAMS.find(t => t.id === coveringTeam)?.name ?? coveringTeam}'s flag
          </span>
        </div>
      )}

      {!selectable && (
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-muted-foreground uppercase tracking-widest">
            Drag to explore
          </div>
        </div>
      )}
    </div>
  );
}

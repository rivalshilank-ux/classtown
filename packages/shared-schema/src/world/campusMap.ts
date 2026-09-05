export const TILE_SIZE = 32;
export const MAP_COLS = 48;
export const MAP_ROWS = 36;
export const PLAYER_RADIUS = 16;

export type TileType =
  | "grass"
  | "wall"
  | "floor"
  | "plaza"
  | "path"
  | "tree"
  | "bench"
  | "water"
  | "fence"
  | "gate"
  | "counter"
  | "desk"
  | "shelf"
  | "lab_table"
  | "piano"
  | "goal"
  | "track"
  | "stage";

const SOLID_TILES: ReadonlySet<TileType> = new Set([
  "wall",
  "tree",
  "bench",
  "water",
  "fence",
  "counter",
  "desk",
  "shelf",
  "lab_table",
  "piano",
  "goal",
  "stage",
]);

export interface Landmark {
  label: string;
  col: number;
  row: number;
}

/**
 * One named zone per room/outdoor area. Nothing in the game reads these yet —
 * they exist so a future NPC/quest/event system has a stable id to attach to
 * ("spawn this NPC in school.library") instead of a raw tile range.
 */
export interface ZoneDefinition {
  id: string;
  label: string;
  colStart: number;
  rowStart: number;
  colEnd: number;
  rowEnd: number;
}

export type InteractionPointType = "npc" | "quest" | "event" | "generic";

/**
 * A named point future systems can hang behavior off. Populated but inert in
 * v0.1 — nothing reads InteractionPointType yet, it exists so a quest or NPC
 * system doesn't need a new data structure alongside the map, just a filter
 * over this one.
 */
export interface InteractionPoint {
  id: string;
  type: InteractionPointType;
  zoneId: string;
  col: number;
  row: number;
  label: string;
}

export interface SpawnPointDefinition {
  id: string;
  zoneId: string;
  col: number;
  row: number;
}

function tileCenter(col: number, row: number) {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

export const ZONES: readonly ZoneDefinition[] = [
  { id: "school.gate", label: "학교 정문", colStart: 20, rowStart: 31, colEnd: 27, rowEnd: 35 },
  { id: "school.plaza", label: "중앙 광장", colStart: 16, rowStart: 24, colEnd: 31, rowEnd: 29 },
  { id: "school.main-building", label: "본관", colStart: 14, rowStart: 3, colEnd: 33, rowEnd: 19 },
  { id: "school.teacher-room", label: "교무실", colStart: 19, rowStart: 3, colEnd: 28, rowEnd: 8 },
  { id: "school.classroom-a", label: "1반 교실", colStart: 15, rowStart: 9, colEnd: 21, rowEnd: 15 },
  { id: "school.classroom-b", label: "2반 교실", colStart: 26, rowStart: 9, colEnd: 32, rowEnd: 15 },
  { id: "school.main-hall", label: "중앙 복도", colStart: 15, rowStart: 16, colEnd: 32, rowEnd: 18 },
  { id: "school.library", label: "도서관", colStart: 2, rowStart: 14, colEnd: 11, rowEnd: 19 },
  { id: "school.science", label: "과학실", colStart: 2, rowStart: 21, colEnd: 11, rowEnd: 26 },
  { id: "school.music", label: "음악실", colStart: 2, rowStart: 28, colEnd: 11, rowEnd: 33 },
  { id: "school.cafeteria", label: "급식실", colStart: 34, rowStart: 22, colEnd: 45, rowEnd: 29 },
  { id: "school.playground", label: "운동장", colStart: 34, rowStart: 3, colEnd: 46, rowEnd: 13 },
  { id: "school.event", label: "행사 마당", colStart: 14, rowStart: 21, colEnd: 21, rowEnd: 29 },
  { id: "school.park", label: "공원", colStart: 22, rowStart: 31, colEnd: 33, rowEnd: 35 },
];

export function zoneAt(col: number, row: number): ZoneDefinition | null {
  // Zones nest (e.g. "classroom-a" sits entirely inside "main-building"), so
  // the smallest matching zone — not the first one in ZONES — is the correct
  // answer for a given point.
  let best: ZoneDefinition | null = null;
  let bestArea = Infinity;
  for (const zone of ZONES) {
    if (col >= zone.colStart && col <= zone.colEnd && row >= zone.rowStart && row <= zone.rowEnd) {
      const area = (zone.colEnd - zone.colStart) * (zone.rowEnd - zone.rowStart);
      if (area < bestArea) {
        best = zone;
        bestArea = area;
      }
    }
  }
  return best;
}

export const LANDMARKS: readonly Landmark[] = [
  { label: "학교 정문", col: 23, row: 33 },
  { label: "중앙 광장", col: 23, row: 25 },
  { label: "교무실", col: 23, row: 5 },
  { label: "1반 교실", col: 18, row: 11 },
  { label: "2반 교실", col: 29, row: 11 },
  { label: "도서관", col: 6, row: 15 },
  { label: "과학실", col: 6, row: 22 },
  { label: "음악실", col: 6, row: 29 },
  { label: "급식실", col: 39, row: 23 },
  { label: "운동장", col: 40, row: 7 },
  { label: "행사 마당", col: 17, row: 24 },
  { label: "공원", col: 25, row: 34 },
];

export const SPAWN_POINTS: readonly SpawnPointDefinition[] = [
  { id: "school.plaza", zoneId: "school.plaza", col: 23, row: 26 },
  { id: "school.gate", zoneId: "school.gate", col: 23, row: 33 },
  { id: "school.main-building", zoneId: "school.main-hall", col: 23, row: 17 },
  { id: "school.classroom-a", zoneId: "school.classroom-a", col: 18, row: 12 },
  { id: "school.playground", zoneId: "school.playground", col: 40, row: 8 },
];

export const INTERACTION_POINTS: readonly InteractionPoint[] = [
  { id: "sign.library", type: "generic", zoneId: "school.library", col: 6, row: 16, label: "도서관 안내판" },
  { id: "sign.science", type: "generic", zoneId: "school.science", col: 6, row: 23, label: "과학실 안내판" },
  { id: "sign.music", type: "generic", zoneId: "school.music", col: 6, row: 30, label: "음악실 안내판" },
  { id: "sign.cafeteria", type: "generic", zoneId: "school.cafeteria", col: 39, row: 24, label: "급식실 안내판" },
  { id: "sign.playground", type: "generic", zoneId: "school.playground", col: 40, row: 8, label: "운동장 안내판" },
  { id: "sign.teacher-room", type: "generic", zoneId: "school.teacher-room", col: 23, row: 6, label: "교무실 안내판" },
  { id: "notice.plaza", type: "event", zoneId: "school.plaza", col: 23, row: 25, label: "광장 게시판" },
  { id: "stage.event", type: "event", zoneId: "school.event", col: 17, row: 25, label: "행사 무대" },
];

function buildGrid(): TileType[][] {
  const grid: TileType[][] = Array.from({ length: MAP_ROWS }, () =>
    Array<TileType>(MAP_COLS).fill("grass"),
  );

  const setTile = (col: number, row: number, tile: TileType) => {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
      return;
    }
    grid[row]![col] = tile;
  };

  const fillRect = (
    colStart: number,
    rowStart: number,
    colEnd: number,
    rowEnd: number,
    tile: TileType,
  ) => {
    for (let row = rowStart; row <= rowEnd; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        setTile(col, row, tile);
      }
    }
  };

  const rectOutline = (
    colStart: number,
    rowStart: number,
    colEnd: number,
    rowEnd: number,
    tile: TileType,
  ) => {
    for (let col = colStart; col <= colEnd; col++) {
      setTile(col, rowStart, tile);
      setTile(col, rowEnd, tile);
    }
    for (let row = rowStart; row <= rowEnd; row++) {
      setTile(colStart, row, tile);
      setTile(colEnd, row, tile);
    }
  };

  /** A horizontal gap in an otherwise solid row — a doorway. */
  const doorH = (colStart: number, colEnd: number, row: number) => {
    for (let col = colStart; col <= colEnd; col++) {
      setTile(col, row, "floor");
    }
  };

  /** A vertical gap in an otherwise solid column — a doorway. */
  const doorV = (col: number, rowStart: number, rowEnd: number) => {
    for (let row = rowStart; row <= rowEnd; row++) {
      setTile(col, row, "floor");
    }
  };

  // ── World boundary ─────────────────────────────────────────────────────
  rectOutline(0, 0, MAP_COLS - 1, MAP_ROWS - 1, "fence");

  // ── School gate (south edge) ────────────────────────────────────────────
  fillRect(20, 30, 27, 35, "path");
  setTile(23, MAP_ROWS - 1, "gate");
  setTile(24, MAP_ROWS - 1, "gate");
  setTile(20, 31, "wall");
  setTile(20, 32, "wall");
  setTile(27, 31, "wall");
  setTile(27, 32, "wall");

  // Entrance path from the gate up to the plaza.
  fillRect(22, 24, 25, 29, "path");

  // ── Central plaza ───────────────────────────────────────────────────────
  fillRect(16, 24, 31, 29, "plaza");

  // ── Main building ────────────────────────────────────────────────────────
  rectOutline(14, 3, 33, 19, "wall");
  fillRect(15, 4, 32, 18, "floor");
  doorH(23, 24, 19); // south door onto the plaza approach

  // Teacher room — north band of the building, its own small room.
  rectOutline(19, 3, 28, 8, "wall");
  doorH(23, 24, 8);
  setTile(23, 5, "desk");
  setTile(24, 5, "desk");

  // Classroom A (west wing).
  rectOutline(15, 9, 21, 15, "wall");
  doorV(21, 11, 12);
  for (const col of [16, 18, 20]) {
    setTile(col, 11, "desk");
    setTile(col, 13, "desk");
  }

  // Classroom B (east wing) — mirrored.
  rectOutline(26, 9, 32, 15, "wall");
  doorV(26, 11, 12);
  for (const col of [27, 29, 31]) {
    setTile(col, 11, "desk");
    setTile(col, 13, "desk");
  }

  // Main hall — the open corridor tying the two classrooms and both doors
  // together. Already floor from the fillRect above; explicit for clarity.
  fillRect(15, 16, 32, 18, "floor");

  // ── Library (west wing, chained south) ──────────────────────────────────
  rectOutline(2, 14, 11, 19, "wall");
  fillRect(3, 15, 10, 18, "floor");
  doorH(9, 10, 19);
  for (const row of [16, 17]) {
    setTile(3, row, "shelf");
    setTile(4, row, "shelf");
  }
  setTile(7, 17, "shelf");
  setTile(8, 17, "shelf");

  // ── Science room ─────────────────────────────────────────────────────────
  rectOutline(2, 21, 11, 26, "wall");
  fillRect(3, 22, 10, 25, "floor");
  doorH(9, 10, 26);
  for (const col of [4, 6, 8]) {
    setTile(col, 23, "lab_table");
  }

  // ── Music room ────────────────────────────────────────────────────────────
  rectOutline(2, 28, 11, 33, "wall");
  fillRect(3, 29, 10, 32, "floor");
  doorH(9, 10, 33);
  setTile(4, 30, "piano");
  setTile(5, 30, "piano");

  // West-wing connector path linking library / science / music down to the
  // plaza and the event lawn.
  fillRect(10, 20, 13, 20, "path");
  fillRect(10, 27, 13, 27, "path");
  fillRect(10, 33, 13, 33, "path");
  fillRect(12, 15, 13, 33, "path");
  fillRect(13, 24, 15, 27, "path");

  // ── Event area (open lawn between the west wing and the plaza) ──────────
  fillRect(14, 21, 21, 29, "grass");
  setTile(16, 25, "stage");
  setTile(17, 25, "stage");
  setTile(18, 25, "stage");

  // ── Cafeteria (east of the plaza) ────────────────────────────────────────
  rectOutline(34, 22, 45, 29, "wall");
  fillRect(35, 23, 44, 28, "floor");
  doorV(34, 24, 25);
  setTile(37, 24, "counter");
  setTile(38, 24, "counter");
  setTile(39, 24, "counter");
  for (const [col, row] of [
    [41, 25],
    [41, 27],
    [43, 25],
    [43, 27],
  ] as const) {
    setTile(col, row, "desk");
  }
  fillRect(32, 24, 34, 25, "path");

  // ── Playground (northeast) ───────────────────────────────────────────────
  // Reached via the open grass field east of the main building rather than a
  // dedicated path — the building's east wall (col 33) runs the length of
  // that side, so a path punched through rows 3-19 there would need its own
  // door. The field between the playground and the cafeteria is already open.
  rectOutline(34, 3, 46, 13, "track");
  fillRect(35, 4, 45, 12, "grass");
  setTile(37, 8, "goal");
  setTile(43, 8, "goal");

  // ── Park (south of the plaza) ────────────────────────────────────────────
  fillRect(24, 32, 27, 33, "water");
  setTile(22, 34, "bench");
  setTile(29, 34, "bench");
  setTile(22, 32, "tree");
  setTile(31, 33, "tree");
  fillRect(23, 30, 26, 31, "path");

  return grid;
}

export const MAP_GRID: readonly (readonly TileType[])[] = buildGrid();

export function tileTypeAt(col: number, row: number): TileType | null {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
    return null;
  }
  return MAP_GRID[row]![col]!;
}

export function isSolidTile(tile: TileType | null): boolean {
  return tile === null || SOLID_TILES.has(tile);
}

/** Out-of-bounds pixels are treated as solid so players can never leave the map. */
export function isSolidAtPixel(x: number, y: number): boolean {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  return isSolidTile(tileTypeAt(col, row));
}

const DEFAULT_SPAWN = SPAWN_POINTS.find((s) => s.id === "school.plaza")!;

export const SPAWN_COL = DEFAULT_SPAWN.col;
export const SPAWN_ROW = DEFAULT_SPAWN.row;

/** The room's one authoritative spawn today. Named spawns above are data, ready
 * for a future per-class or per-event spawn selection — nothing picks among
 * them yet. */
export const SPAWN_POINT = tileCenter(SPAWN_COL, SPAWN_ROW);

export const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

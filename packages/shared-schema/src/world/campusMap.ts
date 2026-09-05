export const TILE_SIZE = 32;
export const MAP_COLS = 40;
export const MAP_ROWS = 26;
export const PLAYER_RADIUS = 16;

export type TileType =
  | "grass"
  | "wall"
  | "floor"
  | "plaza"
  | "tree"
  | "bench"
  | "water"
  | "fence"
  | "counter";

const SOLID_TILES: ReadonlySet<TileType> = new Set([
  "wall",
  "tree",
  "bench",
  "water",
  "fence",
  "counter",
]);

export interface Landmark {
  label: string;
  col: number;
  row: number;
}

export const LANDMARKS: readonly Landmark[] = [
  { label: "학교 정문", col: 19, row: 9 },
  { label: "도서관", col: 15, row: 6 },
  { label: "교실", col: 23, row: 6 },
  { label: "중앙 광장", col: 19, row: 10 },
  { label: "운동장", col: 7, row: 14 },
  { label: "상점", col: 31, row: 12 },
  { label: "공원", col: 20, row: 20 },
];

function buildGrid(): TileType[][] {
  const grid: TileType[][] = Array.from({ length: MAP_ROWS }, () =>
    Array<TileType>(MAP_COLS).fill("grass"),
  );

  const setTile = (col: number, row: number, tile: TileType) => {
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

  // World boundary — keeps players inside the campus.
  rectOutline(0, 0, MAP_COLS - 1, MAP_ROWS - 1, "fence");

  // School building: outer wall, wood floor interior, one door on the
  // south wall leading to the plaza, and a half-wall hinting at two
  // rooms (library / classroom) without fully partitioning them yet.
  rectOutline(12, 3, 27, 9, "wall");
  fillRect(13, 4, 26, 8, "floor");
  setTile(19, 9, "floor");
  setTile(20, 9, "floor");
  setTile(19, 4, "wall");
  setTile(19, 5, "wall");
  setTile(19, 6, "wall");

  // Central plaza, directly south of the school entrance.
  fillRect(16, 10, 23, 13, "plaza");

  // Playground (west of the plaza).
  setTile(4, 11, "tree");
  setTile(4, 15, "tree");
  setTile(10, 18, "tree");
  setTile(6, 13, "bench");
  setTile(8, 16, "bench");

  // Shop stall (east of the plaza).
  rectOutline(29, 10, 34, 13, "wall");
  fillRect(30, 11, 33, 12, "floor");
  setTile(31, 13, "floor");
  setTile(31, 11, "counter");

  // Park (south of the plaza), with a small pond.
  fillRect(18, 17, 21, 18, "water");
  setTile(15, 20, "bench");
  setTile(24, 20, "bench");
  setTile(14, 18, "tree");
  setTile(26, 17, "tree");

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

export const SPAWN_COL = 19;
export const SPAWN_ROW = 11;

export const SPAWN_POINT = {
  x: SPAWN_COL * TILE_SIZE + TILE_SIZE / 2,
  y: SPAWN_ROW * TILE_SIZE + TILE_SIZE / 2,
};

export const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

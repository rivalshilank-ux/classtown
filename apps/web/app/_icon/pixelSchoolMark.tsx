/**
 * Single source of truth for the ClassTown favicon mark: a pixel-art
 * schoolhouse (cupola, stepped roof, twin windows, door) inside a badge
 * frame with stair-cut corners — the same shape language as the wordmark
 * badge in @classtown/ui's Logo.tsx and the .pixel-corners-sm primitive in
 * globals.css. Colors are the exact tokens from app/globals.css.
 *
 * To change the design: edit ROWS below, then re-derive app/icon.svg from
 * getPixelRects(false) so the static favicon stays in sync (apple-icon.tsx
 * and the icon-192/icon-512 routes read this module directly, so they never
 * drift on their own).
 */
export const GRID_SIZE = 16;

// B = ink-900 border, A = accent-500 badge fill, D = wood-900 roof/body,
// C = cream-400 cupola + windows, . = transparent stair-cut corner
export const ROWS = [
  ".BBBBBBBBBBBBBB.",
  "BAAAAAACCAAAAAAB",
  "BAAADDDDDDDDAAAB",
  "BADDDDDDDDDDDDAB",
  "BADDDDDDDDDDDDAB",
  "BADDCCDDDDCCDDAB",
  "BADDCCDDDDCCDDAB",
  "BADDDDDDDDDDDDAB",
  "BADDDDDDDDDDDDAB",
  "BADDDDDDDDDDDDAB",
  "BADDDDDAADDDDDAB",
  "BADDDDDAADDDDDAB",
  "BADDDDDAADDDDDAB",
  "BAAAAAAAAAAAAAAB",
  "BAAAAAAAAAAAAAAB",
  ".BBBBBBBBBBBBBB.",
] as const;

const COLORS: Record<string, string> = {
  B: "#2a2015", // ink-900
  A: "#e8a13a", // accent-500
  D: "#3a2415", // wood-900
  C: "#fbf3e3", // cream-400
};

interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

/** Merges same-color horizontal runs per row (the grid is small; no need to merge vertically too). */
export function getPixelRects(solid: boolean): PixelRect[] {
  const rects: PixelRect[] = [];
  ROWS.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      let code = row.charAt(x);
      if (solid && code === ".") code = "B";
      if (code === ".") {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < row.length) {
        let next = row.charAt(x + w);
        if (solid && next === ".") next = "B";
        if (next !== code) break;
        w += 1;
      }
      const fill = COLORS[code];
      if (fill) rects.push({ x, y, w, h: 1, fill });
      x += w;
    }
  });
  return rects;
}

/**
 * Renders the mark as absolutely-positioned divs for `next/og`'s
 * ImageResponse (satori), which can't reliably rasterize raw <svg>.
 * Used by apple-icon.tsx and the /icon-192, /icon-512 PWA icon routes.
 *
 * `solid` fills the stair-cut corners with the border color instead of
 * leaving them transparent: iOS and Android apply their own corner
 * masking on top of touch/app icons, so a baked-in transparent corner
 * would show as a gap until that masking kicks in.
 */
export function PixelSchoolMarkPixels({
  size,
  solid = false,
}: {
  size: number;
  solid?: boolean;
}) {
  const cell = size / GRID_SIZE;
  const rects = getPixelRects(solid);
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex" }}>
      {rects.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: r.x * cell,
            top: r.y * cell,
            width: r.w * cell,
            height: r.h * cell,
            background: r.fill,
          }}
        />
      ))}
    </div>
  );
}

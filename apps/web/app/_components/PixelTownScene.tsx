interface PixelTownSceneProps {
  className?: string;
}

/**
 * A small hand-built pixel-grid illustration of the ClassTown world
 * (school, tree, grass, two player dots) — not a photo, not a generic
 * hero gradient. Built as flat SVG rects on a coarse grid so it stays
 * crisp at any scale (shape-rendering: crispEdges, no raster asset).
 */
export function PixelTownScene({ className }: PixelTownSceneProps) {
  return (
    <svg
      viewBox="0 0 64 36"
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="ClassTown 학교 운동장 픽셀 일러스트: 나무와 교사(校舍), 두 명의 플레이어"
    >
      <rect x="0" y="0" width="64" height="24" fill="#d3f0f7" />
      <rect x="0" y="24" width="64" height="12" fill="#5c9c43" />
      <rect x="0" y="24" width="64" height="2" fill="#3f7530" />

      <rect x="50" y="4" width="6" height="6" fill="#e8a13a" />

      <rect x="6" y="14" width="12" height="10" fill="#9b9488" opacity="0.35" />

      <rect x="34" y="10" width="20" height="14" fill="#a06a3a" />
      <rect x="32" y="8" width="24" height="3" fill="#3a2415" />
      <rect x="34" y="5" width="20" height="3" fill="#3a2415" />
      <rect x="42" y="17" width="4" height="7" fill="#3a2415" />
      <rect x="37" y="14" width="4" height="4" fill="#d3f0f7" />
      <rect x="37" y="14" width="4" height="4" fill="none" stroke="#3a2415" strokeWidth="0.6" />
      <rect x="49" y="14" width="4" height="4" fill="#d3f0f7" />
      <rect x="49" y="14" width="4" height="4" fill="none" stroke="#3a2415" strokeWidth="0.6" />

      <rect x="10" y="20" width="3" height="6" fill="#5c3820" />
      <rect x="6" y="12" width="11" height="9" fill="#3f7530" />
      <rect x="8" y="10" width="7" height="3" fill="#3f7530" />

      <circle cx="30" cy="30" r="2.4" fill="#38bdf8" stroke="#3a2415" strokeWidth="0.5" />
      <circle cx="24" cy="32" r="2.4" fill="#94a3b8" stroke="#3a2415" strokeWidth="0.5" />
    </svg>
  );
}

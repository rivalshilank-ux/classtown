"use client";

import dynamic from "next/dynamic";

// Phaser touches `window` at module load time, so this can only ever run
// in the browser — `ssr: false` keeps it (and its import chain) out of
// the server/build-time render pass entirely.
const GameCanvas = dynamic(
  () => import("./GameCanvas").then((mod) => mod.GameCanvas),
  { ssr: false },
);

export default function PlayPage() {
  return <GameCanvas />;
}

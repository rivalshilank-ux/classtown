"use client";

import dynamic from "next/dynamic";

const GameCanvas = dynamic(
  () => import("./GameCanvas").then((mod) => mod.GameCanvas),
  { ssr: false },
);

export default function PlayPage() {
  return <GameCanvas />;
}

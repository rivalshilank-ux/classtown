"use client";

import dynamic from "next/dynamic";

const StudentHome = dynamic(
  () => import("./StudentHome").then((mod) => mod.StudentHome),
  { ssr: false },
);

export default function StudentHomePage() {
  return <StudentHome />;
}

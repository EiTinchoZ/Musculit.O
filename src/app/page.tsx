"use client";

import dynamic from "next/dynamic";

const MusculitApp = dynamic(
  () => import("@/components/musculit-app").then((module) => module.MusculitApp),
  { ssr: false },
);

export default function Home() {
  return <MusculitApp />;
}

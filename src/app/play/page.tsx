import type { Metadata } from "next";
import Game from "@/components/game/Game";

export const metadata: Metadata = { title: "Đang chơi — Balatro Wiki" };

export default function PlayPage() {
  return <Game />;
}

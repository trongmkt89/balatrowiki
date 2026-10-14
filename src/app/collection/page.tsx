import type { Metadata } from "next";
import CollectionView from "@/components/CollectionView";

export const metadata: Metadata = {
  title: "Bộ sưu tập — Joker, Tarot, Planet, Spectral | Balatro Wiki",
  description: "Tra cứu toàn bộ 150 Joker, 22 Tarot, 12 Planet, 18 Spectral, Voucher, Tag, Boss Blind, bộ bài và mức cược kèm mô tả tiếng Việt.",
};

export default function CollectionPage() {
  return <CollectionView />;
}

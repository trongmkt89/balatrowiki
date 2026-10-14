import type { Metadata, Viewport } from "next";
import { Handjet, VT323 } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const pixel = VT323({ weight: "400", subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-pixel", display: "swap" });
const display = Handjet({ weight: ["600", "800"], subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Balatro Wiki — Poker Roguelike chơi trên web",
  description:
    "Chơi game poker roguelike kiểu Balatro ngay trên trình duyệt: 150 Joker, Tarot, Planet, Spectral, Boss Blind, bảng xếp hạng và lưu tiến trình online, không cần tài khoản.",
  applicationName: "Balatro Wiki",
  openGraph: {
    title: "Balatro Wiki — Poker Roguelike",
    description: "Poker roguelike chơi trên trình duyệt, lưu online, không cần tài khoản.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1f3d36",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${pixel.variable} ${display.variable}`}>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}

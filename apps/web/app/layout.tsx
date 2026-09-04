import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Do_Hyeon, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const doHyeon = Do_Hyeon({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-do-hyeon",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClassTown",
  description: "A browser-based 2D multiplayer classroom game.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${doHyeon.variable} ${notoSansKr.variable}`}>
      <body>{children}</body>
    </html>
  );
}

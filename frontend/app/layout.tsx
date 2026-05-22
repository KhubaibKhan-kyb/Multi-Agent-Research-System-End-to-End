/*
  layout.tsx — Root Layout
  ========================
    Next.js App Router requires a root layout. Every page is wrapped by this.
    This is where we load fonts globally so they're available everywhere.
*/

import type { Metadata } from "next";
import { Fraunces, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Load Fraunces for display headings
// variable: true means we use the CSS variable --font-display set in globals.css
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Load DM Serif Display for body serif
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-body",
  display: "swap",
});

// Load JetBrains Mono for mono/code sections
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Page metadata — shown in browser tab and used by search engines
export const metadata: Metadata = {
  title: "Argus — Multi-Agent Research",
  description: "AI-powered research pipeline that searches, reads, writes, and critiques.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSerif.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
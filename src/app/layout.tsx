import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/app/app-providers";
import { getFrontendCapabilities } from "@/lib/config/env";

import "./globals.css";

const displayFont = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display" });
const sansFont = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "GoalGuard — Protect what your money is for",
  description: "Goal-first crypto downside protection with transparent multi-model review.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const capabilities = getFrontendCapabilities();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body><AppProviders capabilities={capabilities}>{children}</AppProviders></body>
    </html>
  );
}

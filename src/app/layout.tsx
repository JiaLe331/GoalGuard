import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/app/app-providers";
import { getFrontendCapabilities } from "@/lib/config/env";
import { themeBootScript } from "@/lib/frontend/theme";

import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "GoalGuard | Protect the purpose behind your ETH",
  description: "Goal-first ETH downside protection with live options, independent review, and a transparent unsigned Base preview.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const capabilities = getFrontendCapabilities();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={manrope.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body><AppProviders capabilities={capabilities}>{children}</AppProviders></body>
    </html>
  );
}

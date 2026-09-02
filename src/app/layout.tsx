import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/app/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "GoalGuard — Protect what your money is for",
  description: "Goal-first crypto downside protection with transparent multi-model review.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/app/app-providers";
import { getFrontendCapabilities } from "@/lib/config/env";

import "./globals.css";

export const metadata: Metadata = {
  title: "GoalGuard — Protect what your money is for",
  description: "Goal-first crypto downside protection with transparent multi-model review.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const capabilities = getFrontendCapabilities();
  return (
    <html lang="en">
      <body><AppProviders capabilities={capabilities}>{children}</AppProviders></body>
    </html>
  );
}

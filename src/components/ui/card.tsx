import type { HTMLAttributes } from "react";

type CardTone = "subtle" | "white" | "accent" | "dark";

const tones: Record<CardTone, string> = {
  subtle: "bg-[var(--feature-card-bg)] text-[color:var(--feature-card-fg)]",
  white: "bg-[var(--white)] text-[color:var(--foreground)]",
  accent: "bg-[var(--accent-soft)] text-[color:var(--accent-foreground)]",
  dark: "bg-[var(--data-card-bg)] text-[color:var(--data-card-fg)]",
};

export function Card({ className = "", tone = "subtle", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-transparent ${tones[tone]} ${className}`}
      {...props}
    />
  );
}

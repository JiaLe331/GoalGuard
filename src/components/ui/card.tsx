import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[1.6rem] border border-white/[0.09] bg-[#15221a]/75 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}
      {...props}
    />
  );
}

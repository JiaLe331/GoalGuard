import type { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="cursor-help underline decoration-dotted underline-offset-4" title={label}>{children}</span>;
}

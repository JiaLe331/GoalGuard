import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const descriptionId = `${htmlFor}-description`;
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-white">{label}</label>
      {children}
      {error ? <p id={descriptionId} className="mt-2 text-xs text-[var(--danger-soft)]">{error}</p> : hint ? <p id={descriptionId} className="mt-2 text-xs leading-5 text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

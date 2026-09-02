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
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-[color:var(--foreground)]">{label}</label>
      {children}
      {error ? <p id={descriptionId} className="mt-2 text-sm text-[color:var(--negative)]" role="alert">{error}</p> : hint ? <p id={descriptionId} className="mt-2 text-sm leading-5 text-[color:var(--foreground-soft)]">{hint}</p> : null}
    </div>
  );
}

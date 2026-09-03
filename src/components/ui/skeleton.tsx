export function Skeleton({ className = "h-16" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-hover)] motion-reduce:animate-none ${className}`} aria-hidden="true" />;
}

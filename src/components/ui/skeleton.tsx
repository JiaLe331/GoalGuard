export function Skeleton({ className = "h-16" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-md)] bg-[var(--border-soft)] ${className}`} aria-hidden="true" />;
}

export function Skeleton({ className = "h-16" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.055] ${className}`} aria-hidden="true" />;
}

import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] text-[color:var(--button-primary-fg)] hover:bg-[var(--button-primary-hover)]",
  secondary: "border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[color:var(--button-secondary-fg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
  ghost: "border border-transparent text-[color:var(--foreground-soft)] hover:bg-[var(--surface-muted)] hover:text-[color:var(--foreground)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className = "", variant = "primary", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-sm font-semibold transition-[background-color,border-color,color,opacity,transform] duration-[var(--duration-press)] active:scale-[0.98] active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  );
});

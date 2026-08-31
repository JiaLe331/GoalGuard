import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#cbff6b] text-[#122016] hover:bg-[#dbff95] shadow-[0_10px_30px_rgba(203,255,107,0.16)]",
  secondary: "border border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1]",
  ghost: "text-[#b9c6bc] hover:bg-white/[0.06] hover:text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className = "", variant = "primary", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cbff6b] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
});

import type { HTMLAttributes, ReactNode } from "react";

const tones = {
  info: "border-white/10 bg-white/[0.045] text-[#c9d5cc]",
  warning: "border-[#ffcd6b]/25 bg-[#ffcd6b]/10 text-[#ffe0a3]",
  error: "border-[#ff837a]/25 bg-[#ff837a]/10 text-[#ffc0bc]",
  success: "border-[#91e95f]/25 bg-[#91e95f]/10 text-[#d7ffb9]",
};

export function Alert({
  title,
  tone = "info",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string; tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${tones[tone]}`} role={tone === "error" ? "alert" : "status"} {...props}>
      {title ? <p className="font-semibold text-white">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

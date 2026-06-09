import { HTMLAttributes, ReactNode } from "react";

type CardAccent = "none" | "red" | "yellow" | "green" | "emerald" | "teal" | "amber";

const ACCENT_CLASS: Record<CardAccent, string> = {
  none: "",
  red: "border-l-4 border-l-rose-400",
  yellow: "border-l-4 border-l-amber-400",
  green: "border-l-4 border-l-emerald-400",
  emerald: "border-l-4 border-l-emerald-400",
  teal: "border-l-4 border-l-teal-400",
  amber: "border-l-4 border-l-amber-400",
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: CardAccent;
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
};

const PADDING_CLASS = {
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export function Card({
  accent = "none",
  interactive = false,
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${PADDING_CLASS[padding]} ${ACCENT_CLASS[accent]} ${interactive ? "transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

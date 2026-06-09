import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
  danger:
    "bg-rose-50 text-rose-500 hover:bg-rose-100 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
  ghost:
    "bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    disabled,
    children,
    className = "",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading && <Spinner size="sm" className="border-current" />}
      {children}
    </button>
  );
});

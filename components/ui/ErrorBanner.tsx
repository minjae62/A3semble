type ErrorBannerProps = {
  message: string;
  variant?: "error" | "warning" | "info";
  className?: string;
};

const VARIANT_CLASS = {
  error: "border-rose-100 bg-rose-50 text-rose-600",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  info: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const ICON: Record<NonNullable<ErrorBannerProps["variant"]>, string> = {
  error: "⚠️",
  warning: "⚠️",
  info: "ℹ️",
};

export function ErrorBanner({
  message,
  variant = "error",
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${VARIANT_CLASS[variant]} ${className}`}
    >
      <span className="mr-1">{ICON[variant]}</span>
      {message}
    </div>
  );
}

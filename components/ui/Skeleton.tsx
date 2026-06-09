import { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** 미리 정해둔 형태 */
  variant?: "text" | "rect" | "circle" | "card";
};

const VARIANT_CLASS: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "h-3 rounded-md",
  rect: "rounded-xl",
  circle: "rounded-full",
  card: "h-24 rounded-2xl",
};

export function Skeleton({
  variant = "text",
  className = "",
  ...rest
}: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="로딩 중"
      className={`animate-pulse bg-slate-200/70 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}

// ============================================================
// 자주 쓰이는 조합 (재고/레시피 리스트용)
// ============================================================
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Skeleton variant="rect" className="h-11 w-11 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-2/3" />
        <Skeleton className="w-1/3" />
      </div>
      <Skeleton variant="rect" className="h-6 w-12 flex-shrink-0" />
    </div>
  );
}

export function SkeletonRecipeCard() {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Skeleton variant="rect" className="h-14 w-14 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-2/3" />
        <Skeleton className="w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton variant="rect" className="h-4 w-12" />
          <Skeleton variant="rect" className="h-4 w-12" />
          <Skeleton variant="rect" className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

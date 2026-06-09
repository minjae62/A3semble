import { ReactNode } from "react";

type EmptyStateProps = {
  emoji?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  emoji = "📭",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <p className="font-bold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 whitespace-pre-line text-sm text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5 inline-block">{action}</div>}
    </div>
  );
}

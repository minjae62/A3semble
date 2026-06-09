import { Spinner } from "./Spinner";

type LoadingScreenProps = {
  message?: string;
  fullHeight?: boolean;
};

export function LoadingScreen({
  message = "불러오는 중...",
  fullHeight = true,
}: LoadingScreenProps) {
  return (
    <div
      className={`flex ${fullHeight ? "min-h-screen" : "py-16"} items-center justify-center bg-slate-50`}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm font-bold text-slate-400">{message}</span>
      </div>
    </div>
  );
}

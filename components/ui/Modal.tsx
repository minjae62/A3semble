"use client";

import { ReactNode, useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 스크린리더용 라벨 */
  label?: string;
};

export function Modal({ open, onClose, children, label = "대화 상자" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // onClose는 호출부에서 매 렌더마다 새로 만들어질 수 있으므로 ref로 보관한다.
  // (효과 의존성에서 빼서 입력 중 불필요한 재실행/포커스 탈취를 막는다)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKey);
    // 백그라운드 스크롤 잠금
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 첫 포커스: 모달이 열릴 때 한 번만 다이얼로그로
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
    // open 전환 시에만 실행 — onClose 변경으로는 재실행하지 않는다
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="w-full max-w-md animate-slide-up rounded-t-3xl border-t border-slate-100 bg-white p-6 pb-10 shadow-2xl outline-none focus:ring-2 focus:ring-emerald-300 md:max-h-[85vh] md:overflow-y-auto md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isLoggedIn,
} from "../../../lib/api";
import {
  postReceiptOcr,
  confirmReceiptOcrItems,
  type ReceiptMatchRow,
  type RecommendedAction,
} from "../../../lib/ocr";
import {
  Button,
  Card,
  ErrorBanner,
  LoadingScreen,
  Modal,
  Spinner,
  useToast,
} from "../../../components/ui";
import { AppShell } from "../../../components/layout";
import {
  categoryNames,
  ingredientData,
} from "../../data/ingredients";
import { searchIngredients } from "../../../lib/api";

// ============================================================
// 각 행별 편집 상태
// ============================================================
type EditableRow = {
  row: ReceiptMatchRow;
  selected: boolean;
  // 사용자가 고른 후보 (needs_confirmation일 때 드롭다운으로 변경 가능)
  selectedCandidateId: number | null;
  quantity: number;
  unit: string;
  expireDate: string;
};

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function parseOcrCount(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function initEditable(row: ReceiptMatchRow): EditableRow {
  const top = row.candidates[0] ?? null;
  return {
    row,
    selected: row.recommended_action === "auto_candidate",
    selectedCandidateId: top?.ingredient_id ?? null,
    quantity: parseOcrCount(row.count),
    unit: "개", // 기본값. 백엔드 응답에 unit이 추가되면 교체
    expireDate: todayPlusDays(7),
  };
}

// ============================================================
// 그룹 메타
// ============================================================
const GROUPS: {
  key: RecommendedAction;
  title: string;
  emoji: string;
  desc: string;
  accent: "green" | "amber" | "red" | "slate";
}[] = [
  {
    key: "auto_candidate",
    title: "자동 등록 가능",
    emoji: "🟢",
    desc: "정확히 일치하는 식재료를 찾았어요",
    accent: "green",
  },
  {
    key: "needs_confirmation",
    title: "확인 필요",
    emoji: "🔶",
    desc: "후보가 있지만 사용자 확인이 필요해요",
    accent: "amber",
  },
  {
    key: "no_candidate",
    title: "후보 없음",
    emoji: "⚪",
    desc: "수동으로 식재료를 선택해주세요",
    accent: "slate",
  },
  {
    key: "excluded",
    title: "비식재료 (제외)",
    emoji: "🗑️",
    desc: "쿠폰·봉투·배송비 등 등록하지 않을 항목",
    accent: "slate",
  },
];

const GROUP_ACCENT_CLASS = {
  green: "border-l-emerald-400 bg-emerald-50/40",
  amber: "border-l-amber-400 bg-amber-50/40",
  red: "border-l-rose-400 bg-rose-50/40",
  slate: "border-l-slate-300 bg-slate-50/40",
} as const;

// ============================================================
// 메인 페이지
// ============================================================
export default function ScanPage() {
  const router = useRouter();
  const toast = useToast();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 수동 picker 모달 — null이면 닫힘, 숫자면 해당 row index를 위해 열림
  const [pickingIndex, setPickingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthChecking(false);
  }, [router]);

  // preview URL 정리 — 외부 리소스(URL.createObjectURL)에서 파생되는 state라 effect 내 setState 정당함
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleUpload(picked: File) {
    setFile(picked);
    setOcrError(null);
    setOcrLoading(true);
    setRows(null);
    try {
      const res = await postReceiptOcr(picked);
      const initial = res.data.items.map(initEditable);
      setRows(initial);
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : "OCR 처리에 실패했습니다.");
    } finally {
      setOcrLoading(false);
    }
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev
    );
  }

  // 그룹별로 분리
  const grouped = useMemo(() => {
    if (!rows) return null;
    const map: Record<RecommendedAction, { row: EditableRow; index: number }[]> = {
      auto_candidate: [],
      needs_confirmation: [],
      no_candidate: [],
      excluded: [],
    };
    rows.forEach((r, idx) => {
      map[r.row.recommended_action].push({ row: r, index: idx });
    });
    return map;
  }, [rows]);

  const selectedCount = useMemo(
    () =>
      rows
        ? rows.filter((r) => r.selected && r.selectedCandidateId !== null).length
        : 0,
    [rows]
  );

  // 수동으로 식재료를 선택했을 때 — 백엔드 검색으로 실제 id 가져와 candidates에 추가
  async function handleManualPick(name: string, category: string) {
    if (pickingIndex === null) return;
    try {
      const search = await searchIngredients({ q: name, category, limit: 5 });
      const found = search.data?.find(
        (i) => i.name === name && i.category === category
      );
      if (!found) {
        toast.show(`백엔드 DB에 "${name}"이(가) 없어요`, "error");
        return;
      }
      setRows((prev) => {
        if (!prev) return prev;
        return prev.map((r, idx) => {
          if (idx !== pickingIndex) return r;
          const newCandidate = {
            ingredient_id: found.id,
            name: found.name,
            score: 100,
          };
          return {
            ...r,
            selected: true,
            selectedCandidateId: found.id,
            row: {
              ...r.row,
              candidates: [newCandidate],
            },
          };
        });
      });
      setPickingIndex(null);
      toast.show(`${name} 선택됨`, "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "선택 실패", "error");
    }
  }

  async function handleBulkRegister() {
  if (!rows) return;

  const targets = rows.filter(
    (r) => r.selected && r.selectedCandidateId !== null
  );

  if (targets.length === 0) {
    toast.show("등록할 항목을 선택해주세요", "error");
    return;
  }

  const confirmItems = targets.map((r) => ({
    ingredient_master_id: r.selectedCandidateId!,
    quantity: r.quantity || 1,
  }));

  setSubmitting(true);

  try {
    const res = await confirmReceiptOcrItems(confirmItems);

    const ok = res.data.registered.length;
    const fail = res.data.errors.length;

    if (fail === 0) {
      toast.show(`${ok}개 재료를 등록했어요`, "success");
      router.push("/fridge");
    } else if (ok > 0) {
      toast.show(`${ok}개 등록, ${fail}개 실패`, "error");
      setSubmitting(false);
    } else {
      toast.show("등록 실패. 다시 시도해주세요", "error");
      setSubmitting(false);
    }
  } catch (e) {
    toast.show(
      e instanceof Error ? e.message : "OCR 확정 등록에 실패했어요",
      "error"
    );
    setSubmitting(false);
  }
}


  if (isAuthChecking) {
    return <LoadingScreen message="인증 정보 확인 중..." />;
  }

  return (
    <AppShell maxWidth="md" background="default" hideBottomNav>
      <div className="bg-white shadow-xl md:rounded-3xl md:my-4">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <Link
            href="/add"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-slate-800">영수증 스캔</h1>
          <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
            BETA
          </span>
        </header>

        <div className="p-5 space-y-5">
          {/* 업로드 영역 */}
          {!file && (
            <Card padding="lg" className="border-2 border-dashed border-slate-200 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
                📷
              </div>
              <p className="font-extrabold text-slate-800">영수증 사진 업로드</p>
              <p className="mt-1 text-xs text-slate-500">
                JPG, PNG · 최대 10MB · 카메라 촬영도 가능해요
              </p>
              <label className="mt-5 inline-block cursor-pointer rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600">
                사진 선택하기
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
              </label>
            </Card>
          )}

          {/* 업로드 후 preview + 진행 상태 */}
          {file && (
            <Card padding="md">
              <div className="flex items-center gap-3">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="영수증 미리보기"
                    className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setRows(null);
                    setOcrError(null);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  disabled={submitting}
                >
                  다시 선택
                </button>
              </div>
            </Card>
          )}

          {/* OCR 진행 중 */}
          {ocrLoading && (
            <Card padding="lg" className="flex items-center gap-3">
              <Spinner size="md" />
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  영수증 분석 중...
                </p>
                <p className="text-xs text-slate-400">
                  CLOVA OCR로 품목을 추출하고 매칭하고 있어요
                </p>
              </div>
            </Card>
          )}

          {/* OCR 에러 */}
          {ocrError && !ocrLoading && (
            <ErrorBanner message={ocrError} />
          )}

          {/* 결과 요약 + 그룹 */}
          {rows && grouped && !ocrLoading && (
            <>
              {/* 요약 */}
              <Card padding="md" accent="emerald">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                  분석 결과
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  총 {rows.length}개 품목
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">
                    자동 {grouped.auto_candidate.length}
                  </span>
                  {grouped.needs_confirmation.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-700">
                      확인 {grouped.needs_confirmation.length}
                    </span>
                  )}
                  {grouped.no_candidate.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">
                      후보없음 {grouped.no_candidate.length}
                    </span>
                  )}
                  {grouped.excluded.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-500">
                      제외 {grouped.excluded.length}
                    </span>
                  )}
                </div>
              </Card>

              {/* 그룹별 리스트 */}
              {GROUPS.map((g) => {
                const list = grouped[g.key];
                if (list.length === 0) return null;
                return (
                  <section key={g.key} className="space-y-2">
                    <div className={`rounded-xl border-l-4 px-3 py-2 ${GROUP_ACCENT_CLASS[g.accent]}`}>
                      <p className="text-sm font-extrabold text-slate-800">
                        {g.emoji} {g.title}{" "}
                        <span className="text-slate-400">({list.length})</span>
                      </p>
                      <p className="text-[11px] text-slate-500">{g.desc}</p>
                    </div>

                    {list.map(({ row: r, index }) => (
                      <RowEditor
                        key={index}
                        row={r}
                        onChange={(patch) => updateRow(index, patch)}
                        onPickManually={() => setPickingIndex(index)}
                      />
                    ))}
                  </section>
                );
              })}
            </>
          )}
        </div>

        {/* 하단 등록 버튼 */}
        {rows && rows.length > 0 && !ocrLoading && (
          <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-slate-100 bg-white p-4 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.06)]">
            <Button
              onClick={handleBulkRegister}
              loading={submitting}
              disabled={selectedCount === 0}
              size="lg"
              fullWidth
              className="!rounded-2xl !py-4"
            >
              {submitting
                ? "등록 중..."
                : selectedCount === 0
                ? "등록할 항목을 선택해주세요"
                : `선택한 ${selectedCount}개 등록하기`}
            </Button>
          </div>
        )}
      </div>

      {/* 수동 식재료 선택 모달 */}
      <ManualPicker
        open={pickingIndex !== null}
        onClose={() => setPickingIndex(null)}
        onPick={handleManualPick}
      />
    </AppShell>
  );
}

// ============================================================
// 수동 picker 모달
// ============================================================
function ManualPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (name: string, category: string) => void;
}) {
  const [cat, setCat] = useState(categoryNames[0]);
  const [q, setQ] = useState("");

  const filtered = ingredientData.filter(
    (i) => i.category === cat && i.name.includes(q.trim())
  );

  return (
    <Modal open={open} onClose={onClose}>
      <div className="mb-3">
        <h2 className="text-base font-extrabold text-slate-800">
          직접 식재료 선택
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          OCR이 찾지 못한 항목을 직접 골라주세요
        </p>
      </div>

      <input
        type="text"
        placeholder="식재료 검색..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white"
      />

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {categoryNames.map((c) => {
          const active = c === cat;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                active
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="py-4 text-sm text-slate-400">검색 결과가 없어요</p>
        ) : (
          filtered.map((item) => (
            <button
              key={`${item.category}-${item.name}`}
              onClick={() => onPick(item.name, item.category)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {item.name}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// 행 에디터 — 그룹에 따라 표시 형태가 다름
// ============================================================
function RowEditor({
  row,
  onChange,
  onPickManually,
}: {
  row: EditableRow;
  onChange: (patch: Partial<EditableRow>) => void;
  onPickManually?: () => void;
}) {
  const action = row.row.recommended_action;
  const selectedCandidate =
    row.row.candidates.find((c) => c.ingredient_id === row.selectedCandidateId) ??
    null;

  if (action === "no_candidate" || action === "excluded") {
    return (
      <Card padding="md" className="border-dashed">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base">
            {action === "excluded" ? "🗑️" : "❔"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-700">
              {row.row.ocr_name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {action === "excluded"
                ? "이 항목은 자동으로 제외됩니다"
                : "일치하는 식재료를 찾지 못했어요"}
            </p>
            {action === "no_candidate" && onPickManually && (
              <button
                onClick={onPickManually}
                className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100"
              >
                직접 선택하기 →
              </button>
            )}
            {/* 사용자가 수동 선택했으면 결과 표시 */}
            {action === "no_candidate" && row.selectedCandidateId !== null && (
              <p className="mt-1.5 text-[11px] font-bold text-emerald-700">
                ✓ {row.row.candidates.find((c) => c.ingredient_id === row.selectedCandidateId)?.name} 선택됨
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // auto_candidate, needs_confirmation
  return (
    <Card padding="md" accent={action === "auto_candidate" ? "green" : "amber"}>
      <div className="flex items-start gap-3">
        <label className="mt-0.5 flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={row.selected}
            onChange={(e) => onChange({ selected: e.target.checked })}
            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-400 line-clamp-1">
            {row.row.ocr_name}
          </p>
          {/* 후보 선택 */}
          {row.row.candidates.length > 1 && action === "needs_confirmation" ? (
            <select
              value={row.selectedCandidateId ?? ""}
              onChange={(e) =>
                onChange({ selectedCandidateId: Number(e.target.value) })
              }
              disabled={!row.selected}
              className="mt-0.5 w-full bg-transparent text-base font-extrabold text-slate-800 outline-none disabled:opacity-50"
            >
              {row.row.candidates.map((c) => (
                <option key={c.ingredient_id} value={c.ingredient_id}>
                  {c.name} ({Math.round(c.score)})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-base font-extrabold text-slate-800">
              {selectedCandidate?.name ?? "—"}
            </p>
          )}

          {/* 수량 + 소비기한 */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                수량
              </label>
              <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) =>
                    onChange({ quantity: parseFloat(e.target.value) || 0 })
                  }
                  disabled={!row.selected}
                  className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none disabled:opacity-50"
                  min={0}
                />
                <input
                  type="text"
                  value={row.unit}
                  onChange={(e) => onChange({ unit: e.target.value })}
                  disabled={!row.selected}
                  className="w-10 bg-transparent text-xs font-bold text-slate-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                소비기한
              </label>
              <div className="w-full rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-bold text-slate-500">
                자동 계산
              </div>
            </div>
          </div>
        </div>

        {selectedCandidate && (
          <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
            {selectedCandidate.score}점
          </span>
        )}
      </div>
    </Card>
  );
}

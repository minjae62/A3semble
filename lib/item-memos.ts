// ============================================================
// 식재료 커스텀 메모 저장
// 백엔드 inventory API에는 메모 필드가 없으므로,
// inventory id 기준으로 브라우저 localStorage에 보관합니다.
// ============================================================

const STORAGE_KEY = "fridge_item_memos";

type MemoMap = Record<string, string>;

function readAll(): MemoMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as MemoMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: MemoMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 저장 공간 초과 등은 조용히 무시 (메모는 부가 기능)
  }
}

// 단일 메모 조회
export function getMemo(id: number): string {
  return readAll()[String(id)] ?? "";
}

// 전체 메모 맵 조회 (리스트에서 한 번에 표시용)
export function getAllMemos(): MemoMap {
  return readAll();
}

// 메모 저장/삭제 (빈 문자열이면 해당 키 삭제)
export function setMemo(id: number, memo: string): void {
  const map = readAll();
  const trimmed = memo.trim();
  if (trimmed) {
    map[String(id)] = trimmed;
  } else {
    delete map[String(id)];
  }
  writeAll(map);
}

// 재고 삭제 시 메모도 함께 정리
export function removeMemo(id: number): void {
  const map = readAll();
  if (map[String(id)] !== undefined) {
    delete map[String(id)];
    writeAll(map);
  }
}

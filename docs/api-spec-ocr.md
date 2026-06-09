# OCR 영수증 인식 & 일괄 등록 API 스펙 (제안)

프론트엔드 → 백엔드 협업용. CLOVA OCR 테스트 결과를 기반으로 작성.
프론트에서 mock 응답으로 UI를 먼저 만들고, 백엔드 구현 후 mock 함수만 실 API로 교체할 계획.

---

## 1. POST `/api/v1/ocr/receipt` — 영수증 OCR 매칭

영수증 이미지를 받아 CLOVA OCR로 품목을 추출하고, `ingredient_master`와 매칭한 결과를 반환.

### 요청

- **Method**: `POST`
- **Auth**: Bearer 토큰 필수
- **Content-Type**: `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `file` | File (image/jpeg, image/png) | Y | 영수증 이미지 (최대 10MB 권장) |

### 응답 (200 OK)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ocr_name": "*CJ 동물복지 유정란",
        "normalized_name": "달걀",
        "count": "1",
        "price": "7900",
        "name_confidence": 0.98,
        "is_excluded": false,
        "is_processed_food": false,
        "match_type": "override",
        "matched_by_keyword": "동물복지 유정란",
        "candidates": [
          { "ingredient_id": 42, "name": "달걀", "score": 100 }
        ],
        "recommended_action": "auto_candidate"
      },
      {
        "ocr_name": "*오늘좋은 1등급 저지",
        "normalized_name": "저지",
        "count": "1",
        "price": "3900",
        "name_confidence": 0.85,
        "is_excluded": false,
        "is_processed_food": false,
        "match_type": "fuzzy",
        "matched_by_keyword": "",
        "candidates": [
          { "ingredient_id": 18, "name": "가지", "score": 50 },
          { "ingredient_id": 92, "name": "낙지", "score": 40 }
        ],
        "recommended_action": "no_candidate"
      }
    ]
  },
  "message": ""
}
```

### `recommended_action` enum

| 값 | 의미 | 프론트 처리 |
| --- | --- | --- |
| `auto_candidate` | top1_score ≥ 90 (또는 override/exact 100점) | 기본 체크된 상태로 표시 |
| `needs_confirmation` | 60 ≤ top1_score < 90 | "이거 맞나요?" 형태로 확인 받음 |
| `no_candidate` | top1_score < 60 또는 OCR 잘림 | 직접 선택 또는 제외 유도 |
| `excluded` | 쿠폰/봉투/배송비 등 비식재료 키워드 | 기본 제외 (사용자가 되살릴 수 있음) |

### `match_type` enum

| 값 | 의미 |
| --- | --- |
| `override` | override keyword 사전으로 강제 매칭 (예: 유정란 → 달걀) |
| `exact` | 정규화 후 ingredient_master와 완전 일치 |
| `fuzzy` | RapidFuzz token_sort_ratio 기반 Top 3 후보 |

### 응답 변경 사항 (테스트 코드와의 차이)

테스트 스크립트는 `top1_id`, `top1_match`, `top1_score`, `top2_*`, `top3_*` 컬럼으로 펼쳐서 반환하지만,
프론트에서 쓰기에는 `candidates: [{ ingredient_id, name, score }]` 배열이 훨씬 다루기 편합니다.
순서는 score 내림차순. 최소 1개 ~ 최대 3개.

### 에러 응답

| 상태 | 원인 |
| --- | --- |
| 400 | 이미지가 아닌 파일, 또는 파일 누락 |
| 413 | 파일 크기 초과 |
| 401 | 토큰 없음/만료 |
| 502 | CLOVA OCR API 실패 (재시도 권장) |
| 500 | 매칭 파이프라인 실패 |

---

## 2. POST `/api/v1/inventory/bulk` — 재고 일괄 등록

OCR 결과에서 사용자가 확인한 식재료들을 한 번에 등록.
지금도 단건 `POST /inventory`를 여러 번 호출하면 되지만, OCR이면 5~15개씩 한꺼번에 들어가므로
네트워크 왕복 줄이고 트랜잭션 보장을 위해 bulk endpoint 권장.

### 요청

- **Method**: `POST`
- **Auth**: Bearer 토큰 필수
- **Content-Type**: `application/json`

```json
{
  "items": [
    {
      "ingredient_master_id": 42,
      "quantity": 10,
      "unit": "개",
      "expire_date": "2026-06-08"
    },
    {
      "ingredient_master_id": 156,
      "quantity": 1,
      "unit": "단",
      "expire_date": "2026-05-22"
    }
  ]
}
```

각 항목 필드는 단건 `POST /inventory`와 동일.

### 응답 (201 Created)

```json
{
  "success": true,
  "data": {
    "created": 2,
    "items": [
      { "id": 101, "ingredient_master_id": 42, "...": "..." },
      { "id": 102, "ingredient_master_id": 156, "...": "..." }
    ]
  },
  "message": "2개 재료가 등록되었습니다."
}
```

응답 `items`의 각 객체는 단건 `POST /inventory` 응답의 `data`와 동일한 형태
(즉 `InventoryItemRaw` — `ingredient`, `traffic_light`, `score` 모두 포함).

### 트랜잭션 동작

전부 성공하거나 전부 롤백 (all-or-nothing). 한 건이라도 실패하면 422 반환:

```json
{
  "success": false,
  "error": {
    "code": "BULK_PARTIAL_FAILURE",
    "message": "2번째 항목 등록 실패: ingredient_master_id 9999 존재하지 않음",
    "failed_index": 1
  }
}
```

---

## 3. 프론트 흐름 요약

1. 사용자가 `/add/scan`에서 사진 업로드 또는 카메라 촬영
2. `POST /api/v1/ocr/receipt` (multipart/form-data)
3. 응답을 3그룹으로 분류해 화면 표시:
   - **자동 후보** (`auto_candidate`): 기본 체크. 사용자는 수량·소비기한만 확인
   - **확인 필요** (`needs_confirmation`): 추천 후보 보여주고 "예/아니오/직접 선택"
   - **후보 없음** (`no_candidate`, `excluded`): 기본 제외. 사용자가 직접 선택 가능
4. "냉장고에 추가" 버튼 → `POST /api/v1/inventory/bulk`로 일괄 등록
5. 성공 시 `/fridge`로 이동, toast로 "N개 재료가 등록되었습니다"

---

## 4. 백엔드 구현 노트 (참고)

- CLOVA OCR Secret Key는 백엔드 환경변수로만 보관 (`CLOVA_OCR_SECRET_KEY`, `CLOVA_OCR_INVOKE_URL`)
- 매칭 로직 (정규화·override·fuzzy)은 노션 OCR 테스트 문서의 Python 코드를 그대로 옮기되,
  `ingredient_master` 조회를 CSV가 아닌 Supabase 테이블 직접 조회로 교체
- override keyword 사전, 제거어, 유의어는 코드 상수로 두고 `docs/`에 사람이 읽기 좋은 표로 유지
- 정확도 개선은 키워드 사전 보완이 핵심 — 새 영수증 케이스로 회귀 테스트셋을 만들어가면 좋음
- bulk endpoint는 SQLAlchemy 세션 트랜잭션 안에서 처리, 한 건 실패 시 rollback

---

## 5. 합의 체크리스트

프론트 작업 시작 전에 백엔드 팀과 다음만 확정되면 됩니다:

- [ ] OCR 엔드포인트 경로 (`/api/v1/ocr/receipt` 제안)
- [ ] OCR 응답에서 `candidates` 배열 형태 채택 (vs. `top1/top2/top3` 펼친 형태)
- [ ] bulk inventory 엔드포인트 추가 여부 (제안: 추가)
- [ ] `recommended_action` enum 4가지 값 채택
- [ ] CLOVA OCR API 호출 응답 시간 SLA (예: p95 5초 이내)

이 5가지에 동의해주시면 프론트는 이 스펙대로 mock 만들어두고 백엔드 완성 후 한 줄 교체로 연동합니다.

const API_BASE =
  "https://port-0-back-end-micz9ngy8b0679ee.sel3.cloudtype.app";

const EMAIL = "user@example.com";
const PASSWORD = "secret123";

// 이번 테스트에 사용할 대표 재고 조합
const INGREDIENT_NAMES = [
  "흑임자",
  "쌀",
  "소금",
  "설탕",
  "마늘",
  "감자",
  "대파",
  "오이",
  "피망",
  "호박",
  "당근",
  "콩",
  "콩나물",
  "고등어",
  "고추장",
  "가지",
  "갈치",
  "건포도",
  "달걀",
];

// 기존 재고를 지우고 이 리스트만 넣을지 여부
const CLEAR_EXISTING = true;

function getQuantityAndUnit(ingredient) {
  const units = ingredient.allowed_units || [];

  if (units.includes("g")) return { quantity: 1000, unit: "g" };
  if (units.includes("개")) return { quantity: 10, unit: "개" };
  if (units.includes("큰술")) return { quantity: 10, unit: "큰술" };
  if (units.includes("작은술")) return { quantity: 10, unit: "작은술" };
  if (units.includes("ml")) return { quantity: 1000, unit: "ml" };
  if (units.includes("마리")) return { quantity: 5, unit: "마리" };
  if (units.includes("봉지")) return { quantity: 5, unit: "봉지" };
  if (units.includes("모")) return { quantity: 5, unit: "모" };
  if (units.includes("장")) return { quantity: 10, unit: "장" };
  if (units.includes("컵")) return { quantity: 10, unit: "컵" };

  return { quantity: 10, unit: units[0] || "개" };
}

function getExpireDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

async function login() {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`로그인 실패: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return body.data.access_token;
}

async function searchIngredient(name) {
  const res = await fetch(
    `${API_BASE}/api/v1/ingredients?q=${encodeURIComponent(name)}&limit=10`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    console.log(`검색 실패: ${name} / ${res.status}`);
    return null;
  }

  const body = await res.json();
  const items = body.data ?? [];

  // 이름이 정확히 같은 식재료 우선 선택
  const exact = items.find((item) => item.name === name);
  return exact ?? items[0] ?? null;
}

async function getInventory(token) {
  const res = await fetch(`${API_BASE}/api/v1/inventory?sort=recommended`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`재고 조회 실패: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  return body.data?.items ?? [];
}

async function deleteInventory(token, inventoryId) {
  const res = await fetch(`${API_BASE}/api/v1/inventory/${inventoryId}`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.log(`삭제 실패 inventory_id=${inventoryId}: ${res.status}`);
  }
}

async function addInventory(token, ingredient) {
  const { quantity, unit } = getQuantityAndUnit(ingredient);

  const res = await fetch(`${API_BASE}/api/v1/inventory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ingredient_master_id: ingredient.id,
      quantity,
      unit,
      expire_date: getExpireDate(),
    }),
  });

  if (!res.ok) {
    console.log(
      `등록 실패: ${ingredient.name} id=${ingredient.id} / ${res.status} / ${await res.text()}`
    );
    return false;
  }

  console.log(`  등록 수량/단위: ${quantity}${unit}`);
  return true;
}

async function main() {
  console.log("로그인 중...");
  const token = await login();

  if (CLEAR_EXISTING) {
    console.log("기존 재고 삭제 중...");
    const inventory = await getInventory(token);

    for (const item of inventory) {
      await deleteInventory(token, item.id);
    }

    console.log(`기존 재고 ${inventory.length}개 삭제 완료`);
  }

  console.log("\n선택한 식재료 재고 등록 시작");

  let successCount = 0;
  const failedNames = [];

  for (const name of INGREDIENT_NAMES) {
    const ingredient = await searchIngredient(name);

    if (!ingredient) {
      console.log(`- ${name}: 백엔드 식재료 DB에서 찾지 못함 → skip`);
      failedNames.push(name);
      continue;
    }

    const ok = await addInventory(token, ingredient);

    if (ok) {
      successCount++;
      console.log(
        `- ${name}: 등록 완료 → ${ingredient.name} / id=${ingredient.id} / category=${ingredient.category}`
      );
    } else {
      failedNames.push(name);
    }
  }

  console.log("\n===== 완료 =====");
  console.log(`등록 성공: ${successCount}/${INGREDIENT_NAMES.length}개`);

  if (failedNames.length > 0) {
    console.log(`등록 실패/검색 실패: ${failedNames.join(", ")}`);
  }

  console.log("\n이제 아래 페이지에서 재고와 추천 결과를 확인하세요.");
  console.log("냉장고: http://localhost:3000/fridge");
  console.log("레시피: http://localhost:3000/recipe");
}

main().catch((err) => {
  console.error(err);
});
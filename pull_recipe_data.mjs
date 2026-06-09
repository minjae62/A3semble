// ============================================================
// 시나리오 3 재측정용 — 라이브 백엔드에서 실제 데이터만 한 번 받아온다.
// 실행: 프로젝트 폴더에서  node pull_recipe_data.mjs
// 결과: ./sim-data/ 폴더에 JSON 저장 (recipes / ingredients / inventory / scored)
// 네트워크가 되는 로컬 PC에서 실행하세요. (Claude 샌드박스는 cloudtype DNS가 막혀 있음)
// ============================================================
import { writeFileSync, mkdirSync } from "node:fs";

const API_BASE = "https://port-0-back-end-micz9ngy8b0679ee.sel3.cloudtype.app";
const EMAIL = "user@example.com";
const PASSWORD = "secret123";

const OUT = "./sim-data";
mkdirSync(OUT, { recursive: true });

async function j(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function main() {
  console.log("1) 로그인...");
  const login = await j("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = login.data.access_token;
  const H = { accept: "application/json", Authorization: `Bearer ${token}` };

  console.log("2) 식재료 마스터(ingredients)...");
  const ing = await j("/api/v1/ingredients", { headers: H });
  const ingItems = ing.data?.items ?? ing.data ?? [];
  writeFileSync(`${OUT}/ingredients.json`, JSON.stringify(ingItems, null, 2));
  console.log(`   -> ${ingItems.length}종 저장`);

  console.log("3) 현재 재고(inventory)...");
  const inv = await j("/api/v1/inventory?sort=recommended", { headers: H });
  const invItems = inv.data?.items ?? [];
  writeFileSync(`${OUT}/inventory.json`, JSON.stringify(invItems, null, 2));
  console.log(`   -> ${invItems.length}건 저장`);

  console.log("4) 추천 레시피 목록 (min_match_rate=0, 전체)...");
  let listItems = [];
  let total = 0;
  for (const lim of [1000, 500, 200, 50]) {
    try {
      const r = await j(`/api/v1/recipes?limit=${lim}&min_match_rate=0`, { headers: H });
      listItems = r.data?.items ?? [];
      total = r.data?.total ?? listItems.length;
      console.log(`   limit=${lim} -> total=${total}, returned=${listItems.length}`);
      if (listItems.length) break;
    } catch (e) { console.log(`   limit=${lim} 실패: ${e.message}`); }
  }
  // 백엔드가 현재 재고 기준으로 매긴 score/rank를 그대로 보존 (로컬 검증용)
  writeFileSync(`${OUT}/recipes_scored.json`, JSON.stringify({ total, items: listItems }, null, 2));

  console.log("5) 레시피 상세 (재료 정량·단계) 수집...");
  const details = [];
  for (let i = 0; i < listItems.length; i++) {
    const id = listItems[i].id;
    try {
      const d = await j(`/api/v1/recipes/${id}`, { headers: H });
      details.push(d.data);
    } catch (e) {
      console.log(`   recipe ${id} 상세 실패: ${e.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`   ...${i + 1}/${listItems.length}`);
    await new Promise((r) => setTimeout(r, 40)); // 서버 과부하 방지
  }
  writeFileSync(`${OUT}/recipes_detail.json`, JSON.stringify(details, null, 2));
  console.log(`   -> 상세 ${details.length}건 저장`);

  console.log("\n완료. ./sim-data/ 안에 ingredients.json, inventory.json, recipes_scored.json, recipes_detail.json 생성됨.");
  console.log("이 폴더가 OneDrive로 동기화되면 Claude가 이어서 시뮬레이션을 돌립니다.");
}

main().catch((e) => { console.error("오류:", e.message); process.exit(1); });

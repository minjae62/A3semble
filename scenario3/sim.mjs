// ============================================================
// 테스트 시나리오 3 — 실제 API 데이터 기반 폐기량 절감 재측정
// 조건: 매일 2회 요리 · 주1회 장보기 · 30일 · 유통기한 3주(21일) 이상 장기보관 재료 제외
// 백엔드 검증식: itemScore = risk * grams / ((Dday+1)^2 + 1)
//              recipeScore = sum(보유 매칭 재료의 itemScore)  (ratio 1.0000 확인됨)
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
const DIR = decodeURIComponent(new URL("../sim-data", import.meta.url).pathname);
const OUT = decodeURIComponent(new URL("./", import.meta.url).pathname);
const load = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));

const CFG = {
  users: 1000,
  days: 30,                  // 한 달
  pantrySize: 22,
  cooksPerDay: 2,            // 매일 2회 요리
  restockEvery: 7,           // 일주일마다 장보기
  restockCount: 8,           // 주간 장보기 1회분
  minMatch: 1,
  seed: 20260606,
  recipeLimit: null,
  excludeShelfDaysGte: 21,   // 유통기한 3주(21일) 이상 장기보관 재료 제외
};

const UNIT_G = { g:1, ml:1, "개":120, "장":15, "조각":30, "큰술":15, "작은술":5, "봉지":100, "컵":200, "쪽":5, "마리":250, "줄":40, "포기":1000, "단":200, "공기":210, "스푼":12 };
const toG = (q, u) => (parseFloat(q) || 0) * (UNIT_G[u] ?? 50);

const ingMaster = load("ingredients.json");
const recipes = load("recipes_scored.json").items;
const masterById = new Map(ingMaster.map((g) => [g.id, g]));

const recipeIngIds = [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.ingredient_master_id)))]
  .filter((id) => masterById.has(id) && (masterById.get(id).default_shelf_days | 0) < CFG.excludeShelfDaysGte);
const freq = new Map();
for (const r of recipes) for (const i of r.ingredients) freq.set(i.ingredient_master_id, (freq.get(i.ingredient_master_id) || 0) + 1);
const pool = recipeIngIds.map((id) => ({ id, w: freq.get(id) || 1, g: masterById.get(id) }));
const poolTotW = pool.reduce((a, p) => a + p.w, 0);

const recipeReq = recipes.map((r) => ({
  id: r.id,
  name: r.name,
  req: r.ingredients
    .filter((i) => masterById.has(i.ingredient_master_id))
    .map((i) => ({ mid: i.ingredient_master_id, g: toG(i.quantity, i.unit) }))
    .filter((x) => x.g > 0),
}));

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng) {
  let x = rng() * poolTotW;
  for (const p of pool) { x -= p.w; if (x <= 0) return p; }
  return pool[pool.length - 1];
}

function makeLot(rng, day) {
  const p = pickWeighted(rng);
  const grams = 200 + Math.floor(rng() * 800);
  const shelf = Math.max(1, p.g.default_shelf_days | 0);
  const used = Math.floor(rng() * Math.min(shelf, 14));
  const expireDay = day + Math.max(1, shelf - used);
  return { mid: p.id, grams, risk: parseFloat(p.g.risk_factor) || 0, expireDay };
}

function itemScore(lot, day) {
  const dday = lot.expireDay - day;
  return (lot.risk * lot.grams) / ((dday + 1) * (dday + 1) + 1);
}

function buildInputs(rng, cfg) {
  const initial = [];
  for (let i = 0; i < cfg.pantrySize; i++) initial.push(makeLot(rng, 0));
  const restocks = [];
  const randPicks = [];
  for (let d = 0; d < cfg.days; d++) {
    if (d > 0 && d % cfg.restockEvery === 0) {
      const items = [];
      for (let k = 0; k < cfg.restockCount; k++) items.push(makeLot(rng, d));
      restocks.push({ day: d, items });
    }
    const day = [];
    for (let c = 0; c < cfg.cooksPerDay; c++) day.push(Math.floor(rng() * recipeReq.length));
    randPicks.push(day);
  }
  return { initial, restocks, randPicks };
}

function cookDeduct(pantry, recipe) {
  for (const need of recipe.req) {
    let remain = need.g;
    const lots = pantry.filter((l) => l.mid === need.mid && l.grams > 0).sort((a, b) => a.expireDay - b.expireDay);
    for (const lot of lots) { if (remain <= 0) break; const take = Math.min(lot.grams, remain); lot.grams -= take; remain -= take; }
  }
}

function matchedCount(pantry, recipe) {
  const have = new Set(pantry.filter((l) => l.grams > 0).map((l) => l.mid));
  let c = 0;
  for (const need of recipe.req) if (have.has(need.mid)) c++;
  return c;
}

function chooseAndCook(pantry, strategy, recs, cfg, d, randPick) {
  const candidates = recs.map((r) => ({ r, m: matchedCount(pantry, r) })).filter((c) => c.m >= cfg.minMatch);
  if (!candidates.length) return;
  let chosen;
  if (strategy === "alpha") {
    const have = new Map();
    for (const l of pantry) if (l.grams > 0) have.set(l.mid, (have.get(l.mid) || 0) + itemScore(l, d));
    let best = -1;
    for (const c of candidates) {
      let s = 0;
      for (const need of c.r.req) s += have.get(need.mid) || 0;
      if (s > best) { best = s; chosen = c.r; }
    }
  } else {
    chosen = candidates[randPick % candidates.length].r;
  }
  cookDeduct(pantry, chosen);
}

function runArm(inputs, strategy, cfg, recs) {
  let pantry = inputs.initial.map((l) => ({ ...l }));
  let waste = 0;
  let stocked = inputs.initial.reduce((a, l) => a + l.grams, 0);
  for (let d = 0; d < cfg.days; d++) {
    const rs = inputs.restocks.find((r) => r.day === d);
    if (rs) for (const it of rs.items) { pantry.push({ ...it }); stocked += it.grams; }
    for (let c = 0; c < cfg.cooksPerDay; c++) {
      chooseAndCook(pantry, strategy, recs, cfg, d, inputs.randPicks[d][c]);
    }
    for (const l of pantry) if (l.grams > 0 && l.expireDay <= d) { waste += l.grams; l.grams = 0; }
    pantry = pantry.filter((l) => l.grams > 0.0001);
  }
  return { waste, stocked };
}

function simulate(cfg = CFG) {
  const rng = mulberry32(cfg.seed);
  const recs = cfg.recipeLimit ? recipeReq.slice(0, cfg.recipeLimit) : recipeReq;
  let wAlpha = 0, wRand = 0, stockTot = 0, improved = 0, equal = 0;
  for (let u = 0; u < cfg.users; u++) {
    const inputs = buildInputs(rng, cfg);
    const a = runArm(inputs, "alpha", cfg, recs);
    const b = runArm(inputs, "random", cfg, recs);
    wAlpha += a.waste; wRand += b.waste; stockTot += a.stocked;
    if (a.waste < b.waste - 1e-6) improved++;
    else if (Math.abs(a.waste - b.waste) <= 1e-6) equal++;
  }
  const reduction = (wRand - wAlpha) / wRand;
  return {
    users: cfg.users, days: cfg.days, cooksPerDay: cfg.cooksPerDay,
    wasteRandom_g: wRand, wasteAlpha_g: wAlpha,
    avgRandom_g: wRand / cfg.users, avgAlpha_g: wAlpha / cfg.users,
    reductionPct: reduction * 100,
    wasteRateRandom: wRand / stockTot, wasteRateAlpha: wAlpha / stockTot,
    improvedUsersPct: (improved / cfg.users) * 100,
    equalUsersPct: (equal / cfg.users) * 100,
  };
}

console.log(`재료풀(신선, 유통<${CFG.excludeShelfDaysGte}일): ${pool.length}종`);
const main = simulate();
console.log("=== 메인 결과 (매일 2회 요리·주1회 장보기·30일·신선재료만) ===");
console.log(JSON.stringify(main, null, 2));

const pick = (r) => ({ reductionPct: +r.reductionPct.toFixed(2), avgRandom_g: Math.round(r.avgRandom_g), avgAlpha_g: Math.round(r.avgAlpha_g), improvedPct: +r.improvedUsersPct.toFixed(1) });
function sweep(name, values, apply) {
  return values.map((v) => ({ [name]: v, ...pick(simulate({ ...CFG, ...apply(v) })) }));
}
const sweeps = {
  recipeCount: sweep("recipeCount", [10, 20, 30, 40, 50], (v) => ({ recipeLimit: v, users: 600 })),
  cooksPerDay: sweep("cooksPerDay", [1, 2, 3, 4], (v) => ({ cooksPerDay: v, users: 600 })),
  pantrySize: sweep("pantrySize", [12, 18, 22, 28, 36], (v) => ({ pantrySize: v, users: 600 })),
};
console.log("\n=== 민감도: 레시피 수 ==="); console.table(sweeps.recipeCount);
console.log("=== 민감도: 하루 요리 횟수 ==="); console.table(sweeps.cooksPerDay);
console.log("=== 민감도: pantry 크기 ==="); console.table(sweeps.pantrySize);

writeFileSync(`${OUT}/sim_results.json`, JSON.stringify({ config: CFG, main, sweeps, meta: { recipes: recipes.length, ingredientPool: pool.length, master: ingMaster.length, note: "2 cooks/day, weekly restock(7d), exclude shelf>=21d", backendFormula: "risk*g/((Dday+1)^2+1)" } }, null, 2));
console.log("\nsaved sim_results.json");

// 3-전략 비교: 무작위 / 단순 소비기한(날짜 임박순) / α-스코어(위험계수·수량 가중)
import { readFileSync, writeFileSync } from "node:fs";
const DIR = decodeURIComponent(new URL("../sim-data", import.meta.url).pathname);
const load = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
const CFG = { users:1000, days:30, pantrySize:22, cooksPerDay:2, restockEvery:7, restockCount:8, minMatch:1, seed:20260606, excludeShelfDaysGte:21 };
const UNIT_G = { g:1, ml:1, "개":120, "장":15, "조각":30, "큰술":15, "작은술":5, "봉지":100, "컵":200, "쪽":5, "마리":250, "줄":40, "포기":1000, "단":200, "공기":210, "스푼":12 };
const toG = (q,u)=>(parseFloat(q)||0)*(UNIT_G[u]??50);
const ingMaster = load("ingredients.json");
const recipes = load("recipes_scored.json").items;
const masterById = new Map(ingMaster.map(g=>[g.id,g]));
const recipeIngIds=[...new Set(recipes.flatMap(r=>r.ingredients.map(i=>i.ingredient_master_id)))].filter(id=>masterById.has(id)&&(masterById.get(id).default_shelf_days|0)<CFG.excludeShelfDaysGte);
const freq=new Map(); for(const r of recipes) for(const i of r.ingredients) freq.set(i.ingredient_master_id,(freq.get(i.ingredient_master_id)||0)+1);
const pool=recipeIngIds.map(id=>({id,w:freq.get(id)||1,g:masterById.get(id)})); const poolTotW=pool.reduce((a,p)=>a+p.w,0);
const recipeReq=recipes.map(r=>({id:r.id,name:r.name,req:r.ingredients.filter(i=>masterById.has(i.ingredient_master_id)).map(i=>({mid:i.ingredient_master_id,g:toG(i.quantity,i.unit)})).filter(x=>x.g>0)}));
function mulberry32(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function pickWeighted(rng){let x=rng()*poolTotW;for(const p of pool){x-=p.w;if(x<=0)return p;}return pool[pool.length-1];}
function makeLot(rng,day){const p=pickWeighted(rng);const grams=200+Math.floor(rng()*800);const shelf=Math.max(1,p.g.default_shelf_days|0);const used=Math.floor(rng()*Math.min(shelf,14));return {mid:p.id,grams,risk:parseFloat(p.g.risk_factor)||0,expireDay:day+Math.max(1,shelf-used)};}
const alphaScore=(lot,day)=>{const d=lot.expireDay-day;return lot.risk*lot.grams/((d+1)*(d+1)+1);};
const expiryUrg=(lot,day)=>{const d=lot.expireDay-day;return 1/(d+1);}; // 단순 소비기한: 날짜 임박도만
function buildInputs(rng,cfg){const initial=[];for(let i=0;i<cfg.pantrySize;i++)initial.push(makeLot(rng,0));const restocks=[],randPicks=[];for(let d=0;d<cfg.days;d++){if(d>0&&d%cfg.restockEvery===0){const items=[];for(let k=0;k<cfg.restockCount;k++)items.push(makeLot(rng,d));restocks.push({day:d,items});}const day=[];for(let c=0;c<cfg.cooksPerDay;c++)day.push(Math.floor(rng()*recipeReq.length));randPicks.push(day);}return {initial,restocks,randPicks};}
function cookDeduct(pantry,recipe){for(const need of recipe.req){let remain=need.g;const lots=pantry.filter(l=>l.mid===need.mid&&l.grams>0).sort((a,b)=>a.expireDay-b.expireDay);for(const lot of lots){if(remain<=0)break;const take=Math.min(lot.grams,remain);lot.grams-=take;remain-=take;}}}
function matched(pantry,recipe){const have=new Set(pantry.filter(l=>l.grams>0).map(l=>l.mid));let c=0;for(const need of recipe.req)if(have.has(need.mid))c++;return c;}
function chooseCook(pantry,strategy,recs,cfg,d,randPick){
  const cand=recs.map(r=>({r,m:matched(pantry,r)})).filter(c=>c.m>=cfg.minMatch);
  if(!cand.length)return;
  let chosen;
  if(strategy==="random"){chosen=cand[randPick%cand.length].r;}
  else{
    const sf = strategy==="alpha"?alphaScore:expiryUrg;
    const have=new Map();
    for(const l of pantry) if(l.grams>0) have.set(l.mid,(have.get(l.mid)||0)+sf(l,d));
    let best=-1;
    for(const c of cand){let s=0;for(const need of c.r.req)s+=have.get(need.mid)||0;if(s>best){best=s;chosen=c.r;}}
  }
  cookDeduct(pantry,chosen);
}
function runArm(inputs,strategy,cfg,recs){let pantry=inputs.initial.map(l=>({...l}));let waste=0,wasteRisk=0,stocked=inputs.initial.reduce((a,l)=>a+l.grams,0),stockedRisk=inputs.initial.reduce((a,l)=>a+l.risk*l.grams,0);
  for(let d=0;d<cfg.days;d++){const rs=inputs.restocks.find(r=>r.day===d);if(rs)for(const it of rs.items){pantry.push({...it});stocked+=it.grams;stockedRisk+=it.risk*it.grams;}
    for(let c=0;c<cfg.cooksPerDay;c++)chooseCook(pantry,strategy,recs,cfg,d,inputs.randPicks[d][c]);
    for(const l of pantry)if(l.grams>0&&l.expireDay<=d){waste+=l.grams;wasteRisk+=l.risk*l.grams;l.grams=0;}pantry=pantry.filter(l=>l.grams>0.0001);}
  return {waste,wasteRisk,stocked,stockedRisk};}
const rng=mulberry32(CFG.seed); const recs=recipeReq;
let wR=0,wE=0,wA=0,st=0, rwR=0,rwE=0,rwA=0,stR=0, aBetterE=0, aBetterR=0, eBetterR=0, aBetterE_risk=0;
for(let u=0;u<CFG.users;u++){const inp=buildInputs(rng,CFG);
  const R=runArm(inp,"random",CFG,recs),E=runArm(inp,"expiry",CFG,recs),A=runArm(inp,"alpha",CFG,recs);
  wR+=R.waste;wE+=E.waste;wA+=A.waste;st+=A.stocked;
  rwR+=R.wasteRisk;rwE+=E.wasteRisk;rwA+=A.wasteRisk;stR+=A.stockedRisk;
  if(A.waste<E.waste-1e-6)aBetterE++; if(A.waste<R.waste-1e-6)aBetterR++; if(E.waste<R.waste-1e-6)eBetterR++; if(A.wasteRisk<E.wasteRisk-1e-6)aBetterE_risk++;}
const U=CFG.users;
const out={
  users:U,days:CFG.days,cooksPerDay:CFG.cooksPerDay,
  avg:{random:wR/U, expiry:wE/U, alpha:wA/U},
  wasteRate:{random:wR/st, expiry:wE/st, alpha:wA/st},
  reduction:{ alpha_vs_random:(wR-wA)/wR*100, alpha_vs_expiry:(wE-wA)/wE*100, expiry_vs_random:(wR-wE)/wR*100 },
  improvedPct:{ alpha_over_expiry:aBetterE/U*100, alpha_over_random:aBetterR/U*100, expiry_over_random:eBetterR/U*100, alpha_over_expiry_risk:aBetterE_risk/U*100 },
  riskWeighted:{ random:rwR/U, expiry:rwE/U, alpha:rwA/U,
    alpha_vs_expiry_pct:(rwE-rwA)/rwE*100, alpha_vs_random_pct:(rwR-rwA)/rwR*100, expiry_vs_random_pct:(rwR-rwE)/rwR*100 },
  stockedPerUser: st/U,
};
console.log(JSON.stringify(out,null,2));
writeFileSync("/sessions/sweet-blissful-hamilton/mnt/outputs/sim_results3.json", JSON.stringify(out,null,2));

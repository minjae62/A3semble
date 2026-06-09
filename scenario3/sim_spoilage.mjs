// 위험계수 등급별 폐기량 비교: 무작위 / 단순 소비기한 / α-스코어
import { readFileSync, writeFileSync } from "node:fs";
const DIR = decodeURIComponent(new URL("../sim-data", import.meta.url).pathname);
const load = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
const CFG = { users:1000, days:30, pantrySize:22, cooksPerDay:2, restockEvery:7, restockCount:8, minMatch:1, seed:20260606, excludeShelfDaysGte:21 };
const UNIT_G={g:1,ml:1,"개":120,"장":15,"조각":30,"큰술":15,"작은술":5,"봉지":100,"컵":200,"쪽":5,"마리":250,"줄":40,"포기":1000,"단":200,"공기":210,"스푼":12};
const toG=(q,u)=>(parseFloat(q)||0)*(UNIT_G[u]??50);
const ingMaster=load("ingredients.json"), recipes=load("recipes_scored.json").items;
const masterById=new Map(ingMaster.map(g=>[g.id,g]));
const ids=[...new Set(recipes.flatMap(r=>r.ingredients.map(i=>i.ingredient_master_id)))].filter(id=>masterById.has(id)&&(masterById.get(id).default_shelf_days|0)<CFG.excludeShelfDaysGte);
const freq=new Map(); for(const r of recipes)for(const i of r.ingredients)freq.set(i.ingredient_master_id,(freq.get(i.ingredient_master_id)||0)+1);
const pool=ids.map(id=>({id,w:freq.get(id)||1,g:masterById.get(id)})); const poolTotW=pool.reduce((a,p)=>a+p.w,0);
const recipeReq=recipes.map(r=>({id:r.id,req:r.ingredients.filter(i=>masterById.has(i.ingredient_master_id)).map(i=>({mid:i.ingredient_master_id,g:toG(i.quantity,i.unit)})).filter(x=>x.g>0)}));
function mb(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function pick(rng){let x=rng()*poolTotW;for(const p of pool){x-=p.w;if(x<=0)return p;}return pool.at(-1);}
function makeLot(rng,day){const p=pick(rng);const grams=200+Math.floor(rng()*800);const sh=Math.max(1,p.g.default_shelf_days|0);const used=Math.floor(rng()*Math.min(sh,14));return{mid:p.id,grams,risk:parseFloat(p.g.risk_factor)||0,expireDay:day+Math.max(1,sh-used)};}
const alphaS=(l,d)=>l.risk*l.grams/((l.expireDay-d+1)**2+1);
const expS=(l,d)=>1/((l.expireDay-d)+1);
const RTIERS=[3,2,1,0.1];
function buildInputs(rng,cfg){const initial=[];for(let i=0;i<cfg.pantrySize;i++)initial.push(makeLot(rng,0));const restocks=[],rp=[];for(let d=0;d<cfg.days;d++){if(d>0&&d%cfg.restockEvery===0){const items=[];for(let k=0;k<cfg.restockCount;k++)items.push(makeLot(rng,d));restocks.push({day:d,items});}const day=[];for(let c=0;c<cfg.cooksPerDay;c++)day.push(Math.floor(rng()*recipeReq.length));rp.push(day);}return{initial,restocks,randPicks:rp};}
function deduct(p,r){for(const need of r.req){let rem=need.g;const lots=p.filter(l=>l.mid===need.mid&&l.grams>0).sort((a,b)=>a.expireDay-b.expireDay);for(const lot of lots){if(rem<=0)break;const t=Math.min(lot.grams,rem);lot.grams-=t;rem-=t;}}}
function mcount(p,r){const have=new Set(p.filter(l=>l.grams>0).map(l=>l.mid));let c=0;for(const n of r.req)if(have.has(n.mid))c++;return c;}
function choose(p,strat,recs,cfg,d,rp){const cand=recs.map(r=>({r,m:mcount(p,r)})).filter(c=>c.m>=cfg.minMatch);if(!cand.length)return;let ch;if(strat==="random"){ch=cand[rp%cand.length].r;}else{const sf=strat==="alpha"?alphaS:expS;const have=new Map();for(const l of p)if(l.grams>0)have.set(l.mid,(have.get(l.mid)||0)+sf(l,d));let best=-1;for(const c of cand){let s=0;for(const n of c.r.req)s+=have.get(n.mid)||0;if(s>best){best=s;ch=c.r;}}}deduct(p,ch);}
function runArm(inp,strat,cfg,recs){let p=inp.initial.map(l=>({...l}));const wByR={3:0,2:0,1:0,0.1:0,other:0};const sByR={3:0,2:0,1:0,0.1:0,other:0};
  const bucket=(o,risk,g)=>{o[RTIERS.includes(risk)?risk:"other"]+=g;};
  for(const l of inp.initial)bucket(sByR,l.risk,l.grams);
  for(let d=0;d<cfg.days;d++){const rs=inp.restocks.find(r=>r.day===d);if(rs)for(const it of rs.items){p.push({...it});bucket(sByR,it.risk,it.grams);}
    for(let c=0;c<cfg.cooksPerDay;c++)choose(p,strat,recs,cfg,d,inp.randPicks[d][c]);
    for(const l of p)if(l.grams>0&&l.expireDay<=d){bucket(wByR,l.risk,l.grams);l.grams=0;}p=p.filter(l=>l.grams>0.0001);}
  return{wByR,sByR};}
const rng=mb(CFG.seed),recs=recipeReq,U=CFG.users;
const agg={random:{3:0,2:0,1:0,0.1:0,other:0},expiry:{3:0,2:0,1:0,0.1:0,other:0},alpha:{3:0,2:0,1:0,0.1:0,other:0}};
const stock={3:0,2:0,1:0,0.1:0,other:0};
for(let u=0;u<U;u++){const inp=buildInputs(rng,CFG);
  for(const s of["random","expiry","alpha"]){const r=runArm(inp,s,CFG,recs);for(const k in r.wByR)agg[s][k]+=r.wByR[k];if(s==="alpha")for(const k in r.sByR)stock[k]+=r.sByR[k];}}
const per=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v/U]));
const out={users:U, note:"위험계수 등급별 1인 월 폐기량(g). 3=육류·어패류·유제품, 2=고수분·가열, 1=장기농산물, 0.1=건조·가공",
  stockedByRisk:per(stock), wasteByRisk:{random:per(agg.random),expiry:per(agg.expiry),alpha:per(agg.alpha)},
  highRisk_g:{random:agg.random[3]/U, expiry:agg.expiry[3]/U, alpha:agg.alpha[3]/U},
};
out.highRisk_reduction={ alpha_vs_random:(out.highRisk_g.random-out.highRisk_g.alpha)/out.highRisk_g.random*100,
  alpha_vs_expiry:(out.highRisk_g.expiry-out.highRisk_g.alpha)/out.highRisk_g.expiry*100,
  expiry_vs_random:(out.highRisk_g.random-out.highRisk_g.expiry)/out.highRisk_g.random*100 };
console.log(JSON.stringify(out,null,2));
writeFileSync("/sessions/sweet-blissful-hamilton/mnt/outputs/sim_results4.json",JSON.stringify(out,null,2));

import type {World} from './types';
import {sites,siteById,roads} from '../data/scenario';
import {capital,fortificationLevel,cityOperatingExpense} from './realm';
import {worldRealms} from './polityRuntime';
import {allegianceRealm} from './officeEligibility';
import {authorityGrant} from './authority';
import {civilCanAdmin} from './civilWars';
import {localBalance,spendLocal} from './treasury';
import {governingAuthority,governingExecutives} from './government';
import {activeWars,warRealmSide} from './wars';
import {civilianFood} from './population';

/** Capital status is derived from current identities, not the opening city's label. */
export function isCapitalSite(w:World,id:string){return worldRealms(w).some(r=>!w.realm?.annexed?.[r]&&capital(r,w)===id&&(w.realm?.cities[id]?.owner??siteById[id]?.polity)===r);}
export function initialFortificationLevel(w:World,id:string){return isCapitalSite(w,id)||siteById[id]?.capital||id==='luoyang'?1:0;}
/** Missing legacy facilities are materialized once; explicit damage and paid projects remain intact. */
export function ensureFortifications(w:World){if(w.realm)for(const site of sites){const c=w.realm.cities[site.id];if(c)c.fortification??={level:initialFortificationLevel(w,site.id),due:null};}}
export function establishCapitalFortification(w:World,id:string){
 const c=w.realm?.cities[id];if(!c)return;
 if(!c.fortification)c.fortification={level:1,due:null};
 else if(c.fortification.level===0&&c.fortification.due===null)c.fortification.level=1;
 // An existing level-one order keeps its paid cost and completion date; no free second upgrade.
}
export function fortificationQuote(w:World,id:string,actor=w.characterId!){
 const city=w.realm?.cities[id],r=actor&&allegianceRealm(w,actor),level=city?fortificationLevel(w,id):0,cost=(level+1)*80,days=(level+1)*30;
 const reason=!city||!r||!w.realm||w.campaign?.status!=='active'?'仅历史沙盒有效城市可用':
  !civilCanAdmin(w,actor,id)||city.owner!==r||city.controller!==r?'须控制本国法理城市':
  !authorityGrant(w,actor,'levy',{realm:r,site:id}).allowed?'须有本城军务权限':
  level>=3?'城防已达最高等级':city.fortification?.due!=null?'城防正在修筑':localBalance(w,id)<cost?`本城公款不足 ${cost}`:'';
 return {level,cost,days,reason};
}
export function startFortification(w:World,id:string,actor=w.characterId!){
 const q=fortificationQuote(w,id,actor);if(q.reason)throw new Error(q.reason);
 spendLocal(w,id,q.cost,'修筑城防');w.realm!.cities[id].fortification={level:q.level,due:w.day+q.days};
 w.chronicle.push({day:w.day,person:'player',text:siteById[id].name+`修筑城防至 ${q.level+1} 级，支出本城公款 ${q.cost}，需 ${q.days} 日。`});w.chronicle=w.chronicle.slice(-100);
}
/** Called inside the once-per-month realm settlement. Priorities are deterministic and funded. */
export function advanceFortificationAI(w:World){
 const s=w.realm;if(!s||w.campaign?.status!=='active')return;
 for(const r of worldRealms(w)){
  if(s.annexed?.[r]||governingExecutives(w,r).includes(w.characterId!))continue;
  const actor=governingAuthority(w,r);if(!actor)continue;
  const wars=activeWars(w).filter(war=>!!warRealmSide(war,r)),enemies=new Set(worldRealms(w).filter(other=>wars.some(war=>warRealmSide(war,other)&&warRealmSide(war,other)!==warRealmSide(war,r))));
  const candidates=Object.entries(s.cities).filter(([id,c])=>c.owner===r&&c.controller===r&&!s.sieges?.some(siege=>siege.site===id)&&!authorityGrant(w,w.characterId!,'levy',{realm:r,site:id}).allowed).map(([id,c])=>{
   const seat=isCapitalSite(w,id),neighbors=roads.filter(e=>!e.legacyOnly&&(e.from===id||e.to===id)).map(e=>s.cities[e.from===id?e.to:e.from]);
   const border=neighbors.some(other=>other.controller!==r&&other.controller!=='frontier'),threat=neighbors.some(other=>enemies.has(other.controller as typeof r));
   const target=seat?(wars.length?3:2):threat?2:border?1:c.population>=15000?1:0;
   return {id,c,target,priority:(seat?100:0)+(threat?70:border?40:0)+Math.min(30,Math.floor(c.population/5000)),q:fortificationQuote(w,id,actor)};
  }).filter(v=>v.q.level<v.target&&!v.q.reason&&v.c.order>=40&&v.c.grain>=civilianFood(w,v.id)&&localBalance(w,v.id)>=v.q.cost+Math.max(40,cityOperatingExpense(w,v.id)*2)).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  let available=Math.max(0,3-Object.values(s.cities).filter(c=>c.owner===r&&c.fortification?.due!=null).length);
  let started=0;
  for(const v of candidates){if(!available||started>=2)break;const q=fortificationQuote(w,v.id,actor);if(q.reason||localBalance(w,v.id)<q.cost+Math.max(40,cityOperatingExpense(w,v.id)*2))continue;startFortification(w,v.id,actor);available--;started++;}
 }
}

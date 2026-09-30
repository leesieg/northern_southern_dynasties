import {worldRealms} from './polityRuntime';
import type {World} from './types';
import {isMonthStart} from './calendar';
import {capital,cityYield} from './realm';
import {governingAuthority} from './government';
import {civilianFood,grainCapacity,actPopulation,populationReason} from './population';
import {actFiscal,fiscalReason} from './treasury';

/** Emergency food transport and relief remain available during a political crisis. */
export function advanceRealmGovernanceAI(w:World){
 if(!w.realm||!isMonthStart(w.day,w.scriptId))return;
 const s=w.realm;
 for(const r of worldRealms(w)){const actor=governingAuthority(w,r);if(!actor||actor===w.characterId)continue;
  const home=Object.entries(s.cities).filter(([,c])=>c.owner===r&&c.controller===r);
  const incoming=(id:string)=>s.population?.transfers.filter(t=>t.kind==='grain'&&t.status==='traveling'&&t.to===id).reduce((n,t)=>n+t.sent,0)??0;
  const shortages=home.map(([id,c])=>({id,need:Math.max(0,civilianFood(w,id)*2-cityYield(w,id).grain-c.grain-incoming(id))})).filter(v=>v.need>0).sort((a,b)=>b.need-a.need);
  let shipments=0;
  for(const target of shortages){if(target.id===capital(r,w)||shipments>=3)continue;
   const amount=Math.min(target.need,Math.max(0,grainCapacity(w,target.id)-s.cities[target.id].grain-incoming(target.id)),600);
   if(amount<1)continue;
   const source=home.map(([id,c])=>({id,available:c.grain+(id===capital(r,w)?s.treasuries[r].grain:0)-civilianFood(w,id)*2})).filter(v=>v.id!==target.id&&v.available>=amount).sort((a,b)=>b.available-a.available).find(v=>!populationReason(w,{type:'population',action:'transfer',kind:'grain',from:v.id,to:target.id,amount},actor,r));
   if(source){actPopulation(w,{type:'population',action:'transfer',kind:'grain',from:source.id,to:target.id,amount},actor,r);shipments++;}
  }
  for(const [site] of home.filter(([,c])=>c.order<45).sort((a,b)=>a[1].order-b[1].order).slice(0,3)){const command={type:'fiscal',action:'relief',site} as const;if(!fiscalReason(w,command,actor))actFiscal(w,command,actor);}
 }
}

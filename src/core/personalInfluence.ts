import {isMonthStart,monthStart} from './calendar';
import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {isAlive} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {governmentOf,governingExecutives} from './government';
import {courtEnabled} from './court';
import {localHolder,localActive,localLevel,localSites,localSeatSite} from './localAdministration';
import {civilCanAdmin} from './civilWars';
import {capital} from './realm';
import type {World} from './types';
export function ensurePersonalInfluence(w:World){if(!w.realm||!w.characterId)return;w.realm.personalInfluence??=Object.fromEntries(relationshipPeople.map(p=>[p.id,p.id===w.characterId?w.realm!.influence:0]));for(const p of relationshipPeople)w.realm.personalInfluence[p.id]??=0;w.realm.lastInfluenceIncome??=monthStart(w.day,w.scriptId);}
export function personInfluence(w:World,id:string){return id===w.characterId?w.realm?.influence??0:w.realm?.personalInfluence?.[id]??0;}
export function awardInfluence(w:World,id:string,amount:number){if(!w.realm||!relationshipPersonById[id])return;ensurePersonalInfluence(w);const value=Math.max(0,Math.min(999,personInfluence(w,id)+amount));w.realm.personalInfluence![id]=value;if(id===w.characterId)w.realm.influence=value;}
export function snapshotInfluence(w:World){ensurePersonalInfluence(w);if(w.realm&&w.characterId)w.realm.personalInfluence![w.characterId]=w.realm.influence;return w.characterId;}
export function restoreInfluence(w:World,previous?:string){if(!w.realm||!w.characterId)return;if(previous!==w.characterId)w.realm.influence=w.realm.personalInfluence?.[w.characterId]??0;else w.realm.personalInfluence![w.characterId]=w.realm.influence;}
/** Derived monthly income: one strongest live office, actual governance, and living
 * loyal followers. Concurrent offices and the player compatibility mirror never stack. */
export function influenceIncome(w:World,id:string){
 const parts:{label:string;value:number}[]=[];
 if(!w.realm||w.campaign?.status!=='active'||!relationshipPersonById[id]||!isAlive(w,id))return {total:0,parts};
 parts.push({label:'基础积累',value:5});
 const r=allegianceRealm(w,id),g=r&&governmentOf(w,r);let bonus=0,label='',area=new Set<string>();
 const offer=(value:number,name:string,sites:string[])=>{if(value<bonus||!sites.length)return;if(value>bonus){area=new Set();bonus=value;label=name;}for(const site of sites)area.add(site);};
 if(r&&g&&!w.realm.annexed?.[r]){
  const controlled=Object.keys(w.realm.cities).filter(site=>w.realm!.cities[site].owner===r&&w.realm!.cities[site].controller===r&&civilCanAdmin(w,id,site));
  if(controlled.includes(capital(r))){
   if(g.ruler===id)offer(4,'在位君主',controlled);
   if(governingExecutives(w,r).includes(id))offer(10,'实际执政',controlled);
   if(courtEnabled(w,r)&&Object.values(g.court?.ministries??{}).includes(id))offer(6,'中央职掌',controlled);
  }
  for(const site of controlled)if(w.realm.cities[site].governor===id)offer(2,'县级主官',[site]);
  for(const [key,seat] of Object.entries(w.realm.local?.seats??{})){
   if(seat.holder!==id||!key.startsWith(r+'|'))continue;const t=key.split('|')[1],level=localLevel(t),site=localSeatSite(w,t,r);
   if(localHolder(w,t,r)!==id||!localActive(w,t,r)||!site||!civilCanAdmin(w,id,site))continue;
   offer(level==='province'?6:4,level==='province'?'州级主官':'郡级主官',localSites(w,t,r,true).filter(site=>civilCanAdmin(w,id,site)));
  }
 }
 if(bonus){
  parts.push({label:label+'（最高职权）',value:bonus});const cities=[...area].map(site=>w.realm!.cities[site]);
  if(cities.reduce((sum,c)=>sum+c.order,0)>=60*cities.length)parts.push({label:'辖区平均秩序至少 60',value:1});
  if(cities.reduce((sum,c)=>sum+c.prosperity,0)>=50*cities.length)parts.push({label:'辖区平均繁荣至少 50',value:1});
 }
 const loyal=Object.entries(w.relationships?.oaths??{}).filter(([follower,o])=>follower!==id&&isAlive(w,follower)&&o.lord===id&&o.loyalty>=70).length;
 if(loyal)parts.push({label:'在世忠诚效忠者（最多 4）',value:Math.min(4,loyal)});
 return {total:parts.reduce((sum,p)=>sum+p.value,0),parts};
}
export function influenceIncomeHint(w:World,id:string){const q=influenceIncome(w,id);return `个人影响力 ${personInfluence(w,id)}/999；每月 1 日预计 +${q.total}（${q.parts.map(p=>p.label+' +'+p.value).join('；')||'当前不再积累'}）。职位只计最高一档；办结差事另按实际贡献奖励，家业交接不继承前任余额。`;}
export function advancePersonalInfluence(w:World){ensurePersonalInfluence(w);if(!w.realm||w.campaign?.status!=='active'||!isMonthStart(w.day,w.scriptId)||(w.realm.lastInfluenceIncome??-1)>=w.day)return;w.realm.lastInfluenceIncome=w.day;for(const p of relationshipPeople)if(isAlive(w,p.id))awardInfluence(w,p.id,influenceIncome(w,p.id).total);}

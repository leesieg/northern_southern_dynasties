import {culturalPolicyInterest} from './culture';
import {movementIds,movements,type MovementId} from '../data/court';
import {movementMood,courtOf,courtEnabled} from './court';
import {governmentOf,governingAuthority} from './government';
import {localSites,localActive} from './localAdministration';
import type {AssignmentPlan} from '../data/assignments';
import {siteById} from '../data/scenario';
import type {RealmId} from './realm';
import type {World} from './types';
import {policyDefinition,type PolicyDimension} from '../data/governancePolicies';
export type PolicyDomain='appointment'|'reform'|'tax'|'military'|'welfare'|'migration'|'commerce';
export interface PoliticalContext {localService?:boolean;source:string;site?:string;actor?:string;authorizer?:string;plan?:AssignmentPlan;stage?:'commitment'|'execution'|'completion';scale?:number;burden?:number;benefit?:number;policyRevision?:number;dimension?:PolicyDimension;rule?:string}
export interface PoliticalImpact {source:string;day:number;domain:PolicyDomain;site:string|null;actor:string|null;authorizer:string|null;stage:'commitment'|'execution'|'completion';policyRevision:number|null;scale:number;plan:AssignmentPlan|null;dimension:PolicyDimension|null;rule:string|null;support:number;tension:number;parts:{id:MovementId;value:number}[]}
export interface PoliticalWindow {until:number;used:number;support:number;opposition:number}
export const policyDomains:PolicyDomain[]=['appointment','reform','tax','military','welfare','migration','commerce'];
const positions:Record<PolicyDomain,Partial<Record<MovementId,number>>>={appointment:{dynastic:1,conservative:-1,reform:1},reform:{reform:1,conservative:-1},tax:{expansion:1,conservative:-1},military:{expansion:1,conservative:-1,reform:-.5},welfare:{dynastic:1,reform:1,expansion:-.5},migration:{reform:1,conservative:-1,dynastic:-.5},commerce:{reform:1,conservative:-.5}};
const rulePositions:Record<string,Partial<Record<MovementId,number>>>={lineage:{dynastic:1,conservative:1,reform:-.5},selection:{reform:1,conservative:-.5},assessment:{reform:1.2,conservative:-1},patronage:{dynastic:.5,conservative:1,reform:-.5},sponsorship:{dynastic:1,reform:.5},trial:{reform:1,conservative:-1},compact:{dynastic:.5,conservative:1,reform:-.5},survey:{reform:1,conservative:-.5},equalized:{expansion:.5,reform:.6,conservative:-1}};
/** Location, actual burden and method qualify interests; movement names never stand for ethnicities. */
export function politicalAction(w:World,r:RealmId,domain:PolicyDomain,context?:PoliticalContext){
 if(!courtOf(w,r)||!courtEnabled(w,r))return {parts:[],support:0,rawSupport:0,effort:0,scale:0};
 const scale=Math.max(.25,Math.min(2,context?.scale??1)),burden=context?.burden??(context?.plan==='urgent'?1:context?.plan==='thorough'?-.5:0),benefit=context?.benefit??0;
 const population=context?.localService&&context.site?Object.values(w.realm!.cities).filter(c=>c.owner===r).reduce((n,c)=>n+c.population,0):0;
 const reach=context?.localService&&context.site?Math.min(1,(w.realm!.cities[context.site]?.population??0)/Math.max(1,population)):1;
 const parts=movementIds.filter(id=>id!=='unaligned').map(id=>{
  const m=movementMood(w,r,id),local=context?.site?m.members.filter(person=>w.realm!.cities[context.site!]?.governor===person||Object.entries(w.realm!.local?.seats??{}).some(([key,s])=>key.startsWith(r+'|')&&s.holder===person&&localActive(w,key.split('|')[1],r)&&localSites(w,key.split('|')[1],r).includes(context.site!))).length:0;
  const exposure=context?.site?.length?Math.min(1,m.share/100+local*.15):1;
  const interest=context?.dimension&&context.rule&&policyDefinition(context.dimension,context.rule)?rulePositions[context.rule]:positions[domain];
  const cultural=context?.dimension==='cultural'&&context.rule?(m.members.length?m.members.reduce((n,id)=>n+culturalPolicyInterest(w,r,id,context.rule!),0)/m.members.length:0):undefined;
  const stance=(context?.localService&&context.stage&&context.stage!=='commitment'?0:cultural??interest?.[id]??0)+(id==='conservative'?-burden*.8:id==='reform'?-burden*.6:0)+(id==='dynastic'||id==='reform'?benefit*.5:0);
  const raw=m.share*stance*scale*reach*(.5+exposure/2)*(m.satisfaction<30?.5:1);return {id,label:movements[id].name,share:m.share,stance,value:Math.round(raw)||0,raw};
 });
 const support=parts.reduce((n,p)=>n+p.value,0);
 return {parts,support,rawSupport:parts.reduce((n,p)=>n+p.raw,0),effort:Math.max(-2,Math.min(2,Math.round(support/30))),scale};
}
export function enactPoliticalAction(w:World,r:RealmId,domain:PolicyDomain,context?:PoliticalContext){
 const g=governmentOf(w,r),c=courtOf(w,r);if(!g||!c||!courtEnabled(w,r))return;
 const stage=context?.stage??'commitment',key='politics|'+domain;
 if(context&&c.impacts?.some(i=>i.source===context.source)||!context?.site&&(g.cooldowns[key]??0)>w.day)return;
 const q=politicalAction(w,r,domain,context),beforeSupport=g.support,beforeTension=c.tension;
 let scale=q.scale,window:PoliticalWindow|undefined;
 if(context?.site){
  c.politicalWindows=Object.fromEntries(Object.entries(c.politicalWindows??{}).filter(([,v])=>v.until>w.day));
  const windowKey=[domain,context.site,stage].join('|');window=c.politicalWindows[windowKey]??{until:w.day+30,used:0,support:0,opposition:0};
  scale=Math.min(scale,Math.max(0,2-window.used));window.used=Math.round((window.used+scale)*100)/100;c.politicalWindows[windowKey]=window;
 }else g.cooldowns[key]=w.day+30;
 const weight=q.scale?scale/q.scale:0,parts=q.parts.map(p=>({id:p.id,value:Math.round(p.value*weight)||0})),support=parts.reduce((n,p)=>n+p.value,0);
 let supportDelta=Math.round(support/20),tensionDelta=Math.max(0,Math.round(-support/10));
 if(window){const raw=q.rawSupport*weight;supportDelta=Math.round((window.support+raw)/20)-Math.round(window.support/20);tensionDelta=Math.round((window.opposition+Math.max(0,-raw))/10)-Math.round(window.opposition/10);window.support+=raw;window.opposition+=Math.max(0,-raw);}
 g.support=Math.max(0,Math.min(100,g.support+supportDelta));
 c.tension=Math.max(0,Math.min(100,c.tension+tensionDelta));
 const impact:PoliticalImpact={source:context?.source??`action:${domain}:${w.day}`,day:w.day,domain,site:context?.site??null,actor:context?.actor??w.characterId??null,authorizer:context?.authorizer??governingAuthority(w,r)??null,stage,policyRevision:context?.policyRevision??g.rules?.revision??null,scale,plan:context?.plan??null,dimension:context?.dimension??null,rule:context?.rule??null,support:g.support-beforeSupport,tension:c.tension-beforeTension,parts};
 c.impacts=[...(c.impacts??[]),impact].slice(-80);
 c.history.push({day:w.day,text:(context?.site?siteById[context.site].name+' · ':'')+({commitment:'政务启办',execution:'执行处置',completion:'实际成果'})[stage]+'：'+parts.filter(p=>p.value).map(p=>movements[p.id].name+(p.value>0?'支持 ':'反对 ')+Math.abs(p.value)).join('；')+(scale===0?'同地同类动员已达本期上限。':'。')+'支持 '+(impact.support>=0?'+':'')+impact.support+'，紧张 +'+impact.tension+'。'});c.history=c.history.slice(-60);
 return impact;
}

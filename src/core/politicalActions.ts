import {movementIds,movements,type MovementId} from '../data/court';
import {movementMood, courtOf,courtEnabled} from './court';
import {governmentOf} from './government';
import type {RealmId} from './realm';
import type {World} from './types';
export type PolicyDomain='appointment'|'reform'|'tax'|'military'|'welfare'|'migration'|'commerce';
const positions:Record<PolicyDomain,Partial<Record<MovementId,number>>>={appointment:{dynastic:1,conservative:-1,reform:1},reform:{reform:1,conservative:-1},tax:{expansion:1,conservative:-1},military:{expansion:1,conservative:-1,reform:-.5},welfare:{dynastic:1,reform:1,expansion:-.5},migration:{reform:1,conservative:-1,dynastic:-.5},commerce:{reform:1,conservative:-.5}};
export function politicalAction(w:World,r:RealmId,domain:PolicyDomain){
 if(!courtOf(w,r)||!courtEnabled(w,r))return {parts:[],support:0,cost:0,effort:0};
 const parts=movementIds.filter(id=>id!=='unaligned').map(id=>{const m=movementMood(w,r,id);const stance=positions[domain][id]??0;return {id,label:movements[id].name,share:m.share,stance,value:Math.round(m.share*stance*(m.satisfaction<30?.5:1))};});
 const support=parts.reduce((n,p)=>n+p.value,0),resistance=Math.max(0,-support);return {parts,support,cost:Math.round(resistance/5),effort:Math.max(-2,Math.min(2,Math.round(support/30)))};
}
export function enactPoliticalAction(w:World,r:RealmId,domain:PolicyDomain){const g=governmentOf(w,r),c=courtOf(w,r);if(!g||!c)return;const q=politicalAction(w,r,domain);g.support=Math.max(0,Math.min(100,g.support+Math.round(q.support/20)));c.tension=Math.max(0,Math.min(100,c.tension+Math.max(0,Math.round(-q.support/10))));c.history.push({day:w.day,text:'施行政务：'+q.parts.filter(p=>p.value).map(p=>p.label+(p.value>0?'支持 ':'反对 ')+Math.abs(p.value)).join('；')+'。'});c.history=c.history.slice(-60);}

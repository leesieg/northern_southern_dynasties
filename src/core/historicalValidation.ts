import type {World} from './types';
import {worldRealms} from './polityRuntime';
import {getPerson} from './personRegistry';
import {siteById} from '../data/scenario';
export function validHistorical(w:World){
 const s=w.historical;if(s===undefined)return true;
 const integer=(v:unknown,max=1e9):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
 const text=(v:unknown,max=500):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
 const person=(v:unknown)=>text(v,100)&&!!getPerson(w,v);
 const realm=(v:unknown)=>typeof v==='string'&&worldRealms(w).includes(v as never);
 const strings=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(x=>text(x,150))&&new Set(v).size===v.length;
 if(!s||s.version!==1||!integer(s.since,w.day)||!Array.isArray(s.items)||s.items.length>16||new Set(s.items.map(e=>e?.id)).size!==s.items.length)return false;
 return s.items.every(e=>{
  if(!e||!text(e.id,100)||e.definitionId!=='hou-jing'||e.definitionVersion!==1||!['dormant','north','reception','settlement','dispute','rebellion','siege','court','aftermath'].includes(e.phase)||!['active','resolved','cancelled'].includes(e.status)||!integer(e.phaseSince,w.day)||!e.actors||e.actors.protagonist!=='hou-jing'||e.actors.protector!=='gao-huan'||!realm(e.origin)||e.host!==undefined&&!realm(e.host)||!text(e.site,100)||!siteById[e.site]||!integer(e.revision)||!strings(e.appliedEffects,128)||!Array.isArray(e.milestones)||e.milestones.length>128)return false;
  if(![e.pactId,e.warId].every(v=>v===undefined||integer(v)&&v>0)||![e.stableSince,e.resolvedAt].every(v=>v===undefined||integer(v,w.day))||e.handlingDue!==undefined&&!integer(e.handlingDue,w.day+30)||e.lastConflict!==undefined&&!text(e.lastConflict)||e.result!==undefined&&!text(e.result))return false;
  if(new Set(e.milestones.map(m=>m?.key)).size!==e.milestones.length||!e.milestones.every(m=>m&&text(m.key,150)&&integer(m.day,w.day)&&text(m.text)&&typeof m.public==='boolean'&&Array.isArray(m.realms)&&m.realms.length<=3&&m.realms.every(realm)&&Array.isArray(m.people)&&m.people.length<=8&&m.people.every(person)))return false;
  const d=e.decision;return d===undefined||!!d&&text(d.id,150)&&integer(d.revision,e.revision)&&person(d.actor)&&['north','council','crisis'].includes(d.kind)&&integer(d.created,w.day)&&(d.handled===undefined||typeof d.handled==='boolean');
 });
}

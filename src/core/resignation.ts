import {detained} from './custodyState';
import {scenarioOffices} from '../data/offices';
import {relationshipPersonById} from '../data/relationships';
import {ministryIds} from '../data/court';
import {officeHierarchy} from './offices';
import {governmentOf,governingExecutives} from './government';
import {realms} from './realm';
import {setLocalHolder} from './localAdministration';
import {isAlive} from './lifeState';
import type {World} from './types';

export interface Resignations {titles:string[];persons:string[]}
export type ResignationCommand={type:'resign';office:string};
export function resignablePosts(w:World,id=w.characterId!){
 const posts=officeHierarchy(w,id).filter(n=>n.holder===id).map(n=>({id:n.id,name:n.name,sovereign:n.kind==='sovereign'}));
 if(w.retinue?.members[id])posts.push({id:'retinue',name:'幕府职务',sovereign:false});
 if(Object.values(w.mobility?.commanders??{}).includes(id)||Object.values(w.mobility?.armyCommanders??{}).includes(id))posts.push({id:'command',name:'统军职务',sovereign:false});
 return posts;
}
/** Birthplace/allegiance is retained for kinship and future applications, but conveys no office. */
export function isAdventurer(w:World,id:string){return !!w.resignations?.persons.includes(id)&&resignablePosts(w,id).length===0;}
export function resignationReason(w:World,office:string,id=w.characterId!){
 if(!w.realm||!id||!isAlive(w,id))return '当前无法辞官';
 const post=resignablePosts(w,id).find(p=>p.id===office);if(!post)return '已不在此职位';
 if(post.sovereign)return '君位须通过继承交接，不能直接空置';
 if(detained(w,id))return '被拘禁期间不能交接';
 if(w.people[0].journey&&id===w.characterId)return '抵达目的地后办理交接';
 if(w.diplomacy?.missions.some(q=>q.envoy===id))return '须先完成使团使命与返程';
 if(w.militaryCampaigns?.items.some(q=>q.commander===id&&q.status==='active'))return '须先结束战役委任';
 if(w.service?.tasks.some(q=>q.phase!=='closed'&&(q.officer===id||q.helper===id))||w.duties?.task?.officer===id&&w.duties.task.phase!=='closed')return '须先结案或由上级改派正在办理的差事';
 if(w.economy?.investigations.some(q=>q.inspector===id&&q.phase==='investigating'))return '须先完成查核';
 if(w.mobility?.activities.some(q=>!['done','cancelled'].includes(q.phase)&&(q.actor===id||q.delegate===id)))return '须先完成或取消当前活动';
 if(w.realm.offices.some(q=>q.candidate===id)||w.mobility?.appointments[id])return '须先完成在途任命';
 if(realms.some(r=>governmentOf(w,r)?.task?.sponsor===id))return '须先完成或取消主持中的改革';
 if(office==='command'&&w.realm.armies.some(a=>a.journey&&(w.mobility?.armyCommanders?.[a.id!]===id||w.realm!.armies.find(b=>b.realm===a.realm)===a&&w.mobility?.commanders[a.realm]===id)))return '军队驻扎后才能交接统军';
 return '';
}
export function actResignation(w:World,c:ResignationCommand){
 const id=w.characterId!,why=resignationReason(w,c.office,id);if(why)throw new Error(why);
 const post=resignablePosts(w,id).find(p=>p.id===c.office)!;
 const node=officeHierarchy(w,id).find(n=>n.id===c.office);
 if(c.office==='retinue')delete w.retinue!.members[id];
 else if(c.office==='command'){
  for(const r of realms)if(w.mobility?.commanders[r]===id)delete w.mobility.commanders[r];
  for(const [key,person] of Object.entries(w.mobility?.armyCommanders??{}))if(person===id)delete w.mobility!.armyCommanders![Number(key)];
 }else if(node?.territory)setLocalHolder(w,node.territory,node.realm,null);
 else if(node?.kind==='executive'){
  const g=governmentOf(w,node.realm)!;g.resignedExecutives=[...new Set([...(g.resignedExecutives??[]),id])];g.executives=g.executives.filter(p=>p!==id);if(!g.executives.length)g.executives=[g.ruler];
  if(g.heirs?.executive===g.executives[0])g.heirs.executive=null;
  if(w.relationships?.regencies[node.realm]?.controller===id)delete w.relationships.regencies[node.realm];
  if(g.court)g.court.tenure=g.ruler+'|'+governingExecutives(w,node.realm).join('|');
 }else if(node){const g=governmentOf(w,node.realm)!;const ministry=ministryIds.find(m=>c.office===`office:${node.realm}:ministry:${m}`);if(ministry)g.court!.ministries[ministry]=null;}
 const state=w.resignations??={titles:[],persons:[]};
 if(c.office.startsWith('office:546:')&&!state.titles.includes(c.office))state.titles.push(c.office);
 if(!state.persons.includes(id))state.persons.push(id);
 if(isAdventurer(w,id)){
  if(w.relationships)delete w.relationships.oaths[id];
  w.realm!.mandate=false;
  for(const q of w.realm!.local?.requests??[])if(q.status==='pending'&&(q.actor===id||q.candidate===id)){q.status='cancelled';q.changed=w.day;q.reply='辞官后撤回请任';}
 }
 w.chronicle.push({day:w.day,person:'player',text:`辞去${post.name}，公库与属地留归官署。${isAdventurer(w,id)?'现为冒险者，可自由跨境行旅；私财与家产保留。':''}`});w.chronicle=w.chronicle.slice(-100);
}
export function validResignations(value:unknown){
 if(!value||typeof value!=='object')return false;const s=value as Resignations;
 return Array.isArray(s.persons)&&s.persons.every(p=>typeof p==='string'&&Object.hasOwn(relationshipPersonById,p))&&new Set(s.persons).size===s.persons.length&&Array.isArray(s.titles)&&s.titles.every(t=>scenarioOffices.some(o=>'office:546:'+o.id===t))&&new Set(s.titles).size===s.titles.length;
}

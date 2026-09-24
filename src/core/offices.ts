import {isAlive} from './lifeState';
import { ministryIds,ministries } from '../data/court';
import { characterById } from '../data/characters';
import { scenarioOffices } from '../data/offices';
import { siteById } from '../data/scenario';
import { governmentOf,governingExecutives } from './government';
import { realms,type RealmId } from './realm';
import type { World } from './types';
export interface OfficeNode {
 id:string;realm:RealmId;regimeId:string;name:string;holder:string|null;parentId:string|null;
 kind:'sovereign'|'executive'|'office'|'honour'|'city';
 relation:'sovereignty'|'administration'|'liege'|'chief'|'honour';
 active:boolean;site?:string;source?:{title:string;url:string}[];
}
/** Materialized from authoritative saved state; never maintain a second mutable set of holders. */
export function officeHierarchy(w:World):OfficeNode[]{
 const nodes:OfficeNode[]=[];
 for(const r of realms){
  const g=governmentOf(w,r);if(!g)continue;
  const root=`office:${r}:sovereign`,chief=`office:${r}:executive:0`;
  const relation=g.type==='feudal'?'liege':g.type==='tribal'||g.type==='nomadic'?'chief':'administration';
  const add=(n:Omit<OfficeNode,'realm'|'regimeId'>)=>nodes.push({...n,holder:n.holder&&isAlive(w,n.holder)?n.holder:null,active:n.active&&(!n.holder||isAlive(w,n.holder)),realm:r,regimeId:g.regimeId});
  add({id:root,name:g.type==='tribal'||g.type==='nomadic'?'最高首领':'君主',holder:g.ruler,parentId:null,kind:'sovereign',relation:'sovereignty',active:true});
  governingExecutives(w,r).forEach((holder,i)=>add({id:`office:${r}:executive:${i}`,name:i?'参与执政':'实际执政',holder,parentId:i?chief:root,kind:'executive',relation:'administration',active:true}));
  // Initial titles are scenario evidence, not automatically reissued by a successor court.
  if(g.court)for(const m of ministryIds)add({id:`office:${r}:ministry:${m}`,name:ministries[m].name,holder:g.court.ministries[m],parentId:chief,kind:'office',relation:'administration',active:['meritocratic','celestial','khanate'].includes(g.type)});
  if(!g.stages.length&&g.dynasty===r)for(const o of scenarioOffices){
   const c=characterById[o.holder];if(c.polity!==r)continue;
   const ownExecutive=governingExecutives(w,r).indexOf(o.holder);
   add({id:`office:546:${o.id}`,name:o.name,holder:o.holder,parentId:o.kind==='honour'?root:ownExecutive>=0?`office:${r}:executive:${ownExecutive}`:chief,kind:o.kind,relation:o.kind==='honour'?'honour':'administration',active:true,source:c.sources});
  }
  for(const [site,c] of Object.entries(w.realm!.cities))if(c.owner===r){
   add({id:`office:city:${site}`,name:siteById[site].name+'刺史',holder:c.governor,parentId:chief,kind:'city',relation,active:c.controller===c.owner,site});
  }
 }
 return nodes;
}
/** Skip vacant offices and a person's own concurrent positions when finding their superior. */
export function superiorOffice(nodes:OfficeNode[],office:OfficeNode):OfficeNode|undefined{
 const visited=new Set([office.id]);let parent=office.parentId;
 while(parent&&!visited.has(parent)){
  visited.add(parent);const node=nodes.find(n=>n.id===parent);if(!node)return;
  if(node.holder&&node.holder!==office.holder)return node;
  parent=node.parentId;
 }
}
export function officeChain(nodes:OfficeNode[],office:OfficeNode):OfficeNode[]{
 const chain:OfficeNode[]=[];const seen=new Set<string>();let current:OfficeNode|undefined=office;
 while(current&&!seen.has(current.id)){seen.add(current.id);chain.unshift(current);current=nodes.find(n=>n.id===current!.parentId);}
 return chain;
}
export function directSubordinates(nodes:OfficeNode[],person:string){
 return nodes.filter(n=>n.holder&&n.holder!==person&&n.kind!=='honour'&&superiorOffice(nodes,n)?.holder===person);
}

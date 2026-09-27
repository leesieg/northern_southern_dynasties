import { administration } from './administration.ts';
import { sites,polities } from './scenario.ts';
export type TerritoryLevel='realm'|'province'|'prefecture'|'county'|'city';
export const levelNames:Record<TerritoryLevel,string>={realm:'政权',province:'州',prefecture:'郡／尹',county:'县',city:'县域'};
export interface TerritoryNode {id:string;name:string;level:TerritoryLevel;parent:string|null;site?:string;basis:'scenario'|'gazetteer'|'unresolved';from:number;until:number}
// Explicit entities and parent links; no administrative identity is inferred from a polygon.
// The current administrative baseline is only asserted for the 546 scenario.
const nodes:Record<string,TerritoryNode>={};
const add=(node:Omit<TerritoryNode,'from'|'until'>)=>{nodes[node.id]={...node,from:546,until:547};};
for(const [id,p] of Object.entries(polities))add({id:'realm:'+id,name:p.name,level:'realm',parent:null,basis:id==='frontier'?'unresolved':'scenario'});
for(const site of sites){
  const a=administration[site.id],realm='realm:'+site.polity;
  let parent=realm;
  if(a){
    // Keep the pre-correction key for existing saves; the historical display name is independent of this opaque ID.
    const province=site.id==='liangxian'?'province:east:广州':`province:${site.polity}:${a.province}`,prefecture='prefecture:'+a.group,county='county:'+site.id;
    add({id:province,name:a.province,level:'province',parent:realm,basis:'gazetteer'});
    add({id:prefecture,name:a.prefecture,level:'prefecture',parent:province,basis:'gazetteer'});
    add({id:county,name:a.county,level:'county',parent:prefecture,basis:'gazetteer'});parent=county;
  }
  add({id:'city:'+site.id,name:site.name,level:'city',parent,site:site.id,basis:a?'gazetteer':'unresolved'});
}
export const territoryNodes=nodes;
export const territoryRoots=Object.values(nodes).filter(n=>!n.parent);
export function childrenOf(id:string){return Object.values(nodes).filter(n=>n.parent===id);}
export function ancestorsOf(id:string):TerritoryNode[]{
  const result:TerritoryNode[]=[];let node=nodes[id];
  while(node){result.unshift(node);if(!node.parent)break;node=nodes[node.parent];}
  return result;
}
export function descendantSites(id:string):string[]{
  const node=nodes[id];if(!node)return [];if(node.site)return [node.site];
  return childrenOf(id).flatMap(child=>descendantSites(child.id));
}
export function nodeForSite(site:string,level:TerritoryLevel){return ancestorsOf('city:'+site).find(n=>n.level===level)??nodes['city:'+site];}
export function nodesAtLevel(level:TerritoryLevel){return Object.values(nodes).filter(n=>n.level===level);}
export interface ControlEvent {id:string;year:number;site:string;controller:string;label:string;source:string;precision:'year'}
// A dated capture is evidence for this city only, not for all of its surrounding county/prefecture.
export const controlEvents:ControlEvent[]=[
  {id:'chengdu-553',year:553,site:'chengdu',controller:'西魏',label:'西魏取成都',source:'https://zh.wikisource.org/wiki/周書/卷02',precision:'year'},
  {id:'jiangling-554',year:554,site:'jiangling',controller:'西魏',label:'西魏陷江陵',source:'https://zh.wikisource.org/wiki/梁書/卷05',precision:'year'},
];
export function controlsRecordedBy(year:number){return controlEvents.filter(e=>e.year<=year);}

export function nodesForYear(year:number){return Object.values(nodes).filter(n=>n.from<=year&&year<n.until);}

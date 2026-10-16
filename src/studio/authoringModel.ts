import {effectiveState,clone,equal,StudioError,type Draft,type Operation,type Scenario,type PersonState} from './model';
import {mapTemplate} from './scenarioMap';
import {presenceAtStart,type InitialLife} from '../core/scenarioLifeDefinition';
import type {ContentPackage} from '../core/contentPackage';
import type {PoliticalRealm,PoliticalDefinition} from '../core/politicalDefinition';
import type {StrategyDefinition} from '../core/strategyDefinition';
import type {MapSite} from './strategicModel';
import type {TerritoryNode} from '../data/territorialHierarchy';
export const authoringCommands={initialize:['politics','strategy'],addRealm:['realm'],removeRealm:['realmId','to'],setPresence:['personId','life'],addSite:['site','template','polity','prefecture','population','grain'],removeSite:['siteId','moveTo'],addNode:['node'],removeNode:['nodeId'],removeRoad:['roadId'],mapDates:['from','until']} as const;
export type AuthoringCommand=
 |{kind:'initialize';politics:PoliticalDefinition;strategy:StrategyDefinition}
 |{kind:'addRealm';realm:PoliticalRealm}|{kind:'removeRealm';realmId:string;to:string}
 |{kind:'setPresence';personId:string;life:InitialLife|null}
 |{kind:'addSite';site:MapSite;template:string;polity:string;prefecture:string;population:number;grain:number}
 |{kind:'removeSite';siteId:string;moveTo:string}|{kind:'addNode';node:TerritoryNode&{source:string}}|{kind:'removeNode';nodeId:string}|{kind:'removeRoad';roadId:string}|{kind:'mapDates';from:number;until:number};
/** Shared life form transformation. The UI emits field deltas; AI emits one snapshot. */
export function changePresence(original:Scenario,people:Draft['people'],id:string,life:InitialLife|null,lookup:(id:string)=>PersonState):Scenario {
 if(!people[id])throw new StudioError('REFERENCE','人物不存在');const s=clone(original);s.life??={};if(life===null)delete s.life[id];else s.life[id]=clone(life);
 if(life&&life.presence!=='active'){
  if(id===s.defaultCharacter||s.politics?.realms.some(r=>r.ruler===id||r.executives.includes(id)))throw new StudioError('REFERENCE','先更换默认人物、君主或执政者');
  const state=s.states[id]??lookup(id);s.states[id]={...state,playable:false,office:'none'};if(s.strategy)s.strategy.armies.forEach(a=>{if(a.commander===id)a.commander=null;});for(const h of Object.values(s.succession??{})){if(h.ruler===id){h.ruler=null;h.dynasty=null;}if(h.executive===id)h.executive=null;}
 }
 return s;
}
/** Planning only. UI and AI receive the same atomic, reviewable operations. */
export function authoringOperations(draft:Draft,base:ContentPackage,scenarioId:string,command:AuthoringCommand):Operation[]{
 if(!command||!Object.hasOwn(authoringCommands,command.kind)||Object.keys(command).sort().join()!==['kind',...authoringCommands[command.kind]].sort().join())throw new StudioError('FIELD','未知制作操作或参数');
 const original=draft.scenarios[scenarioId];if(!original)throw new StudioError('REFERENCE','剧本不存在');const s=clone(original);
 const state=(id:string)=>{if(!draft.people[id])throw new StudioError('REFERENCE','人物不存在：'+id);return s.states[id]??(s.states[id]=effectiveState(draft,base,scenarioId,id));};
 const map=()=>{const value=s.map??(s.map=mapTemplate(draft,base));for(const [id,a] of Object.entries(s.strategy?.administration??{}))if(value.nodes[id])Object.assign(value.nodes[id],a,{basis:'scenario'});if(s.strategy)s.strategy.administration={};return value;};
 const political=()=>{if(!s.politics||!s.strategy)throw new StudioError('REFERENCE','先建立政权与军政配置，再调整国家');return {politics:s.politics,strategy:s.strategy};};
 if(command.kind==='initialize'){s.politics=clone(command.politics);s.strategy=clone(command.strategy);map();s.life??={};}
 if(command.kind==='setPresence')Object.assign(s,changePresence(s,draft.people,command.personId,command.life,id=>effectiveState(draft,base,scenarioId,id)));
 if(command.kind==='addRealm'){
  const {politics,strategy}=political(),r=clone(command.realm);if(politics.realms.some(v=>v.id===r.id||v.capital===r.capital||[v.ruler,...v.executives].some(p=>[r.ruler,...r.executives].includes(p))))throw new StudioError('REFERENCE','政权 ID、首都或统治者已被使用');if(!strategy.cities[r.capital]||strategy.armies.some(a=>a.site===r.capital))throw new StudioError('REFERENCE','首都须存在且先处理该地开局军队');
  for(const other of politics.realms)strategy.diplomacy.push({a:other.id,b:r.id,opinion:0,recognized:false,treaties:[]});politics.realms.push(r);strategy.treasuries[r.id]={coins:0,grain:0};Object.assign(strategy.cities[r.capital],{owner:r.id,controller:r.id});
  for(const id of new Set([r.ruler,...r.executives]))Object.assign(state(id),{polity:r.id,home:r.capital,office:'none',role:id===r.ruler?'ruler':'regent'});
  map().nodes['realm:'+r.id]={id:'realm:'+r.id,name:r.name,level:'realm',parent:null,basis:'scenario',from:s.year,until:s.year+1,source:r.source};
 }
 if(command.kind==='removeRealm'){
  const {politics,strategy}=political(),from=command.realmId,to=command.to;if(from===to||politics.realms.length<=1||!politics.realms.some(r=>r.id===from)||!politics.realms.some(r=>r.id===to))throw new StudioError('REFERENCE','须保留其他政权并明确接收者');
  const receiver=to as PoliticalRealm['id'],donor=from as PoliticalRealm['id'];for(const key of ['coins','grain'] as const){const total=strategy.treasuries[receiver][key]+strategy.treasuries[donor][key];if(total>1e6)throw new StudioError('TYPE','合并后中央钱粮超出上限，请先调整初值');strategy.treasuries[receiver][key]=total;}delete strategy.treasuries[donor];
  for(const p of Object.values(draft.people))if(presenceAtStart(s.life??null,{[p.id]:{year:p.birth}},s.year,p.id)==='active'&&effectiveState(draft,base,scenarioId,p.id).polity===from)state(p.id).polity=receiver;
  for(const city of Object.values(strategy.cities)){if(city.owner===from)city.owner=receiver;if(city.controller===from)city.controller=receiver;}
  strategy.armies.forEach(a=>{if(a.realm===from)a.realm=receiver;});strategy.diplomacy=strategy.diplomacy.filter(d=>d.a!==from&&d.b!==from);strategy.wars=strategy.wars.filter(w=>w.attacker!==from&&w.defender!==from);politics.realms=politics.realms.filter(r=>r.id!==from);if(from==='east')politics.nativeEvents=politics.nativeEvents.filter(id=>id!=='hou-jing');if(s.succession)delete s.succession[from];for(const n of Object.values(map().nodes))if(n.parent==='realm:'+from)n.parent='realm:'+to;delete map().nodes['realm:'+from];
 }
 if(command.kind==='addSite'){
  const m=map(),c=command;if(m.sites[c.site.id]||!base.tables.scenario.siteById||!Object.hasOwn(base.tables.scenario.siteById as object,c.template)||m.nodes[c.prefecture]?.level!=='prefecture'||!s.strategy)throw new StudioError('REFERENCE','地点 ID、地形模板或上级郡无效；须先建立军政配置');
  m.sites[c.site.id]=clone(c.site);m.templates[c.site.id]=c.template;const source=c.site.source;
  m.nodes['county:'+c.site.id]={id:'county:'+c.site.id,name:c.site.name+'县',level:'county',parent:c.prefecture,basis:'scenario',from:s.year,until:s.year+1,source};m.nodes['city:'+c.site.id]={id:'city:'+c.site.id,name:c.site.name,level:'city',parent:'county:'+c.site.id,site:c.site.id,basis:'scenario',from:s.year,until:s.year+1,source};
  const near=base.tables.scenario.siteById as Record<string,{lon:number;lat:number}>;const anchor=Object.values(m.sites).filter(p=>p.id!==c.site.id).sort((a,b)=>(a.lon-c.site.lon)**2+(a.lat-c.site.lat)**2-((b.lon-c.site.lon)**2+(b.lat-c.site.lat)**2))[0];if(!anchor||!near[c.template])throw new StudioError('REFERENCE','缺少道路锚点');const road='road-to-'+c.site.id;m.roads[road]={id:road,from:anchor.id,to:c.site.id,factor:1,days:null,legacyOnly:false,source:'作者新增道路；随地点提案审阅'};
  s.strategy.cities[c.site.id]={owner:c.polity as PoliticalRealm['id'],controller:c.polity as PoliticalRealm['id'],population:c.population,grain:c.grain,localCoins:0,order:70,prosperity:50,irrigation:0,fortification:0,source};
 }
 if(command.kind==='removeSite'){
  const m=map(),id=command.siteId,to=command.moveTo;if(id===to||!m.sites[id]||!m.sites[to]||id==='jiankang'||s.politics?.realms.some(r=>r.capital===id)||!s.politics&&['ye','changan'].includes(id))throw new StudioError('REFERENCE','不能移除基础锚点或现任首都；请先更换首都并明确转移地点');
  if(Object.values(draft.events).some(e=>e.scenarioIds.includes(s.id)&&e.site===id))throw new StudioError('REFERENCED','先调整该剧本引用此地点的事件');
  for(const p of Object.values(draft.people)){const v=effectiveState(draft,base,scenarioId,p.id);if(v.home===id)Object.assign(state(p.id),{home:to,office:'none'});else if(v.office==='county:'+id)state(p.id).office='none';}
  if(s.strategy){for(const army of s.strategy.armies)if(army.site===id){if(s.strategy.cities[to]?.controller!==army.realm)throw new StudioError('REFERENCE','转移军队的目的地须由本国实控');army.site=to;}delete s.strategy.cities[id];delete s.strategy.administration['city:'+id];delete s.strategy.administration['county:'+id];}
  delete m.sites[id];delete m.templates[id];delete m.nodes['city:'+id];delete m.nodes['county:'+id];for(const [rid,r] of Object.entries(m.roads))if(r.from===id||r.to===id)delete m.roads[rid];
 }
 if(command.kind==='addNode'){const m=map();if(m.nodes[command.node.id])throw new StudioError('REFERENCE','行政节点 ID 已占用');m.nodes[command.node.id]=clone(command.node);}
 if(command.kind==='removeNode'){const m=map(),id=command.nodeId;if(!m.nodes[id]||m.nodes[id].site||m.nodes[id].level==='realm'||Object.values(m.nodes).some(n=>n.parent===id))throw new StudioError('REFERENCED','先转移下级；县域锚点通过移除地点处理，政权根通过政权管理处理');delete m.nodes[id];if(s.strategy)delete s.strategy.administration[id];}
 if(command.kind==='removeRoad'){if(!map().roads[command.roadId])throw new StudioError('REFERENCE','道路不存在');delete map().roads[command.roadId];}
 if(command.kind==='mapDates')for(const node of Object.values(map().nodes)){node.from=command.from;node.until=command.until;}
 return (['politics','strategy','map','states','life','personSetup','succession'] as const).filter(field=>!equal(original[field]??null,s[field]??null)).map(field=>({target:'scenarios',id:scenarioId,field,before:clone(original[field]??null),after:clone(s[field]??null)}));
}

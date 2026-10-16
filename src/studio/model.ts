import {assertPersonSetups,type PersonSetups} from '../core/personSetupDefinition';
import {assertInitialSuccession,type InitialSuccession} from '../core/initialSuccessionDefinition';
export {traitDefinitions,abilityNames} from '../core/personSetupDefinition';
import {assertScenarioMap,scenarioMapIssues,compileScenarioMap,mapTemplate,type ScenarioMap} from './scenarioMap';
export {mapTemplate} from './scenarioMap';
import {assertScenarioLife,validateScenarioLife,presenceAtStart,type ScenarioLife} from '../core/scenarioLifeDefinition';
import {assertPolitics,validatePoliticalReferences,type PoliticalDefinition} from '../core/politicalDefinition';
import {assertStrategy,validateStrategyReferences,type StrategyDefinition} from '../core/strategyDefinition';
import {projectGeography,assertBoundaries,geographicIssues,geographicTables,compileStrategy,type StrategicDraft} from './strategicModel';
export {politicalCapabilities} from '../core/politicalDefinition';
export {projectGeography} from './strategicModel';
import {assertEventShape,assertEventTest,eventDefinitionIssues,type EventDefinition,type EventTest} from '../core/eventDefinitions';
export {eventCapabilities,newEventDefinition,assertEventTest} from '../core/eventDefinitions';
import type {ContentPackage} from '../core/contentPackage';
import type {ContentTables} from '../core/contentBinding';
export type Realm=import('../core/realm').RealmId;
export interface PersonDefinition {id:string;name:string;family:string;birth:number;sex:'male'|'female';culture:string;biography:string;father:string|null;mother:string|null}
export interface FamilyDefinition {id:string;name:string;surname:string;origin:string}
export interface PersonState {home:string;polity:Realm;role:'ruler'|'regent'|'prince'|'commander'|'scholar';title:string;coins:number;food:number;npcCoins:number;playable:boolean;office:string}
export interface Scenario {personSetup?:PersonSetups|null;succession?:InitialSuccession|null;map?:ScenarioMap|null;life?:ScenarioLife|null;politics?:PoliticalDefinition|null;id:string;name:string;year:number;month:number;day:number;description:string;defaultCharacter:string;seed:number;treasuryCoins:number;treasuryGrain:number;states:Record<string,PersonState>;strategy:StrategyDefinition|null}
export interface Draft extends StrategicDraft {events:Record<string,EventDefinition>;eventTests:Record<string,EventTest>;people:Record<string,PersonDefinition>;families:Record<string,FamilyDefinition>;scenarios:Record<string,Scenario>}
export type Target='sites'|'roads'|'geography'|'events'|'eventTests'|'people'|'families'|'scenarios'|'states';
export interface Operation {target:Target;id:string;scenarioId?:string;field?:string;before:unknown;after:unknown}
export interface Diagnostic {code:string;severity:'error'|'warning';entityId:string;fieldPath:string;message:string}
export class StudioError extends Error {constructor(public code:string,message:string,public details:unknown=null,public status=400){super(message);}}
export const clone=<T,>(v:T):T=>structuredClone(v);
export const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// These types are public capability/schema data, shared by UI, CLI and service.
type Field={type:'text'|'number'|'boolean'|'reference'|'structured';min?:number;max?:number;values?:readonly string[];nullable?:boolean;decimal?:boolean};
const text:Field={type:'text',max:200},reference:Field={type:'reference',max:100},money:Field={type:'number',min:0,max:1_000_000};
export const fields:Record<Target,Record<string,Field>>={
 sites:{name:text,lon:{type:'number',min:73,max:125,decimal:true},lat:{type:'number',min:18,max:44,decimal:true},source:{type:'text',max:2000}},
 roads:{from:reference,to:reference,factor:{type:'number',min:0.1,max:10,decimal:true},days:{type:'number',min:1,max:10000,nullable:true},legacyOnly:{type:'boolean'},source:{type:'text',max:2000}},
 geography:{boundaries:{type:'structured'}},
 events:{name:{type:'text',max:120},description:{type:'text',max:2000},enabled:{type:'boolean'},scenarioIds:{type:'structured'},actor:{type:'structured'},site:reference,requiresAuthority:{type:'boolean'},conditions:{type:'structured'},probability:{type:'number',min:0,max:100},cooldownDays:{type:'number',min:1,max:365},maxRuns:{type:'number',min:1,max:20},startStage:reference,stages:{type:'structured'}},
 eventTests:{name:{type:'text',max:120},eventId:reference,scenarioId:reference,characterId:reference,seed:{type:'number',min:1,max:0xffffffff},dayBudget:{type:'number',min:0,max:7},stepBudget:{type:'number',min:1,max:32},choices:{type:'structured'},expectedStatus:{type:'text',values:['resolved','cancelled','expired','invalid']}},
 people:{name:text,family:reference,birth:{type:'number',min:1,max:9999},sex:{type:'text',values:['male','female']},culture:{type:'text',values:['han','xianbei','gaoche','jie','unknown']},biography:{type:'text',max:5000},father:{...reference,nullable:true},mother:{...reference,nullable:true}},
 families:{name:text,surname:text,origin:text},
 scenarios:{states:{type:'structured'},personSetup:{type:'structured'},succession:{type:'structured'},map:{type:'structured'},life:{type:'structured'},politics:{type:'structured'},strategy:{type:'structured'},name:text,year:{type:'number',min:100,max:9999},month:{type:'number',min:1,max:12},day:{type:'number',min:1,max:31},description:{type:'text',max:5000},defaultCharacter:reference,seed:{type:'number',min:1,max:0xffffffff},treasuryCoins:money,treasuryGrain:money},
 states:{home:reference,polity:reference,role:{type:'text',values:['ruler','regent','prince','commander','scholar']},title:text,coins:money,food:money,npcCoins:money,playable:{type:'boolean'},office:reference},
};
export function validId(id:unknown):asserts id is string {if(typeof id!=='string'||!/^[a-z][a-z0-9:_-]{0,99}$/.test(id)||['constructor','prototype','__proto__'].includes(id))throw new StudioError('ID','实体 ID 无效。',{fieldPath:'id'});}
export function validEntityId(target:Target,id:unknown,base?:ContentPackage){
 if(typeof id==='string'&&base&&((target==='people'||target==='states')&&Object.hasOwn(base.tables.characters.characterById as object,id)||target==='families'&&(base.tables.families.families as {id:string}[]).some(f=>f.id===id)))return;validId(id);
}
function fieldValue(target:Target,field:string,value:unknown,base?:ContentPackage){
 const rule=Object.hasOwn(fields[target],field)?fields[target][field]:undefined,path=target+'.'+field;
 if(!rule)throw new StudioError('FIELD','不支持的字段：'+path,{fieldPath:path});
 const valid=rule.type==='structured'||value===null&&rule.nullable||rule.type==='boolean'&&typeof value==='boolean'||rule.type==='number'&&typeof value==='number'&&(rule.decimal?Number.isFinite(value):Number.isSafeInteger(value))&&value>=rule.min!&&value<=rule.max!||['text','reference'].includes(rule.type)&&typeof value==='string'&&value.length<=(rule.max??200)&&!value.includes('\0')&&(!rule.values||rule.values.includes(value));
 if(target==='scenarios'&&field==='personSetup')assertPersonSetups(value??null);if(target==='scenarios'&&field==='succession')assertInitialSuccession(value??null);if(target==='scenarios'&&field==='states'){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>10000)throw new StudioError('TYPE','人物状态快照无效');for(const [id,p] of Object.entries(value)){validEntityId('states',id,base);entityValue('states',id,p,base);}}
 if(target==='scenarios'&&field==='map')assertScenarioMap(value??null);if(target==='scenarios'&&field==='life')assertScenarioLife(value??null);if(target==='scenarios'&&field==='politics')assertPolitics(value??null);if(target==='scenarios'&&field==='strategy')assertStrategy(value,value?Object.keys((value as StrategyDefinition).treasuries):undefined);if(target==='geography')assertBoundaries(value);
 if(!valid)throw new StudioError('TYPE','字段类型或范围错误：'+path,{fieldPath:path});
}
function entityValue(target:Target,id:string,value:unknown,base?:ContentPackage){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new StudioError('TYPE','实体必须是对象。');
 if(target==='events'){assertEventShape(value);if(value.id!==id||id==='hou-jing')throw new StudioError('ID','保留或不一致的事件 ID');return;}
 if(target==='eventTests'){assertEventTest(value);if(value.id!==id)throw new StudioError('ID','测试 ID 不一致');return;}
 const item=value as Record<string,unknown>,allowed=[...Object.keys(fields[target]),...(target==='states'?[]:['id']),...(target==='scenarios'?['states']:[])];
 if(Object.keys(item).some(k=>!allowed.includes(k))||allowed.some(k=>!(target==='scenarios'&&['politics','life','map','personSetup','succession'].includes(k))&&!Object.hasOwn(item,k)))throw new StudioError('FIELD','实体字段不完整或包含未知字段。',{entityId:id,fieldPath:target});
 if(target!=='states'&&item.id!==id)throw new StudioError('ID','实体 ID 与操作 ID 不一致。');
 for(const key of Object.keys(fields[target]))fieldValue(target,key,item[key],base);
 if(target==='scenarios'){
  if(!item.states||typeof item.states!=='object'||Array.isArray(item.states))throw new StudioError('TYPE','剧本状态必须是对象。');
  for(const [pid,state] of Object.entries(item.states)){validEntityId('states',pid,base);entityValue('states',pid,state,base);}
 }
}
export function projectDraft(base:ContentPackage):Draft {
 const t=base.tables as Record<string,any>,people:Draft['people']={},families:Draft['families']={},scenarios:Draft['scenarios']={};
 for(const p of Object.values(t.characters.characterById) as any[]){const r=t.relationships.relationshipPersonById[p.id];if(!Number.isSafeInteger(t.lifespans.birthRecords[p.id]?.year))throw new StudioError('BASE','基础人物缺少出生年份记录：'+p.id);people[p.id]={id:p.id,name:p.name,family:p.family,birth:t.lifespans.birthRecords[p.id].year,sex:r?.sex??'male',culture:p.id.startsWith('county-official-')||p.id.startsWith('office-reserve-')?'han':t.cultures.personCultures[p.id]??'unknown',biography:p.biography,father:t.families.parentLinks.find((l:any)=>l.child===p.id&&l.kind==='父亲')?.parent??null,mother:t.families.parentLinks.find((l:any)=>l.child===p.id&&l.kind==='母亲')?.parent??null};}
 for(const f of t.families.families)families[f.id]={id:f.id,name:f.name,surname:f.surname,origin:f.origin};
 for(const s of t.scripts.gameScripts)scenarios[s.id]={id:s.id,name:s.name,year:s.year,month:s.month??1,day:s.day??1,description:s.description,defaultCharacter:s.defaultCharacter,seed:t.campaignSetup.campaignSetup.seed,treasuryCoins:t.campaignSetup.campaignSetup.treasury.coins,treasuryGrain:t.campaignSetup.campaignSetup.treasury.grain,states:{},personSetup:clone(t.campaignSetup.campaignSetup.personSetup??{}),succession:clone(t.campaignSetup.campaignSetup.succession??{}),map:null,life:clone(t.campaignSetup.campaignSetup.life??null),politics:clone(t.campaignSetup.campaignSetup.politics??null),strategy:clone(t.campaignSetup.campaignSetup.strategy??null)};
 return {...projectGeography(base),people,families,scenarios,events:Object.fromEntries((t.authoredEvents?.authoredEventDefinitions??[]).map((e:EventDefinition)=>[e.id,clone(e)])),eventTests:{}};
}
/** Validate the complete author document, including fields a diff would ignore. */
export function assertDraft(value:unknown,base:ContentPackage):asserts value is Draft {
 const targets=['sites','roads','geography','people','families','scenarios','events','eventTests'] as const;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...targets].sort().join(','))throw new StudioError('DOCUMENT','作者草稿集合不完整或含未知集合。');
 const d=value as Draft;
 for(const target of targets){const items=d[target];if(!items||typeof items!=='object'||Array.isArray(items)||Object.keys(items).length>10000)throw new StudioError('DOCUMENT','作者集合无效或超过 10000 项。');for(const [id,item] of Object.entries(items)){validEntityId(target,id,base);entityValue(target,id,item,base);}}
 const original=projectDraft(base);
 if(Object.keys(d.sites).sort().join(',')!==Object.keys(original.sites).sort().join(',')||Object.keys(d.geography).join(',')!=='map'||!Object.keys(d.scenarios).length||Object.keys(original.people).some(id=>!d.people[id]))throw new StudioError('DOCUMENT','基础地点、人物或唯一地理设置不可移除；至少保留一个剧本。');
 for(const id of Object.keys(d.people))if(!original.people[id]&&(id==='fictional'||id.startsWith('born-')||Object.hasOwn(base.tables.relationships.relationshipPersonById as object,id)||Object.hasOwn(base.tables.families.familyPersonById as object,id)))throw new StudioError('ID','作者人物使用了保留 ID。');
}
export function effectiveState(draft:Draft,base:ContentPackage,scenarioId:string,id:string):PersonState {
 const override=draft.scenarios[scenarioId]?.states[id];if(override)return clone(override);
 const t=base.tables as Record<string,any>,c=t.characters.characterById[id],role=c?.role??'scholar';
 const resources=t.campaignSetup.campaignSetup.roleResources[role==='ruler'?'ruler':['regent','commander'].includes(role)?'military':'other'];
 const source=t.scripts.gameScripts.find((s:any)=>s.id===scenarioId)??t.scripts.gameScripts[0];
 return {home:c?.home??'jiankang',polity:c?.polity??'liang',role,title:c?.title??'士人',coins:resources.coins,food:resources.food,npcCoins:120,playable:!!source.characterIds.includes(id),office:'inherit'};
}
function collection(draft:Draft,op:Operation){if(op.target==='states'){const s=draft.scenarios[op.scenarioId!];if(!s)throw new StudioError('REFERENCE','剧本不存在。');return s.states;}return draft[op.target];}
export function currentValue(draft:Draft,base:ContentPackage,op:Operation):unknown {
 const items=collection(draft,op),value=items[op.id as keyof typeof items]??(op.target==='states'&&draft.people[op.id]?effectiveState(draft,base,op.scenarioId!,op.id):null);
 return op.field?value&&typeof value==='object'?(value as unknown as Record<string,unknown>)[op.field]??null:null:clone(value);
}
export function applyOperations(draft:Draft,base:ContentPackage,operations:Operation[]):Draft {
 if(!Array.isArray(operations)||!operations.length||operations.length>100)throw new StudioError('OPERATIONS','一次提案须包含 1—100 项操作。');
 const next=clone(draft);
 for(const op of operations){
  if(!op||typeof op!=='object'||Object.keys(op).some(k=>!['target','id','scenarioId','field','before','after'].includes(k))||!Object.hasOwn(fields,op.target)||!Object.hasOwn(op,'before')||!Object.hasOwn(op,'after'))throw new StudioError('OPERATION','未知操作或未授权作用域。');
  if(Object.hasOwn(op,'field')&&(typeof op.field!=='string'||!Object.hasOwn(fields[op.target],op.field)))throw new StudioError('FIELD','未知字段。',{fieldPath:op.target+'.'+String(op.field)});
  validEntityId(op.target,op.id,base);if(op.target==='sites'&&(!next.sites[op.id]||!op.field))throw new StudioError('SCOPE','地点仅支持既有 ID 的字段编辑');if(op.target==='geography'&&(op.id!=='map'||!op.field))throw new StudioError('SCOPE','地理设置仅支持 map 字段编辑');if(op.target==='states'){validId(op.scenarioId);if(!next.people[op.id])throw new StudioError('REFERENCE','人物不存在。');}else if(op.scenarioId!==undefined)throw new StudioError('SCOPE','此操作不接受剧本作用域。');
  const actual=currentValue(next,base,op);if(!equal(actual,op.before))throw new StudioError('CONFLICT','原值已变化，请重新读取并审阅。',{operation:op,actual},409);
  if(op.target==='people'&&actual===null&&!op.field){const t=base.tables as Record<string,any>;if(op.id==='fictional'||op.id.startsWith('born-')||t.relationships.relationshipPersonById[op.id]||t.families.familyPersonById[op.id]||t.campaignSetup.campaignSetup.people.some((p:any)=>p.id===op.id))throw new StudioError('ID','此人物 ID 已由基础人物、先祖或模拟角色保留。');}
  const items=collection(next,op) as Record<string,any>;
  if(op.field){fieldValue(op.target,op.field,op.after,base);if(!items[op.id]){if(op.target!=='states')throw new StudioError('REFERENCE','实体不存在。');items[op.id]=effectiveState(next,base,op.scenarioId!,op.id);}items[op.id][op.field]=clone(op.after);if(op.target==='events'||op.target==='eventTests')entityValue(op.target,op.id,items[op.id],base);}
  else if(op.after===null){if(op.target==='scenarios'&&Object.keys(next.scenarios).length===1)throw new StudioError('REFERENCE','至少保留一个剧本。');if(op.target==='people'&&(base.tables.characters.characterById as Record<string,unknown>)[op.id])throw new StudioError('SCOPE','基础人物请取消可玩资格；当前规则不支持删除官方人物。');delete items[op.id];}
  else {if(actual!==null&&op.target!=='states')throw new StudioError('OPERATION','已有实体须使用字段更新。');entityValue(op.target,op.id,op.after,base);items[op.id]=clone(op.after);}
 }
 // A delete cannot leave references. Invalid editable fields can otherwise remain
 // in an explicit draft; compilation/preview is blocked until repaired.
 for(const op of operations)if(!op.field&&op.after===null){const refs=references(next,base,op.target,op.id);if(refs.length)throw new StudioError('REFERENCED','仍有引用，不能删除。',refs);}
 if(equal(next,draft))throw new StudioError('NO_CHANGE','没有实际变更。');
 return next;
}
/** Invert the net document change, including materialized scenario overrides.
 * Small state edits keep person-level conflicts; large snapshots invert once. */
export function inverseOperations(before:Draft,after:Draft,base:ContentPackage):Operation[]{
 const inverse:Operation[]=[],groups:{id:string;left:Scenario['states'];right:Scenario['states'];ops:Operation[]}[]=[];
 for(const target of ['scenarios','people','families','events','eventTests','sites','roads','geography'] as const){
  for(const id of new Set([...Object.keys(before[target]),...Object.keys(after[target])])){
   const a=before[target][id],b=after[target][id];if(equal(a,b))continue;
   if(!a||!b){inverse.push({target,id,before:b??null,after:a??null});continue;}
   for(const field of Object.keys(fields[target])){
    if(target==='scenarios'&&field==='states')continue;
    const av=(a as unknown as Record<string,unknown>)[field],bv=(b as unknown as Record<string,unknown>)[field];if(!equal(av,bv))inverse.push({target,id,field,before:bv??null,after:av??null});
   }
   if(target==='scenarios'){const left=before.scenarios[id].states,right=after.scenarios[id].states,ops:Operation[]=[];for(const pid of new Set([...Object.keys(left),...Object.keys(right)]))if(!equal(left[pid],right[pid]))ops.push({target:'states',id:pid,scenarioId:id,before:right[pid]??effectiveState(after,base,id,pid),after:left[pid]??null});if(ops.length)groups.push({id,left,right,ops});}
  }
 }
 let remaining=100-inverse.length-groups.length;for(const g of groups){if(g.ops.length-1<=remaining){inverse.push(...g.ops);remaining-=g.ops.length-1;}else inverse.push({target:'scenarios',id:g.id,field:'states',before:g.right,after:g.left});}
 return inverse;
}
export function references(draft:Draft,base:ContentPackage,target:Target,id:string){
 const found:{entityId:string;fieldPath:string}[]=[];
 for(const p of Object.values(draft.people))for(const key of target==='families'?['family']:target==='people'?['father','mother']:[])if((p as unknown as Record<string,unknown>)[key]===id)found.push({entityId:p.id,fieldPath:'people.'+key});
 if(target==='people')for(const s of Object.values(draft.scenarios)){if(s.defaultCharacter===id)found.push({entityId:s.id,fieldPath:'scenarios.defaultCharacter'});if(s.states[id])found.push({entityId:s.id,fieldPath:'states.'+id});}
 if(target==='people')for(const s of Object.values(draft.scenarios))for(const army of s.strategy?.armies??[])if(army.commander===id)found.push({entityId:s.id,fieldPath:'scenarios.strategy.armies.'+army.id+'.commander'});
 if(target==='people')for(const s of Object.values(draft.scenarios)){if(s.personSetup&&Object.hasOwn(s.personSetup,id))found.push({entityId:s.id,fieldPath:'scenarios.personSetup.'+id});for(const [r,h] of Object.entries(s.succession??{}))if(h.ruler===id||h.executive===id)found.push({entityId:s.id,fieldPath:'scenarios.succession.'+r});}
 if(target==='people')for(const s of Object.values(draft.scenarios))if(s.life&&Object.hasOwn(s.life,id))found.push({entityId:s.id,fieldPath:'scenarios.life.'+id});
 if(target==='people')for(const s of Object.values(draft.scenarios))for(const r of s.politics?.realms??[]){if(r.ruler===id)found.push({entityId:s.id,fieldPath:'scenarios.politics.realms.'+r.id+'.ruler'});if(r.executives.includes(id))found.push({entityId:s.id,fieldPath:'scenarios.politics.realms.'+r.id+'.executives'});}
 if(target==='families')for(const p of base.tables.families.familyPeople as {id:string;family:string}[])if(!draft.people[p.id]&&p.family===id)found.push({entityId:p.id,fieldPath:'familyPeople.family'});
 for(const e of Object.values(draft.events)){if(target==='people'&&e.actor.personId===id)found.push({entityId:e.id,fieldPath:'events.actor.personId'});if(target==='scenarios'&&e.scenarioIds.includes(id))found.push({entityId:e.id,fieldPath:'events.scenarioIds'});}
 for(const t of Object.values(draft.eventTests))if(target==='events'&&t.eventId===id||target==='scenarios'&&t.scenarioId===id||target==='people'&&t.characterId===id)found.push({entityId:t.id,fieldPath:'eventTests'});
 return found;
}
export function diagnose(draft:Draft,base:ContentPackage,scenarioId?:string):Diagnostic[]{
 const out:Diagnostic[]=[...geographicIssues(draft,base)],t=base.tables as Record<string,any>,add=(entityId:string,fieldPath:string,message:string)=>out.push({code:'REFERENCE',severity:'error',entityId,fieldPath,message});
 const ancestors=new Set([...Object.keys(draft.people),...t.families.familyPeople.filter((p:any)=>!t.characters.characterById[p.id]).map((p:any)=>p.id)]);
 for(const p of Object.values(draft.people)){
  if(!p.name.trim())add(p.id,'people.name','姓名不能为空。');if(!draft.families[p.family])add(p.id,'people.family','家族不存在。');
  for(const key of ['father','mother'] as const)if(p[key]&&(!ancestors.has(p[key])||p[key]===p.id))add(p.id,'people.'+key,'亲缘引用无效。');
 }
 const parentMap=new Map<string,string[]>();for(const l of t.families.parentLinks)if(!draft.people[l.child])parentMap.set(l.child,[...(parentMap.get(l.child)??[]),l.parent]);
 for(const p of Object.values(draft.people))parentMap.set(p.id,[p.father,p.mother].filter(Boolean) as string[]);
 const done=new Set<string>(),active=new Set<string>();function walk(id:string){if(active.has(id)){add(id,'people.father','亲缘存在循环。');return;}if(done.has(id))return;active.add(id);for(const parent of parentMap.get(id)??[])walk(parent);active.delete(id);done.add(id);}for(const id of Object.keys(draft.people))walk(id);
 for(const s of Object.values(draft.scenarios).filter(s=>!scenarioId||s.id===scenarioId)){
  let t=base.tables as Record<string,any>;if(s.map){try{out.push(...scenarioMapIssues(s.map,base,s.year));t=compileScenarioMap(s.map,base).tables;}catch(e){add(s.id,'scenarios.map',String(e));continue;}}
  if(s.map)for(const id of Object.keys(s.map.sites))if(!base.tables.scenario.siteById||!(id in (base.tables.scenario.siteById as object))){if(!s.strategy?.cities[id])add(id,'scenarios.strategy','新增地点须明确人口、钱粮与控制等开局参数');}
  try{validateStrategyReferences(s.strategy,t.scenario.siteById,draft.people,t.territorialHierarchy.territoryNodes,s.year,s.politics?.realms.map(r=>r.id));if(s.politics){const sites=Object.fromEntries(Object.entries(t.scenario.siteById).map(([id,v])=>[id,{polity:s.strategy?.cities[id]?.owner??(v as {polity:string}).polity}]));validatePoliticalReferences(s.politics,sites,Object.fromEntries(Object.keys(draft.people).filter(id=>presenceAtStart(s.life??null,{...t.lifespans.birthRecords,...Object.fromEntries(Object.values(draft.people).map(p=>[p.id,{year:p.birth}]))},s.year,id)==='active').map(id=>[id,effectiveState(draft,base,s.id,id)])),Object.fromEntries(Object.values(draft.people).map(p=>[p.id,{year:p.birth}])),s.year);}}catch(e){add(s.id,'scenarios.strategy',String(e));}
  for(const id of Object.keys(s.states))if(!draft.people[id])add(s.id,'scenarios.states.'+id,'剧本状态引用了不存在的人物。');
  const date=new Date(Date.UTC(s.year,s.month-1,s.day));if(date.getUTCMonth()!==s.month-1||date.getUTCDate()!==s.day)add(s.id,'scenarios.day','不是有效的公历日期。');
  if(!draft.people[s.defaultCharacter]||!effectiveState(draft,base,s.id,s.defaultCharacter).playable)add(s.id,'scenarios.defaultCharacter','默认人物必须存在且允许开局。');
  try{validateScenarioLife(s.life??null,{...t.lifespans.birthRecords,...Object.fromEntries(Object.values(draft.people).map(p=>[p.id,{year:p.birth}]))},s.year,[s.defaultCharacter,...(s.politics?.realms.flatMap(r=>[r.ruler,...r.executives])??['xiao-yan','yuan-shanjian','yuan-baoju','gao-huan','gao-cheng','yuwen-tai']),...(s.strategy?.armies??t.campaignSetup.campaignSetup.armies).flatMap((a:any)=>a.commander?[a.commander]:[]),...Object.keys(draft.people).filter(id=>{const p=effectiveState(draft,base,s.id,id);return p.playable||!['none','inherit'].includes(p.office);})]);}catch(e){add(s.id,'scenarios.life',String(e));}
  for(const id of Object.keys(s.personSetup??{}))if(!draft.people[id])add(id,'scenarios.personSetup','能力配置人物不存在');
  for(const [realm,h] of Object.entries(s.succession??{})){if(!(s.politics?.realms.map(r=>r.id)??['liang','east','west']).includes(realm as never))add(realm,'scenarios.succession','继承配置政权未启用');for(const id of [h.ruler,h.executive].filter(Boolean) as string[])if(!draft.people[id]||effectiveState(draft,base,s.id,id).polity!==realm||presenceAtStart(s.life??null,{...t.lifespans.birthRecords,...Object.fromEntries(Object.values(draft.people).map(p=>[p.id,{year:p.birth}]))},s.year,id)!=='active')add(id,'scenarios.succession','继承人须为本国在世人物');}
  const seats=new Set<string>();
  for(const p of Object.values(draft.people)){const state=effectiveState(draft,base,s.id,p.id);if(presenceAtStart(s.life??null,{[p.id]:{year:p.birth}},s.year,p.id)==='active'&&!(s.politics?.realms.map(r=>r.id)??['liang','east','west']).includes(state.polity))add(p.id,'states.polity','效忠政权未在本剧本启用。');if(!t.scenario.siteById[state.home])add(p.id,'states.home','所在地不存在。');
   if(!s.politics&&['ruler','regent'].includes(state.role)&&state.role!==t.characters.characterById[p.id]?.role)add(p.id,'states.role','君主与执政者沿用基础政治结构；当前阶段不能仅凭履历类别增设此职位。');
   if(!['inherit','none'].includes(state.office)){const site=state.office.replace(/^county:/,'');if(state.office!==`county:${site}`||!t.scenario.siteById[site]||(s.strategy?.cities[site]?.controller??t.scenario.siteById[site].polity)!==state.polity||state.home!==site)add(p.id,'states.office','县级任职须属于效忠政权，且开局驻地为该县治。');if(seats.has(state.office))add(p.id,'states.office','同一职位不能配置多人。');seats.add(state.office);}
  }
 }
 for(const event of Object.values(draft.events)){const assigned=event.scenarioIds.map(id=>draft.scenarios[id]).filter(Boolean).filter(s=>!scenarioId||s.id===scenarioId);if(scenarioId&&!event.scenarioIds.includes(scenarioId))continue;const sites=assigned.length?assigned.map(s=>new Set(Object.keys(s.map?.sites??draft.sites))).reduce((a,b)=>new Set([...a].filter(id=>b.has(id)))):new Set(Object.keys(draft.sites));out.push(...eventDefinitionIssues([event],{people:new Set(Object.keys(draft.people)),sites,scenarios:new Set(Object.keys(draft.scenarios))}));}
 for(const test of Object.values(draft.eventTests)){assertEventTest(test);const e=draft.events[test.eventId],scenario=draft.scenarios[test.scenarioId];if(!e||!scenario||!e.scenarioIds.includes(test.scenarioId))add(test.id,'eventTests.eventId','事件或适用剧本不存在');if(!draft.people[test.characterId]||scenario&&!effectiveState(draft,base,scenario.id,test.characterId).playable)add(test.id,'eventTests.characterId','测试人物必须可玩');for(const choice of test.choices)if(!e?.stages.find(s=>s.id===choice.stage)?.options.some(o=>o.id===choice.option))add(test.id,'eventTests.choices','测试引用无效阶段或选项');}
 return out;
}
/** Compile one selected scenario into its own complete package. Other scenarios
 * remain authoring data and can never overwrite this instance's definitions. */
export function compileDraftTables(draft:Draft,base:ContentPackage,scenarioId:string):ContentTables {
 const issues=diagnose(draft,base,scenarioId);if(issues.length)throw new StudioError('DIAGNOSTICS','请先修复草稿问题。',issues);
 const original=projectDraft(base),s=draft.scenarios[scenarioId];if(!s)throw new StudioError('REFERENCE','剧本不存在。');
 const selected=s.map??draft,t=clone(s.map?compileScenarioMap(s.map,base).tables:base.tables) as Record<string,any>;
 Object.assign(t.scenario,geographicTables(selected,s.map?compileScenarioMap(s.map,base):base));
 if(selected.geography.map.boundaries.mode==='generated')t['territories.json'].value=clone(selected.geography.map.boundaries.value);
 // Corridors touching moved endpoints are explicitly rebuilt as straight segments.
 for(const [id,site] of Object.entries(selected.sites))if(site.lon!==original.sites[id]?.lon||site.lat!==original.sites[id]?.lat)for(const edge of Object.keys(t.roadCorridors.roadCorridors))if(edge.split(':').includes(id))delete t.roadCorridors.roadCorridors[edge];
 const index=(rows:any[])=>Object.fromEntries(rows.map(p=>[p.id,p]));
 for(const f of Object.values(draft.families)){if(equal(f,original.families[f.id]))continue;const old=t.families.families.find((x:any)=>x.id===f.id);if(old)Object.assign(old,f);else t.families.families.push({...f,originKind:'设定',color:'#9b8876',note:'作者设定家系。',sources:[]});}
 t.families.families=t.families.families.filter((f:any)=>draft.families[f.id]);
 if(s.map)for(const site of t.scenario.sites){if(s.strategy?.cities[site.id])site.polity=s.strategy.cities[site.id].owner;if(!Object.hasOwn(base.tables.scenario.siteById as object,site.id)){const c=s.strategy!.cities[site.id];t.populationEstimates.populationEstimates[site.id]={people:c.population,low:c.population,high:c.population,basis:'authored',source:'',note:c.source};}}
 t.campaignSetup.campaignSetup.personSetup=clone(s.personSetup??{});t.campaignSetup.campaignSetup.succession=clone(s.succession??{});
 t.campaignSetup.campaignSetup.life=clone(s.life??null);
 t.campaignSetup.campaignSetup.politics=clone(s.politics??null);
 if(s.politics){for(const r of s.politics.realms)if(t.territorialHierarchy.territoryNodes['realm:'+r.id])t.territorialHierarchy.territoryNodes['realm:'+r.id].name=r.name;t.territorialHierarchy.territoryRoots=Object.values(t.territorialHierarchy.territoryNodes).filter((n:any)=>!n.parent);t.scenario.polities={frontier:t.scenario.polities.frontier,...Object.fromEntries(s.politics.realms.map(r=>[r.id,{name:r.name,short:r.short,color:r.color}]))};for(const site of t.scenario.sites){site.polity=s.strategy?.cities[site.id]?.owner??site.polity;site.capital=s.politics.realms.some(r=>r.capital===site.id);}t.scenario.siteById=index(t.scenario.sites);}
 t.campaignSetup.campaignSetup.personStarts={};
 for(const p of Object.values(draft.people)){
  const state=effectiveState(draft,base,scenarioId,p.id),before=original.people[p.id],changed=!equal(p,before),stateChanged=!!s.states[p.id];
  if(!changed&&!stateChanged)continue;
  if(s.politics){for(const table of [t.localOfficials,t.court]){const visit=(v:any)=>{if(!v||typeof v!=='object')return;if(v.id===p.id||v.person===p.id){if('realm'in v)v.realm=state.polity;if('home'in v)v.home=state.home;}for(const x of Object.values(v))visit(x);};visit(table);}}
  const c={...(t.characters.characterById[p.id]??{sources:[]}),id:p.id,name:p.name,family:p.family,biography:p.biography,home:state.home,polity:state.polity,role:state.role,title:state.title};
  let row=t.characters.historicalCharacters.find((x:any)=>x.id===p.id)??t.additionalStarts.additionalStarts.find((x:any)=>x.id===p.id);if(row)Object.assign(row,c);else t.characters.historicalCharacters.push(c);
  const rp={...(t.relationships.relationshipPersonById[p.id]??{status:'fictional'}),id:p.id,name:p.name,family:p.family,realm:state.polity,home:state.home,sex:p.sex,adult:s.year-p.birth>=16,note:p.biography};
  row=t.relationships.relationshipPeople.find((x:any)=>x.id===p.id);if(row)Object.assign(row,rp);else t.relationships.relationshipPeople.push(rp);
  row=t.families.familyPeople.find((x:any)=>x.id===p.id);if(row)Object.assign(row,{name:p.name,family:p.family,description:p.biography});else t.families.familyPeople.push({id:p.id,name:p.name,family:p.family,status:'fictional',description:p.biography,sources:[]});
  row=t.expandedPeople.expandedPeople.find((x:any)=>x.id===p.id);if(row)Object.assign(row,{name:p.name,family:p.family,home:state.home,realm:state.polity,role:state.role,birth:p.birth,sex:p.sex,note:p.biography});
  if(!before||p.birth!==before.birth)t.lifespans.birthRecords[p.id]={year:p.birth,basis:'fictional'};
  t.cultures.personCultures[p.id]=p.culture;
  if(!before||p.father!==before.father||p.mother!==before.mother){t.families.parentLinks=t.families.parentLinks.filter((l:any)=>l.child!==p.id);t.relationships.relationshipParents=t.relationships.relationshipParents.filter((l:any)=>l.child!==p.id);for(const [key,kind] of [['father','父亲'],['mother','母亲']] as const)if(p[key]){t.families.parentLinks.push({parent:p[key],child:p.id,kind,source:{title:'作者设定',url:''}});t.relationships.relationshipParents.push({parent:p[key],child:p.id});}}
  if(stateChanged||!before||p.sex!==before.sex)t.campaignSetup.campaignSetup.personStarts[p.id]={...(stateChanged||!before?{coins:state.coins,food:state.food,npcCoins:state.npcCoins}:{}),sex:p.sex,...(state.office!=='inherit'?{office:state.office}:{} )};
 }
 t.characters.characterById=index([...t.characters.historicalCharacters,...t.additionalStarts.additionalStarts]);t.relationships.relationshipPersonById=index(t.relationships.relationshipPeople);t.families.familyById=index(t.families.families);t.families.familyPersonById=index(t.families.familyPeople);
 t.expandedPeople.expandedPersonById=index(t.expandedPeople.expandedPeople);
 if(s.life)t.relationships.historicalMarriages=t.relationships.historicalMarriages.filter((marriage:any)=>[marriage.a,marriage.b].every(id=>['active','dead'].includes(presenceAtStart(s.life!,t.lifespans.birthRecords,s.year,id))));
 t.scripts.DEFAULT_SCRIPT=s.id;t.scripts.gameScripts=[{id:s.id,name:s.name,year:s.year,month:s.month,day:s.day,description:s.description,characterIds:Object.keys(draft.people).filter(id=>effectiveState(draft,base,s.id,id).playable),defaultCharacter:s.defaultCharacter,allowFictional:true}];
 t.authoredEvents={authoredEventDefinitions:Object.values(draft.events).filter(e=>e.scenarioIds.includes(s.id)).map(e=>({...clone(e),scenarioIds:[s.id]}))};
 t.campaignSetup.campaignSetup.seed=s.seed;t.campaignSetup.campaignSetup.treasury={coins:s.treasuryCoins,grain:s.treasuryGrain};compileStrategy(t,s.strategy);if(s.politics){const ids=s.politics.realms.map(r=>r.id);t.campaignSetup.campaignSetup.armies=t.campaignSetup.campaignSetup.armies.filter((a:any)=>ids.includes(a.realm));}return t;
}
/** Copy scenario membership without silently dropping enabled events or replay tests. */
export function copyScenarioOperations(draft:Draft,sourceId:string,id:string,name:string,base:ContentPackage):Operation[]{
 validId(id);const source=draft.scenarios[sourceId];if(!source||draft.scenarios[id])throw new StudioError('REFERENCE','来源剧本不存在或新 ID 已占用');
 const operations:Operation[]=[{target:'scenarios',id,before:null,after:{...clone(source),id,name,life:clone(source.life??{}),map:clone(source.map??mapTemplate(draft,base))}}];
 for(const e of Object.values(draft.events))if(e.scenarioIds.includes(sourceId))operations.push({target:'events',id:e.id,field:'scenarioIds',before:e.scenarioIds,after:[...e.scenarioIds,id]});
 let n=0;for(const t of Object.values(draft.eventTests))if(t.scenarioId===sourceId){let tid;do{tid=id.slice(0,60)+'-test-'+(++n);}while(draft.eventTests[tid]);operations.push({target:'eventTests',id:tid,before:null,after:{...clone(t),id:tid,scenarioId:id}});}
 return operations;
}

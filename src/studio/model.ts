import {assertEventShape,assertEventTest,eventDefinitionIssues,type EventDefinition,type EventTest} from '../core/eventDefinitions';
export {eventCapabilities,newEventDefinition,assertEventTest} from '../core/eventDefinitions';
import type {ContentPackage} from '../core/contentPackage';
import type {ContentTables} from '../core/contentBinding';
export type Realm='liang'|'east'|'west';
export interface PersonDefinition {id:string;name:string;family:string;birth:number;sex:'male'|'female';culture:string;biography:string;father:string|null;mother:string|null}
export interface FamilyDefinition {id:string;name:string;surname:string;origin:string}
export interface PersonState {home:string;polity:Realm;role:'ruler'|'regent'|'prince'|'commander'|'scholar';title:string;coins:number;food:number;npcCoins:number;playable:boolean;office:string}
export interface Scenario {id:string;name:string;year:number;month:number;day:number;description:string;defaultCharacter:string;seed:number;treasuryCoins:number;treasuryGrain:number;states:Record<string,PersonState>}
export interface Draft {events:Record<string,EventDefinition>;eventTests:Record<string,EventTest>;people:Record<string,PersonDefinition>;families:Record<string,FamilyDefinition>;scenarios:Record<string,Scenario>}
export type Target='events'|'eventTests'|'people'|'families'|'scenarios'|'states';
export interface Operation {target:Target;id:string;scenarioId?:string;field?:string;before:unknown;after:unknown}
export interface Diagnostic {code:string;severity:'error'|'warning';entityId:string;fieldPath:string;message:string}
export class StudioError extends Error {constructor(public code:string,message:string,public details:unknown=null,public status=400){super(message);}}
export const clone=<T,>(v:T):T=>structuredClone(v);
export const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// These types are public capability/schema data, shared by UI, CLI and service.
type Field={type:'text'|'number'|'boolean'|'reference'|'structured';min?:number;max?:number;values?:readonly string[];nullable?:boolean};
const text:Field={type:'text',max:200},reference:Field={type:'reference',max:100},money:Field={type:'number',min:0,max:1_000_000};
export const fields:Record<Target,Record<string,Field>>={
 events:{name:{type:'text',max:120},description:{type:'text',max:2000},enabled:{type:'boolean'},scenarioIds:{type:'structured'},actor:{type:'structured'},site:reference,requiresAuthority:{type:'boolean'},conditions:{type:'structured'},probability:{type:'number',min:0,max:100},cooldownDays:{type:'number',min:1,max:365},maxRuns:{type:'number',min:1,max:20},startStage:reference,stages:{type:'structured'}},
 eventTests:{name:{type:'text',max:120},eventId:reference,scenarioId:reference,characterId:reference,seed:{type:'number',min:1,max:0xffffffff},dayBudget:{type:'number',min:0,max:7},stepBudget:{type:'number',min:1,max:32},choices:{type:'structured'},expectedStatus:{type:'text',values:['resolved','cancelled','expired','invalid']}},
 people:{name:text,family:reference,birth:{type:'number',min:1,max:9999},sex:{type:'text',values:['male','female']},culture:{type:'text',values:['han','xianbei','gaoche','jie','unknown']},biography:{type:'text',max:5000},father:{...reference,nullable:true},mother:{...reference,nullable:true}},
 families:{name:text,surname:text,origin:text},
 scenarios:{name:text,year:{type:'number',min:100,max:9999},month:{type:'number',min:1,max:12},day:{type:'number',min:1,max:31},description:{type:'text',max:5000},defaultCharacter:reference,seed:{type:'number',min:1,max:0xffffffff},treasuryCoins:money,treasuryGrain:money},
 states:{home:reference,polity:{type:'text',values:['liang','east','west']},role:{type:'text',values:['ruler','regent','prince','commander','scholar']},title:text,coins:money,food:money,npcCoins:money,playable:{type:'boolean'},office:reference},
};
export function validId(id:unknown):asserts id is string {if(typeof id!=='string'||!/^[a-z][a-z0-9:_-]{0,99}$/.test(id)||['constructor','prototype','__proto__'].includes(id))throw new StudioError('ID','实体 ID 无效。',{fieldPath:'id'});}
function fieldValue(target:Target,field:string,value:unknown){
 const rule=Object.hasOwn(fields[target],field)?fields[target][field]:undefined,path=target+'.'+field;
 if(!rule)throw new StudioError('FIELD','不支持的字段：'+path,{fieldPath:path});
 const valid=rule.type==='structured'||value===null&&rule.nullable||rule.type==='boolean'&&typeof value==='boolean'||rule.type==='number'&&typeof value==='number'&&Number.isSafeInteger(value)&&value>=rule.min!&&value<=rule.max!||['text','reference'].includes(rule.type)&&typeof value==='string'&&value.length<=(rule.max??200)&&!value.includes('\0')&&(!rule.values||rule.values.includes(value));
 if(!valid)throw new StudioError('TYPE','字段类型或范围错误：'+path,{fieldPath:path});
}
function entityValue(target:Target,id:string,value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new StudioError('TYPE','实体必须是对象。');
 if(target==='events'){assertEventShape(value);if(value.id!==id||id==='hou-jing')throw new StudioError('ID','保留或不一致的事件 ID');return;}
 if(target==='eventTests'){assertEventTest(value);if(value.id!==id)throw new StudioError('ID','测试 ID 不一致');return;}
 const item=value as Record<string,unknown>,allowed=[...Object.keys(fields[target]),...(target==='states'?[]:['id']),...(target==='scenarios'?['states']:[])];
 if(Object.keys(item).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(item,k)))throw new StudioError('FIELD','实体字段不完整或包含未知字段。',{entityId:id,fieldPath:target});
 if(target!=='states'&&item.id!==id)throw new StudioError('ID','实体 ID 与操作 ID 不一致。');
 for(const key of Object.keys(fields[target]))fieldValue(target,key,item[key]);
 if(target==='scenarios'){
  if(!item.states||typeof item.states!=='object'||Array.isArray(item.states))throw new StudioError('TYPE','剧本状态必须是对象。');
  for(const [pid,state] of Object.entries(item.states)){validId(pid);entityValue('states',pid,state);}
 }
}
export function projectDraft(base:ContentPackage):Draft {
 const t=base.tables as Record<string,any>,people:Draft['people']={},families:Draft['families']={},scenarios:Draft['scenarios']={};
 for(const p of Object.values(t.characters.characterById) as any[]){const r=t.relationships.relationshipPersonById[p.id];if(!Number.isSafeInteger(t.lifespans.birthRecords[p.id]?.year))throw new StudioError('BASE','基础人物缺少出生年份记录：'+p.id);people[p.id]={id:p.id,name:p.name,family:p.family,birth:t.lifespans.birthRecords[p.id].year,sex:r?.sex??'male',culture:p.id.startsWith('county-official-')||p.id.startsWith('office-reserve-')?'han':t.cultures.personCultures[p.id]??'unknown',biography:p.biography,father:t.families.parentLinks.find((l:any)=>l.child===p.id&&l.kind==='父亲')?.parent??null,mother:t.families.parentLinks.find((l:any)=>l.child===p.id&&l.kind==='母亲')?.parent??null};}
 for(const f of t.families.families)families[f.id]={id:f.id,name:f.name,surname:f.surname,origin:f.origin};
 for(const s of t.scripts.gameScripts)scenarios[s.id]={id:s.id,name:s.name,year:s.year,month:s.month??1,day:s.day??1,description:s.description,defaultCharacter:s.defaultCharacter,seed:t.campaignSetup.campaignSetup.seed,treasuryCoins:t.campaignSetup.campaignSetup.treasury.coins,treasuryGrain:t.campaignSetup.campaignSetup.treasury.grain,states:{}};
 return {people,families,scenarios,events:Object.fromEntries((t.authoredEvents?.authoredEventDefinitions??[]).map((e:EventDefinition)=>[e.id,clone(e)])),eventTests:{}};
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
  validId(op.id);if(op.target==='states'){validId(op.scenarioId);if(!next.people[op.id])throw new StudioError('REFERENCE','人物不存在。');}else if(op.scenarioId!==undefined)throw new StudioError('SCOPE','此操作不接受剧本作用域。');
  const actual=currentValue(next,base,op);if(!equal(actual,op.before))throw new StudioError('CONFLICT','原值已变化，请重新读取并审阅。',{operation:op,actual},409);
  if(op.target==='people'&&actual===null&&!op.field){const t=base.tables as Record<string,any>;if(op.id==='fictional'||op.id.startsWith('born-')||t.relationships.relationshipPersonById[op.id]||t.families.familyPersonById[op.id]||t.campaignSetup.campaignSetup.people.some((p:any)=>p.id===op.id))throw new StudioError('ID','此人物 ID 已由基础人物、先祖或模拟角色保留。');}
  const items=collection(next,op) as Record<string,any>;
  if(op.field){fieldValue(op.target,op.field,op.after);if(!items[op.id]){if(op.target!=='states')throw new StudioError('REFERENCE','实体不存在。');items[op.id]=effectiveState(next,base,op.scenarioId!,op.id);}items[op.id][op.field]=clone(op.after);if(op.target==='events'||op.target==='eventTests')entityValue(op.target,op.id,items[op.id]);}
  else if(op.after===null){if(op.target==='scenarios'&&Object.keys(next.scenarios).length===1)throw new StudioError('REFERENCE','至少保留一个剧本。');if(op.target==='people'&&(base.tables.characters.characterById as Record<string,unknown>)[op.id])throw new StudioError('SCOPE','基础人物请取消可玩资格；当前规则不支持删除官方人物。');delete items[op.id];}
  else {if(actual!==null&&op.target!=='states')throw new StudioError('OPERATION','已有实体须使用字段更新。');entityValue(op.target,op.id,op.after);items[op.id]=clone(op.after);}
 }
 // A delete cannot leave references. Invalid editable fields can otherwise remain
 // in an explicit draft; compilation/preview is blocked until repaired.
 for(const op of operations)if(!op.field&&op.after===null){const refs=references(next,base,op.target,op.id);if(refs.length)throw new StudioError('REFERENCED','仍有引用，不能删除。',refs);}
 if(equal(next,draft))throw new StudioError('NO_CHANGE','没有实际变更。');
 return next;
}
/** Invert the net document change, including materialized scenario overrides.
 * Reversing individual field operations cannot remove a newly created override. */
export function inverseOperations(before:Draft,after:Draft,base:ContentPackage):Operation[]{
 const inverse:Operation[]=[];
 for(const target of ['scenarios','people','families','events','eventTests'] as const){
  for(const id of new Set([...Object.keys(before[target]),...Object.keys(after[target])])){
   const a=before[target][id],b=after[target][id];if(equal(a,b))continue;
   if(!a||!b){inverse.push({target,id,before:b??null,after:a??null});continue;}
   for(const field of Object.keys(fields[target])){
    const av=(a as unknown as Record<string,unknown>)[field],bv=(b as unknown as Record<string,unknown>)[field];if(!equal(av,bv))inverse.push({target,id,field,before:bv,after:av});
   }
   if(target==='scenarios'){
    const left=before.scenarios[id].states,right=after.scenarios[id].states;
    for(const pid of new Set([...Object.keys(left),...Object.keys(right)]))if(!equal(left[pid],right[pid]))inverse.push({target:'states',id:pid,scenarioId:id,before:right[pid]??effectiveState(after,base,id,pid),after:left[pid]??null});
   }
  }
 }
 return inverse;
}
export function references(draft:Draft,base:ContentPackage,target:Target,id:string){
 const found:{entityId:string;fieldPath:string}[]=[];
 for(const p of Object.values(draft.people))for(const key of target==='families'?['family']:target==='people'?['father','mother']:[])if((p as unknown as Record<string,unknown>)[key]===id)found.push({entityId:p.id,fieldPath:'people.'+key});
 if(target==='people')for(const s of Object.values(draft.scenarios)){if(s.defaultCharacter===id)found.push({entityId:s.id,fieldPath:'scenarios.defaultCharacter'});if(s.states[id])found.push({entityId:s.id,fieldPath:'states.'+id});}
 if(target==='families')for(const p of base.tables.families.familyPeople as {id:string;family:string}[])if(!draft.people[p.id]&&p.family===id)found.push({entityId:p.id,fieldPath:'familyPeople.family'});
 for(const e of Object.values(draft.events)){if(target==='people'&&e.actor.personId===id)found.push({entityId:e.id,fieldPath:'events.actor.personId'});if(target==='scenarios'&&e.scenarioIds.includes(id))found.push({entityId:e.id,fieldPath:'events.scenarioIds'});}
 for(const t of Object.values(draft.eventTests))if(target==='events'&&t.eventId===id||target==='scenarios'&&t.scenarioId===id||target==='people'&&t.characterId===id)found.push({entityId:t.id,fieldPath:'eventTests'});
 return found;
}
export function diagnose(draft:Draft,base:ContentPackage,scenarioId?:string):Diagnostic[]{
 const out:Diagnostic[]=[],t=base.tables as Record<string,any>,add=(entityId:string,fieldPath:string,message:string)=>out.push({code:'REFERENCE',severity:'error',entityId,fieldPath,message});
 const ancestors=new Set([...Object.keys(draft.people),...t.families.familyPeople.filter((p:any)=>!t.characters.characterById[p.id]).map((p:any)=>p.id)]);
 for(const p of Object.values(draft.people)){
  if(!p.name.trim())add(p.id,'people.name','姓名不能为空。');if(!draft.families[p.family])add(p.id,'people.family','家族不存在。');
  for(const key of ['father','mother'] as const)if(p[key]&&(!ancestors.has(p[key])||p[key]===p.id))add(p.id,'people.'+key,'亲缘引用无效。');
 }
 const parentMap=new Map<string,string[]>();for(const l of t.families.parentLinks)if(!draft.people[l.child])parentMap.set(l.child,[...(parentMap.get(l.child)??[]),l.parent]);
 for(const p of Object.values(draft.people))parentMap.set(p.id,[p.father,p.mother].filter(Boolean) as string[]);
 const done=new Set<string>(),active=new Set<string>();function walk(id:string){if(active.has(id)){add(id,'people.father','亲缘存在循环。');return;}if(done.has(id))return;active.add(id);for(const parent of parentMap.get(id)??[])walk(parent);active.delete(id);done.add(id);}for(const id of Object.keys(draft.people))walk(id);
 for(const s of Object.values(draft.scenarios).filter(s=>!scenarioId||s.id===scenarioId)){
  for(const id of Object.keys(s.states))if(!draft.people[id])add(s.id,'scenarios.states.'+id,'剧本状态引用了不存在的人物。');
  const date=new Date(Date.UTC(s.year,s.month-1,s.day));if(date.getUTCMonth()!==s.month-1||date.getUTCDate()!==s.day)add(s.id,'scenarios.day','不是有效的公历日期。');
  if(!draft.people[s.defaultCharacter]||!effectiveState(draft,base,s.id,s.defaultCharacter).playable)add(s.id,'scenarios.defaultCharacter','默认人物必须存在且允许开局。');
  const seats=new Set<string>();
  for(const p of Object.values(draft.people)){const state=effectiveState(draft,base,s.id,p.id);if(!t.scenario.siteById[state.home])add(p.id,'states.home','所在地不存在。');
   if(['ruler','regent'].includes(state.role)&&state.role!==t.characters.characterById[p.id]?.role)add(p.id,'states.role','君主与执政者沿用基础政治结构；当前阶段不能仅凭履历类别增设此职位。');
   if(!['inherit','none'].includes(state.office)){const site=state.office.replace(/^county:/,'');if(state.office!==`county:${site}`||!t.scenario.siteById[site]||t.scenario.siteById[site].polity!==state.polity||state.home!==site)add(p.id,'states.office','县级任职须属于效忠政权，且开局驻地为该县治。');if(seats.has(state.office))add(p.id,'states.office','同一职位不能配置多人。');seats.add(state.office);}
  }
 }
 out.push(...eventDefinitionIssues(Object.values(draft.events),{people:new Set(Object.keys(draft.people)),sites:new Set(Object.keys(t.scenario.siteById)),scenarios:new Set(Object.keys(draft.scenarios))}));
 for(const test of Object.values(draft.eventTests)){assertEventTest(test);const e=draft.events[test.eventId],scenario=draft.scenarios[test.scenarioId];if(!e||!scenario||!e.scenarioIds.includes(test.scenarioId))add(test.id,'eventTests.eventId','事件或适用剧本不存在');if(!draft.people[test.characterId]||scenario&&!effectiveState(draft,base,scenario.id,test.characterId).playable)add(test.id,'eventTests.characterId','测试人物必须可玩');for(const choice of test.choices)if(!e?.stages.find(s=>s.id===choice.stage)?.options.some(o=>o.id===choice.option))add(test.id,'eventTests.choices','测试引用无效阶段或选项');}
 return out;
}
/** Compile one selected scenario into its own complete package. Other scenarios
 * remain authoring data and can never overwrite this instance's definitions. */
export function compileDraftTables(draft:Draft,base:ContentPackage,scenarioId:string):ContentTables {
 const issues=diagnose(draft,base,scenarioId);if(issues.length)throw new StudioError('DIAGNOSTICS','请先修复草稿问题。',issues);
 const original=projectDraft(base),t=clone(base.tables) as Record<string,any>,s=draft.scenarios[scenarioId];if(!s)throw new StudioError('REFERENCE','剧本不存在。');
 const index=(rows:any[])=>Object.fromEntries(rows.map(p=>[p.id,p]));
 for(const f of Object.values(draft.families)){if(equal(f,original.families[f.id]))continue;const old=t.families.families.find((x:any)=>x.id===f.id);if(old)Object.assign(old,f);else t.families.families.push({...f,originKind:'设定',color:'#9b8876',note:'作者设定家系。',sources:[]});}
 t.families.families=t.families.families.filter((f:any)=>draft.families[f.id]);
 t.campaignSetup.campaignSetup.personStarts={};
 for(const p of Object.values(draft.people)){
  const state=effectiveState(draft,base,scenarioId,p.id),before=original.people[p.id],changed=!equal(p,before),stateChanged=!!s.states[p.id];
  if(!changed&&!stateChanged)continue;
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
 t.scripts.DEFAULT_SCRIPT=s.id;t.scripts.gameScripts=[{id:s.id,name:s.name,year:s.year,month:s.month,day:s.day,description:s.description,characterIds:Object.keys(draft.people).filter(id=>effectiveState(draft,base,s.id,id).playable),defaultCharacter:s.defaultCharacter,allowFictional:true}];
 t.authoredEvents={authoredEventDefinitions:Object.values(draft.events).filter(e=>e.scenarioIds.includes(s.id)).map(e=>({...clone(e),scenarioIds:[s.id]}))};
 t.campaignSetup.campaignSetup.seed=s.seed;t.campaignSetup.campaignSetup.treasury={coins:s.treasuryCoins,grain:s.treasuryGrain};return t;
}

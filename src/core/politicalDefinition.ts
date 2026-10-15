import type {RealmId} from './realm';
export type PoliticalTemplate='liang'|'east'|'west';
/** Declarative political initial state; never reapplied while restoring a save. */
export interface PoliticalRealm {id:RealmId;name:string;short:string;color:string;template:PoliticalTemplate;capital:string;ruler:string;executives:string[];source:string}
export interface PoliticalDefinition {realms:PoliticalRealm[];nativeEvents:string[]}
export const politicalId=(v:unknown):v is RealmId=>typeof v==='string'&&(['liang','east','west'].includes(v)||/^realm-[1-6]$/.test(v));
export function assertPolitics(value:unknown):asserts value is PoliticalDefinition|null {
 if(value===null)return;
 const obj=(v:unknown,keys:string[]):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 if(!obj(value,['realms','nativeEvents'])||!Array.isArray(value.realms)||value.realms.length<1||value.realms.length>9||!Array.isArray(value.nativeEvents)||value.nativeEvents.some(x=>x!=='hou-jing')||new Set(value.nativeEvents).size!==value.nativeEvents.length)throw new Error('政权配置须有 1—9 个政权及已登记原生事件。');
 const ids=new Set(),chiefs=new Set(),capitals=new Set();
 for(const r of value.realms){
  if(!obj(r,['id','name','short','color','template','capital','ruler','executives','source'])||!politicalId(r.id)||ids.has(r.id)||!['liang','east','west'].includes(r.template)||!/^#[0-9a-f]{6}$/i.test(r.color)||!['name','short','capital','ruler','source'].every(k=>typeof r[k]==='string'&&r[k].trim().length>0&&!r[k].includes('\0')&&r[k].length<=(k==='source'?2000:100))||!Array.isArray(r.executives)||!r.executives.length||r.executives.length>2||new Set(r.executives).size!==r.executives.length||r.executives.some((id:unknown)=>typeof id!=='string'||!id||String(id).length>100))throw new Error('政权定义字段、身份或执政名单无效。');
  ids.add(r.id);if(capitals.has(r.capital))throw new Error('不同政权不能共用开局首都。');capitals.add(r.capital);
  for(const id of new Set([r.ruler,...r.executives])){if(chiefs.has(id))throw new Error('同一人物不能统治多个开局政权。');chiefs.add(id);}
 }
}
export function validatePoliticalReferences(value:PoliticalDefinition|null,sites:Record<string,{polity:string}>,people:Record<string,{polity:string}>,births:Record<string,{year:number}>,year:number){
 assertPolitics(value);if(!value)return;
 const ids=value.realms.map(r=>r.id);
 for(const r of value.realms){
  if(!sites[r.capital]||sites[r.capital].polity!==r.id)throw new Error('首都须属于对应开局政权：'+r.id);
  for(const id of [r.ruler,...r.executives])if(!people[id]||people[id].polity!==r.id||!births[id]||year-births[id].year<(r.executives.includes(id)?16:0))throw new Error('君主须已出生，执政者须为本国成年人物：'+id);
 }
 for(const [id,s] of Object.entries(sites))if(s.polity!=='frontier'&&!ids.includes(s.polity as RealmId))throw new Error('地点引用未启用政权：'+id);
 for(const [id,p] of Object.entries(people))if(!ids.includes(p.polity as RealmId))throw new Error('人物引用未启用政权：'+id);
 if(value.nativeEvents.includes('hou-jing')&&(!ids.includes('east')||!people['hou-jing']||!people['gao-huan']))throw new Error('侯景原生事件缺少所需政权或人物。');
}

export const politicalCapabilities={version:1,maxRealms:9,realmIds:['liang','east','west',...Array.from({length:6},(_,i)=>'realm-'+(i+1))],templates:['liang','east','west'],nativeEvents:['hou-jing'],fields:{id:'stable realm ID',name:'display name',short:'short label',color:'#RRGGBB',template:'existing rules template, not political identity',capital:'owned and controlled site ID',ruler:'born person belonging to realm',executives:'1–2 adult persons belonging to realm',source:'source or explicit fictional assumption'},scope:'scenario; initial state only; no save-time reinitialization'} as const;

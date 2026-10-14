import type {HistoricalCharacter} from '../data/characters';
import type {Family,FamilyPerson,ParentLink} from '../data/families';
import type {RelationshipPerson} from '../data/relationships';
import type {GameScript} from '../data/scripts';
import type {Site,Road} from './types';
import {createMapRegistry} from './mapRegistry';

/** Authoring catalogue v1, not a complete loadable game package. Rules and initial
 * world configuration still live in the official runtime until later migration. */
export interface ContentSource {
 format:'fynbc-content-catalog';schemaVersion:1;packageId:string;contentVersion:string;
 sites:Site[];roads:Road[];characters:HistoricalCharacter[];people:RelationshipPerson[];
 families:Family[];familyPeople:FamilyPerson[];parentLinks:ParentLink[];scripts:GameScript[];
}
type Immutable<T>=T extends object?{readonly [K in keyof T]:Immutable<T[K]>}:T;
function freeze<T>(value:T):Immutable<T>{
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value as Immutable<T>;
}
function index<T extends {id:string}>(values:readonly T[],label:string):Map<string,T>{
 const result=new Map<string,T>();
 for(const value of values){if(!value.id||result.has(value.id))throw new Error(label+' ID 缺失或重复：'+value.id);result.set(value.id,value);}
 return result;
}
export function canonicalContent(source:ContentSource|Immutable<ContentSource>):string{
 return JSON.stringify(source,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value);
}
export function createContentRegistry(input:ContentSource){
 if(input.format!=='fynbc-content-catalog'||input.schemaVersion!==1||!input.packageId||!input.contentVersion)throw new Error('内容目录格式或版本不受支持。');
 const source=structuredClone(input),map=createMapRegistry(source.sites,source.roads);
 const characters=index(source.characters,'人物'),people=index(source.people,'关系人物'),families=index(source.families,'家族'),familyPeople=index(source.familyPeople,'家谱人物'),scripts=index(source.scripts,'剧本');
 for(const p of [...source.characters,...source.people,...source.familyPeople]){
  if(!families.has(p.family))throw new Error('人物引用了不存在的家族：'+p.id);
  if('home' in p&&p.home!==undefined&&!map.getSite(p.home))throw new Error('人物引用了不存在的地点：'+p.id);
 }
 for(const link of source.parentLinks)if(!familyPeople.has(link.parent)||!familyPeople.has(link.child)||link.parent===link.child)throw new Error('亲缘引用无效：'+link.parent+' → '+link.child);
 const children=new Map<string,string[]>();
 for(const link of source.parentLinks)children.set(link.parent,[...(children.get(link.parent)??[]),link.child]);
 const visited=new Set<string>(),active=new Set<string>();
 function visit(id:string){
  if(active.has(id))throw new Error('亲缘存在循环：'+id);
  if(visited.has(id))return;
  active.add(id);for(const child of children.get(id)??[])visit(child);active.delete(id);visited.add(id);
 }
 for(const id of familyPeople.keys())visit(id);
 for(const script of source.scripts){
  if(!Number.isSafeInteger(script.year)||new Set(script.characterIds).size!==script.characterIds.length||!script.characterIds.includes(script.defaultCharacter)||script.characterIds.some(id=>!characters.has(id)))throw new Error('剧本人物或日期配置无效：'+script.id);
 }
 const snapshot=freeze(source);
 return Object.freeze({
  snapshot,map,
  getCharacter:(id:string):Immutable<HistoricalCharacter>|undefined=>characters.get(id),
  getPerson:(id:string):Immutable<RelationshipPerson>|undefined=>people.get(id),
  getFamily:(id:string):Immutable<Family>|undefined=>families.get(id),
  getFamilyPerson:(id:string):Immutable<FamilyPerson>|undefined=>familyPeople.get(id),
  getScript:(id:string):Immutable<GameScript>|undefined=>scripts.get(id),
 });
}

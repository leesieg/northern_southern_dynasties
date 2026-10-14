import {canonicalContent,createContentRegistry,type ContentSource} from './contentRegistry';
import {bindContent,freezeContent,type ContentLock,type ContentTables} from './contentBinding';

export interface ContentEnvironment {
 engine:string;assets:string;officialDigest:string;
 tables:Record<string,string[]>;
}
/** Compiled declarative data only. Algorithms are a pinned, trusted engine dependency. */
export interface ContentPackage {
 format:'fynbc-content-package';schemaVersion:1;profile:'three-realms-v1';
 packageId:string;dependencies:{engine:string;assets:string};tables:ContentTables;digest:string;
}
export async function contentDigest(value:unknown){
 // Record iteration order participates in seeded simulation. Unlike a read-only
 // catalogue, a runnable package must not hash differently ordered tables alike.
 const bytes=new TextEncoder().encode(JSON.stringify(value));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function plainData(value:unknown,depth=0):void {
 if(depth>100)throw new Error('内容嵌套过深。');
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
 if(Array.isArray(value)){for(const item of value)plainData(item,depth+1);return;}
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('内容包只接受有限数值和 JSON 数据。');
 for(const [key,item] of Object.entries(value)){
  if(['__proto__','prototype','constructor'].includes(key))throw new Error('内容含保留字段。');
  plainData(item,depth+1);
 }
}
function validateTables(tables:ContentTables,expected:ContentEnvironment['tables']){
 if(canonicalContent(Object.keys(tables).sort())!==canonicalContent(Object.keys(expected).sort()))throw new Error('内容包数据表不完整或含未知数据表。');
 for(const [name,keys] of Object.entries(expected))if(!tables[name]||canonicalContent(Object.keys(tables[name]).sort())!==canonicalContent([...keys].sort()))throw new Error('内容包字段不完整：'+name);
 const scenario=tables.scenario as unknown as typeof import('../data/scenario');
 const chars=tables.characters as unknown as typeof import('../data/characters');
 const relations=tables.relationships as unknown as typeof import('../data/relationships');
 const families=tables.families as unknown as typeof import('../data/families');
 const scripts=tables.scripts as unknown as typeof import('../data/scripts');
 createContentRegistry({format:'fynbc-content-catalog',schemaVersion:1,packageId:'validation',contentVersion:scenario.CONTENT_VERSION,sites:scenario.sites,roads:scenario.roads,characters:Object.values(chars.characterById),people:relations.relationshipPeople,families:families.families,familyPeople:families.familyPeople,parentLinks:families.parentLinks,scripts:scripts.gameScripts as ContentSource['scripts']});
 const match=(a:unknown,b:unknown,label:string)=>{if(canonicalContent(a)!==canonicalContent(b))throw new Error('内容派生索引不一致：'+label);};
 const index=(items:{id:string}[])=>{
  if(items.some(item=>typeof item.id!=='string'||!item.id)||new Set(items.map(item=>item.id)).size!==items.length)throw new Error('内容实体 ID 无效或重复。');
  return Object.fromEntries(items.map(item=>[item.id,item]));
 };
 match(scenario.siteById,index(scenario.sites),'地点');
 match(chars.characterById,index([...chars.historicalCharacters,...tables.additionalStarts.additionalStarts as typeof chars.historicalCharacters]),'人物');
 match(families.familyById,index(families.families),'家族');match(families.familyPersonById,index(families.familyPeople),'家谱');
 match(relations.relationshipPersonById,index(relations.relationshipPeople),'关系');
 const expanded=tables.expandedPeople as unknown as typeof import('../data/expandedPeople');match(expanded.expandedPersonById,index(expanded.expandedPeople),'扩展人物');
 if(!scripts.gameScripts.some(s=>s.id===scripts.DEFAULT_SCRIPT))throw new Error('缺少默认剧本。');
 for(const s of scripts.gameScripts){const month=s.month??1,day=s.day??1,date=new Date(Date.UTC(s.year,month-1,day));if(!Number.isSafeInteger(month)||!Number.isSafeInteger(day)||date.getUTCFullYear()!==s.year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new Error('剧本日期无效。');}
 const hierarchy=tables.territorialHierarchy as unknown as typeof import('../data/territorialHierarchy');
 for(const [id,node] of Object.entries(hierarchy.territoryNodes)){
  if(node.id!==id||!['realm','province','prefecture','county','city'].includes(node.level)||node.site&&!scenario.siteById[node.site]||!Number.isSafeInteger(node.from)||!Number.isSafeInteger(node.until)||node.from>=node.until)throw new Error('区划节点无效：'+id);
  const seen=new Set([id]);let parent=node.parent;
  while(parent!==null){if(typeof parent!=='string'||seen.has(parent)||!hierarchy.territoryNodes[parent])throw new Error('区划父子关系无效：'+id);seen.add(parent);parent=hierarchy.territoryNodes[parent].parent;}
 }
 match(hierarchy.territoryRoots,Object.values(hierarchy.territoryNodes).filter(node=>!node.parent),'区划根节点');
 const setup=(tables.campaignSetup as unknown as typeof import('../data/campaignSetup')).campaignSetup;
 const integer=(n:number,min:number,max:number)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(!setup.personStarts||typeof setup.personStarts!=='object'||Array.isArray(setup.personStarts))throw new Error('人物开局覆盖无效。');
 for(const [id,start] of Object.entries(setup.personStarts)){
  if(!chars.characterById[id]||!start||Object.keys(start).some(k=>!['coins','food','npcCoins','sex','office'].includes(k))||!['male','female'].includes(start.sex))throw new Error('人物开局覆盖无效：'+id);
  for(const key of ['coins','food','npcCoins'] as const)if(start[key]!==undefined&&!integer(start[key]!,0,1e6))throw new Error('人物开局资源无效：'+id);
  if(start.office!==undefined&&start.office!=='none'&&!(start.office.startsWith('county:')&&scenario.siteById[start.office.slice(7)]))throw new Error('人物开局职位无效：'+id);
 }
 if(!integer(setup.seed,1,0xffffffff)||!integer(setup.treasury.coins,0,1e6)||!integer(setup.treasury.grain,0,1e6)||!integer(setup.troops,200,100000)||setup.troops%200||!integer(setup.grain,0,1e6))throw new Error('开局资源或种子无效。');
 for(const n of [setup.experience,setup.institution,setup.commanderLoyalty,setup.morale])if(!integer(n,0,100))throw new Error('开局军队状态无效。');
 for(const resources of Object.values(setup.roleResources))for(const [key,n] of Object.entries(resources))if(!integer(n,0,['coins','food'].includes(key)?1e6:3))throw new Error('人物开局资源无效。');
 for(const army of setup.armies)if(!['liang','east','west'].includes(army.realm)||!scenario.siteById[army.site]||army.commander&&!chars.characterById[army.commander])throw new Error('开局军队引用无效。');
 for(const entry of setup.influence)if(!chars.characterById[entry.person]||!integer(entry.value,0,100))throw new Error('开局影响力无效。');
 for(const entry of setup.opinions)if(!chars.characterById[entry.from]||!chars.characterById[entry.to]||!integer(entry.value,-100,100))throw new Error('开局关系无效。');
}
export async function compileContentPackage(tables:ContentTables,packageId:string,environment:Omit<ContentEnvironment,'officialDigest'>):Promise<ContentPackage>{
 if(typeof packageId!=='string'||!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(packageId))throw new Error('内容包 ID 无效。');
 plainData(tables);validateTables(tables,environment.tables);
 const body={format:'fynbc-content-package' as const,schemaVersion:1 as const,profile:'three-realms-v1' as const,packageId,dependencies:{engine:environment.engine,assets:environment.assets},tables:structuredClone(tables)};
 return freezeContent({...body,digest:await contentDigest(body)});
}
export async function loadContentPackage(input:unknown,environment:ContentEnvironment){
 plainData(input);
 const p=input as ContentPackage;
 if(!p||p.format!=='fynbc-content-package'||p.schemaVersion!==1||p.profile!=='three-realms-v1'||Object.keys(p).sort().join(',')!=='dependencies,digest,format,packageId,profile,schemaVersion,tables')throw new Error('完整内容包格式或版本不受支持。');
 if(p.dependencies?.engine!==environment.engine)throw new Error('内容包规则依赖版本不匹配。');
 if(p.dependencies?.assets!==environment.assets)throw new Error('内容包资产依赖缺失或版本不匹配。');
 const compiled=await compileContentPackage(p.tables,p.packageId,environment);
 if(compiled.digest!==p.digest)throw new Error('内容包摘要错误。');
 return compiled;
}
export async function installContentPackage(input:unknown,environment:ContentEnvironment):Promise<ContentLock>{
 const p=await loadContentPackage(input,environment);
 const lock={packageId:p.packageId,digest:p.digest,engine:p.dependencies.engine,assets:p.dependencies.assets};
 bindContent(lock,p.tables,p.digest===environment.officialDigest);
 return freezeContent(lock);
}

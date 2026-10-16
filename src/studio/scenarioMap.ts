import type {ContentPackage} from '../core/contentPackage';
import type {Site} from '../core/types';
import type {TerritoryNode} from '../data/territorialHierarchy';
import {assertBoundaries,geographicIssues,geographicTables,type StrategicDraft} from './strategicModel';
export interface ScenarioMap extends StrategicDraft {templates:Record<string,string>;nodes:Record<string,TerritoryNode&{source:string}>}
export function assertScenarioMap(value:unknown):asserts value is ScenarioMap|null {
 if(value===null)return;
 const m=value as ScenarioMap;if(!m||Object.keys(m).sort().join(',')!=='geography,nodes,roads,sites,templates')throw new Error('剧本地图字段不完整');
 for(const group of [m.sites,m.roads,m.nodes,m.templates])if(!group||typeof group!=='object'||Array.isArray(group)||Object.keys(group).length>10000)throw new Error('剧本地图集合无效');
 for(const group of [m.sites,m.roads,m.nodes,m.templates])for(const id of Object.keys(group))if(!id||id.length>200||id.includes('\0')||['__proto__','constructor','prototype'].includes(id))throw new Error('地图 ID 无效');
 for(const [id,s] of Object.entries(m.sites))if(!s||!/^[a-z][a-z0-9_-]{0,99}$/.test(id)||s.id!==id||Object.keys(s).sort().join(',')!=='id,lat,lon,name,source'||!Number.isFinite(s.lon)||s.lon<73||s.lon>125||!Number.isFinite(s.lat)||s.lat<18||s.lat>44||typeof s.name!=='string'||!s.name.trim()||s.name.length>200||typeof s.source!=='string'||!s.source.trim()||s.source.length>2000)throw new Error('剧本地点无效：'+id);
 for(const [id,r] of Object.entries(m.roads))if(!r||typeof r.from!=='string'||typeof r.to!=='string'||r.id!==id||Object.keys(r).sort().join(',')!=='days,factor,from,id,legacyOnly,source,to'||!Number.isFinite(r.factor)||r.factor<.1||r.factor>10||r.days!==null&&(!Number.isSafeInteger(r.days)||r.days<1||r.days>10000)||typeof r.legacyOnly!=='boolean'||typeof r.source!=='string'||!r.source.trim()||r.source.length>2000)throw new Error('剧本道路无效：'+id);
 if(Object.keys(m.geography??{}).join(',')!=='map'||m.geography.map.id!=='map')throw new Error('剧本边界无效');assertBoundaries(m.geography.map.boundaries);
 for(const [id,n] of Object.entries(m.nodes))if(!n||n.id!==id||Object.keys(n).some(k=>!['id','name','level','parent','site','basis','from','until','source'].includes(k))||!['realm','province','prefecture','county','city'].includes(n.level)||typeof n.name!=='string'||!n.name.trim()||n.name.length>200||typeof n.source!=='string'||!n.source.trim()||n.source.length>2000||n.parent!==null&&typeof n.parent!=='string'||n.site!==undefined&&typeof n.site!=='string'||n.basis!=='scenario'||!Number.isSafeInteger(n.from)||!Number.isSafeInteger(n.until)||n.from>=n.until)throw new Error('剧本行政节点须有来源和有效期：'+id);
}
export function mapTemplate(d:StrategicDraft,base:ContentPackage):ScenarioMap {return {sites:structuredClone(d.sites),roads:structuredClone(d.roads),geography:structuredClone(d.geography),templates:{},nodes:Object.fromEntries(Object.entries(base.tables.territorialHierarchy.territoryNodes as Record<string,TerritoryNode>).map(([id,n])=>[id,{...n,basis:'scenario',source:'从基础包复制；作者须按本剧本年代核对'}]))};}
export function mapBase(m:ScenarioMap,base:ContentPackage):ContentPackage {
 const b=structuredClone(base),t=b.tables as Record<string,any>,original=base.tables.scenario.siteById as Record<string,Site>;
 const sites=Object.values(m.sites).map(s=>{const seed=Object.hasOwn(original,s.id)?original[s.id]:typeof m.templates[s.id]==='string'&&Object.hasOwn(original,m.templates[s.id])?original[m.templates[s.id]]:undefined;if(!seed)throw new Error('新增地点须指定现有地形模板：'+s.id);return {...seed,id:s.id,name:s.name,lon:s.lon,lat:s.lat,...(!original[s.id]?{capital:false,description:s.source}:{})};});
 t.scenario.sites=sites;t.scenario.siteById=Object.fromEntries(sites.map(s=>[s.id,s]));t.territorialHierarchy.territoryNodes=structuredClone(m.nodes);t.territorialHierarchy.territoryRoots=Object.values(m.nodes).filter(n=>!n.parent);
 for(const id of Object.keys(t.administration.administration))if(!m.sites[id])delete t.administration.administration[id];
 for(const id of Object.keys(m.sites)){const chain:TerritoryNode[]=[];let n=m.nodes['city:'+id];const seen=new Set();while(n&&!seen.has(n.id)){seen.add(n.id);chain.push(n);n=m.nodes[n.parent!];}const county=chain.find(n=>n.level==='county'),prefecture=chain.find(n=>n.level==='prefecture'),province=chain.find(n=>n.level==='province');if(county&&prefecture&&province)t.administration.administration[id]={province:province.name,prefecture:prefecture.name,county:county.name,group:prefecture.id.slice('prefecture:'.length),sources:[],status:'scenario',note:m.nodes['city:'+id].source};}
 for(const edge of Object.keys(t.roadCorridors.roadCorridors))if(edge.split(':').some(id=>!m.sites[id]))delete t.roadCorridors.roadCorridors[edge];return b;
}
export function scenarioMapIssues(m:ScenarioMap,base:ContentPackage,year:number){
 assertScenarioMap(m);const issues=geographicIssues(m,mapBase(m,base));
 const add=(id:string,message:string)=>issues.push({code:'GEOGRAPHY',severity:'error',entityId:id,fieldPath:'scenarios.map',message});
 if(!m.sites.jiankang)add('jiankang','当前基础旅行入口仍需建康锚点');
 const original=base.tables.scenario.siteById as Record<string,Site>;
 for(const [id,template] of Object.entries(m.templates))if(original[id]||!m.sites[id]||!original[template])add(id,'模板只能为新增地点引用已有地点');
 if(Object.keys(original).sort().join()!==Object.keys(m.sites).sort().join()&&m.geography.map.boundaries.mode!=='generated')add('map','增删地点须提供覆盖当前地点的已审阅边界');
 const rank={realm:0,province:1,prefecture:2,county:3,city:4};
 for(const n of Object.values(m.nodes)){
  if(!(n.from<=year&&year<n.until))add(n.id,'行政节点有效期不包含剧本年');
  if(n.site&&(!m.sites[n.site]||n.level!=='city'||n.id!=='city:'+n.site))add(n.id,'县域节点地点引用无效');
  if(n.level==='realm'?n.parent!==null:!n.parent||!Object.hasOwn(m.nodes,n.parent)||rank[m.nodes[n.parent].level]>=rank[n.level])add(n.id,'行政父级缺失或层级倒置');
 }
 for(const id of Object.keys(m.sites))if(m.nodes['city:'+id]?.site!==id)add(id,'地点缺少县域行政节点');
 return issues;
}
export function compileScenarioMap(m:ScenarioMap,base:ContentPackage){const b=mapBase(m,base);Object.assign(b.tables.scenario,geographicTables(m,b));return b;}

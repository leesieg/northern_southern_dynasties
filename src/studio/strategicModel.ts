import {createMapRegistry} from '../core/mapRegistry';
import {validateStrategyReferences,type StrategyDefinition} from '../core/strategyDefinition';
import type {ContentPackage} from '../core/contentPackage';
import type {Site,Road} from '../core/types';
export interface MapSite {id:string;name:string;lon:number;lat:number;source:string}
export interface MapRoad {id:string;from:string;to:string;factor:number;days:number|null;legacyOnly:boolean;source:string}
export interface BoundaryDefinition {mode:'retained'|'generated';source:string;anchors:Record<string,[number,number]>|null;value:GeoJSON.FeatureCollection<GeoJSON.MultiPolygon>|null}
export interface Geography {id:string;boundaries:BoundaryDefinition}
export interface StrategicDraft {sites:Record<string,MapSite>;roads:Record<string,MapRoad>;geography:Record<string,Geography>}
export function projectGeography(base:ContentPackage):StrategicDraft {
 const t=base.tables as Record<string,any>;
 return {sites:Object.fromEntries(t.scenario.sites.map((s:Site)=>[s.id,{id:s.id,name:s.name,lon:s.lon,lat:s.lat,source:'基础包地点锚点；精度与出处沿用基础资料'}])),roads:Object.fromEntries(t.scenario.roads.map((r:Road,i:number)=>['road-'+i,{id:'road-'+i,from:r.from,to:r.to,factor:r.factor,days:r.days??null,legacyOnly:r.legacyOnly??false,source:'基础道路；行程为游戏参数'}])),geography:{map:{id:'map',boundaries:{mode:'retained',source:'保留基础示意县域；不是完整历史疆界',anchors:null,value:null}}}};
}
export function assertBoundaries(v:unknown){
 const b=v as BoundaryDefinition;if(!b||typeof b!=='object'||Object.keys(b).sort().join(',')!=='anchors,mode,source,value'||!['retained','generated'].includes(b.mode)||typeof b.source!=='string'||!b.source.trim()||b.source.length>2000)throw new Error('边界记录无效');
 if(b.mode==='retained'){if(b.value!==null||b.anchors!==null)throw new Error('保留边界不接受替换数据');return;}
 if(!b.anchors||Array.isArray(b.anchors)||!b.value||b.value.type!=='FeatureCollection'||!Array.isArray(b.value.features)||b.value.features.length>2000)throw new Error('生成边界须含锚点和多边形');
 for(const a of Object.values(b.anchors))if(!Array.isArray(a)||a.length!==2||!a.every(Number.isFinite))throw new Error('边界锚点无效');
 const seen=new Set();for(const f of b.value.features){const id=f.properties?.id;if(typeof id!=='string'||seen.has(id)||f.type!=='Feature'||f.geometry?.type!=='MultiPolygon'||!f.geometry.coordinates.length)throw new Error('县域几何或 ID 无效');seen.add(id);for(const poly of f.geometry.coordinates){if(!poly.length)throw new Error('空多边形');for(const ring of poly){if(ring.length<4||JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1)))throw new Error('县域环须闭合');for(const p of ring)if(p.length!==2||!p.every(Number.isFinite)||p[0]<-180||p[0]>180||p[1]<-90||p[1]>90)throw new Error('县域坐标无效');}}}
}
export function geographicTables(d:StrategicDraft,base:ContentPackage){
 const original=base.tables.scenario as unknown as {sites:Site[]};
 const sites=original.sites.map(s=>({...s,...{name:d.sites[s.id].name,lon:d.sites[s.id].lon,lat:d.sites[s.id].lat}}));
 const roads:Road[]=Object.values(d.roads).map(r=>({from:r.from,to:r.to,factor:r.factor,...(r.days===null?{}:{days:r.days}),...(r.legacyOnly?{legacyOnly:true}:{})}));
 return {sites,roads,siteById:Object.fromEntries(sites.map(s=>[s.id,s]))};
}
export function geographicIssues(d:StrategicDraft,base:ContentPackage){
 const issues:{code:string;severity:'error';entityId:string;fieldPath:string;message:string}[]=[];
 const add=(id:string,field:string,message:string)=>issues.push({code:'GEOGRAPHY',severity:'error',entityId:id,fieldPath:field,message});
 const originals=Object.keys(base.tables.scenario.siteById as object);if(originals.some(id=>!d.sites[id])||Object.keys(d.sites).some(id=>!originals.includes(id)))add('map','sites','当前规则保留地点 ID；可编辑坐标与名称，不增删基础地点');
 const occupied=new Set<string>();for(const s of Object.values(d.sites)){const xy=[s.lon,s.lat].join(',');if(occupied.has(xy))add(s.id,'sites.lon','地点坐标重复');occupied.add(xy);if(!s.name.trim()||!s.source.trim())add(s.id,'sites.source','地点名称和来源不能为空');}
 const edges=new Set<string>();for(const r of Object.values(d.roads)){if(!d.sites[r.from]||!d.sites[r.to]||r.from===r.to)add(r.id,'roads.from','道路端点不存在或相同');const edge=[r.from,r.to].sort().join(':');if(edges.has(edge))add(r.id,'roads.to','端点重复（含保留的旧路段）；请直接编辑原路段');edges.add(edge);if(!r.source.trim())add(r.id,'roads.source','道路须注明来源或设计假设');}
 const b=d.geography.map?.boundaries;try{assertBoundaries(b);if(b?.mode==='generated'){if(JSON.stringify(Object.fromEntries(Object.values(d.sites).map(s=>[s.id,[s.lon,s.lat]])))!==JSON.stringify(b.anchors))add('map','geography.boundaries','锚点已变化，请重新预览并审阅生成边界，或明确保留基础边界');const ids=b.value!.features.map(f=>f.properties!.id);if(ids.length!==originals.length||originals.some(id=>!ids.includes(id)))add('map','geography.boundaries','县域几何覆盖不完整');}}catch(e){add('map','geography.boundaries',String(e));}
 if(!issues.length)try{const {sites,roads}=geographicTables(d,base),map=createMapRegistry(sites,roads);for(const s of sites)if(s.id!=='jiankang'&&!map.planRoute('jiankang',s.id))add(s.id,'roads','道路网络不连通，无法从建康到达此地点');}catch(e){add('map','roads',String(e));}
 return issues;
}
export function compileStrategy(t:Record<string,any>,strategy:StrategyDefinition|null){
 t.campaignSetup.campaignSetup.strategy=structuredClone(strategy);
 validateStrategyReferences(strategy,t.scenario.siteById,t.characters.characterById,t.territorialHierarchy.territoryNodes,t.scripts.gameScripts[0].year);
 if(!strategy)return;
 for(const [id,a] of Object.entries(strategy.administration))Object.assign(t.territorialHierarchy.territoryNodes[id],{parent:a.parent,from:a.from,until:a.until,basis:'scenario',source:a.source});
 for(const site of t.scenario.sites){const chain:any[]=[];let n=t.territorialHierarchy.territoryNodes['city:'+site.id];while(n){chain.push(n);n=t.territorialHierarchy.territoryNodes[n.parent];}const county=chain.find(n=>n.level==='county'),prefecture=chain.find(n=>n.level==='prefecture'),province=chain.find(n=>n.level==='province');if(county&&prefecture&&province&&chain.some(n=>strategy.administration[n.id]))t.administration.administration[site.id]={...t.administration.administration[site.id],county:county.name,prefecture:prefecture.name,province:province.name,group:prefecture.id.slice('prefecture:'.length),status:'scenario',note:'作者剧本行政配置；参见所选节点来源与有效期'};}
 t.territorialHierarchy.territoryRoots=Object.values(t.territorialHierarchy.territoryNodes).filter((n:any)=>!n.parent);
}

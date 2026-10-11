import {it,expect} from 'vitest';
import {roads,sites,siteById} from './scenario';
import {roadRevisions} from './roadNetwork';
import {newWorld,newCampaignWorld,planRoute,legDays} from '../core/world';
import {parseWorld,serializeWorld} from '../core/save';
import {armyAdvanceRoute} from '../core/militaryRoutes';
import {ensureWars} from '../core/wars';
import {strategicTargets} from '../core/realmStrategy';
import {roadCoordinates} from '../core/routeGeometry';
import {loadRoad,roadCapacity} from '../core/roadCapacity';
import {validPopulation} from '../core/population';
import {roadFeatures} from '../map/geography';
import type {Army} from '../core/realm';
const key=(a:string,b:string)=>[a,b].sort().join(':');
const active=roads.filter(r=>!r.legacyOnly);
// Frozen before this road review: booked saves must not adopt the new route's duration.
const booked:[string,string,number][]=[['ye','jinyang',11],['ye','wuan',2],['ye','jicheng',11],['ye','qingzhou',9],['qingzhou','jibei',5],['luoyang','ye',7],['luoyang','pengcheng',11],['changan','tianshui',11],['changan','puzhou',4],['changan','huayin',3],['changan','xinfeng',1],['changan','yinpan',2],['hanzhong','changan',10],['xiangyang','hanzhong',20],['chengdu','hanzhong',17],['jiangling','bajun',21],['xunyang','jiangling',10],['jiangling','changsha',7],['changsha','guangzhou',22],['wujun','kuaiji',4]];
it('preserves every modeled city and connects one undirected active network without duplicate edges',()=>{
 expect(sites).toHaveLength(113);expect(new Set(roads.map(r=>key(r.from,r.to))).size).toBe(roads.length);
 const reached=new Set(['jiankang']);for(let changed=true;changed;){changed=false;for(const r of active)if(reached.has(r.from)!==reached.has(r.to)){reached.add(r.from);reached.add(r.to);changed=true;}}
 expect(reached.size).toBe(sites.length);
 for(const r of active){expect(siteById[r.from]).toBeDefined();expect(siteById[r.to]).toBeDefined();expect(r.from).not.toBe(r.to);expect(legDays(r.from,r.to)).toBeGreaterThan(0);}
});
it('makes removed shortcuts unavailable to new plans and to map road features in either direction',()=>{
 for(const r of roadRevisions){expect(active.some(e=>key(e.from,e.to)===key(r.from,r.to))).toBe(false);for(const [from,to] of [[r.from,r.to],[r.to,r.from]])expect(planRoute(from,to)!.route.length).toBeGreaterThan(2);}
 expect(roadFeatures.features).toHaveLength(active.length);
 for(const r of active){const points=roadCoordinates(r.from,r.to);expect(points).toEqual([...roadCoordinates(r.to,r.from)].reverse());expect(points[0]).toEqual([siteById[r.from].lon,siteById[r.from].lat]);expect(points.at(-1)).toEqual([siteById[r.to].lon,siteById[r.to].lat]);}
});
it('visits intervening controls on the river, Qinling, Guanzhong and Taihang corridors',()=>{
 for(const [from,to,via] of [['jiangling','bajun',['zhijiang','yiling','yufu']],['hanzhong','changan',['huxian']],['changan','tianshui',['yongxian']],['changan','puzhou',['fengyi']],['ye','jinyang',['linshui','wuan']],['changsha','guangzhou',['guiyang','shixing']],['wujun','kuaiji',['qiantang']]] as [string,string,string[]][]){
  const path=planRoute(from,to)!.route;let index=0;for(const id of via){index=path.indexOf(id,index);expect(index,from+' → '+to+' through '+id).toBeGreaterThan(-1);index++;}
 }
});
it('retains all twenty booked shortcut durations and money, food and journey state across loading',()=>{
 for(const [from,to,days] of booked){const w=newWorld();w.people[0].location=from;w.people[0].journey={route:[from,to],durations:[days],leg:0,elapsed:0,started:0};expect(legDays(from,to)).toBe(days);const loaded=parseWorld(serializeWorld(w));expect(loaded.people[0]).toEqual(w.people[0]);}
});
it('replaces the false Liang–Changan border with the Qinling approach at Hu county',()=>{
 const w=newCampaignWorld('guest-west',undefined,'sandbox'),west=strategicTargets(w,'liang').filter(t=>t.enemy==='west').map(t=>t.id);
 expect(west).toContain('huxian');expect(west).not.toContain('changan');
});
it('preserves booked grain shipments and occupied road capacity on a retired edge',()=>{
 const w=newCampaignWorld('guest-west',undefined,'sandbox'),s=w.realm!;
 const shipment={id:1,realm:'liang' as const,from:'jiangling',to:'bajun',kind:'grain' as const,sent:120,arrived:0,lost:0,route:['jiangling','bajun'],durations:[21],leg:0,elapsed:0,created:0,status:'traveling' as const,lossRate:5};
 s.population={version:1,nextId:2,lastDay:0,transfers:[shipment]};
 const cap=roadCapacity('jiangling','bajun');expect(loadRoad(w,'jiangling','bajun',cap-1)).toBe(cap-1);
 expect(validPopulation(w)).toBe(true);const loaded=parseWorld(serializeWorld(w));expect(loaded.realm!.population).toEqual(s.population);expect(loaded.realm!.traffic).toEqual(s.traffic);expect(loaded.realm!.treasuries).toEqual(s.treasuries);
 expect(loadRoad(loaded,'bajun','jiangling',10)).toBe(1);expect(planRoute('jiangling','bajun')!.route).toContain('yiling');
});
it('stops at a fortified gorge gateway and never treats an unavailable third country as a shortcut',()=>{
 const w=newCampaignWorld('guest-west',undefined,'sandbox'),s=w.realm!;
 for(const city of Object.values(s.cities))city.owner=city.controller='east';
 s.cities.jiangling.owner=s.cities.jiangling.controller='liang';
 for(const id of ['zhijiang','yiling','yufu','bajun']){s.cities[id].owner=s.cities[id].controller='west';s.cities[id].fortification={level:1,due:null};}
 s.war={attacker:'liang',defender:'west',target:'bajun',started:0,score:0};delete s.wars;ensureWars(w);
 const a:Army={realm:'liang',location:'jiangling',troops:600,morale:80,supply:999,journey:null,siege:0};
 expect(armyAdvanceRoute(w,a,'bajun')?.route).toEqual(['jiangling','zhijiang']);
 s.cities.zhijiang.controller='east';expect(armyAdvanceRoute(w,a,'bajun')).toBeNull();
});

import {describe,it,expect} from 'vitest';
import {newCampaignWorld,advance} from './world';
import {influenceIncome,advancePersonalInfluence,personInfluence} from './personalInfluence';
import {actLocal,localInfluenceCost,localReason,setLocalHolder,localHolder,localSites,advanceLocal,countyTerritory} from './localAdministration';
import {actCourt,courtOf,centralAppointmentCost,advanceCourts} from './court';
import {governmentOf} from './government';
import {territoryNodes} from '../data/territorialHierarchy';
import {officeReserves,countyOfficials} from '../data/localOfficials';
import {realms} from './realm';
import {parseWorld,serializeWorld} from './save';
import {die} from './life';
const start=(id='xiao-gang')=>newCampaignWorld(id,undefined,'sandbox');
type World=ReturnType<typeof start>;
function stable(w:World){w.relationships!.oaths={};for(const c of Object.values(w.realm!.cities)){c.order=70;c.prosperity=60;}}
const reserve=(realm='liang')=>officeReserves.find(p=>p.realm===realm&&p.initialMerit===50)!;
const post=(w:World,level:string,realm='liang')=>Object.values(territoryNodes).find(n=>n.level===level&&localSites(w,n.id,realm as typeof realms[number]).length)!;
function petition(w:World){const c=courtOf(w,'liang')!;for(const id of Object.keys(c.members))c.members[id]='dynastic';c.petition={group:'dynastic',sponsor:'xiao-gang',due:1};return c;}

describe('影响力收支与常规履职',()=>{
 it('职位取当前最高职权，兼任不重复叠加，治理失序减少收入',()=>{
  const w=start();stable(w);const p=reserve(),province=post(w,'province'),prefecture=post(w,'prefecture');
  expect(influenceIncome(w,p.id).total).toBe(5);
  setLocalHolder(w,countyTerritory(p.home),'liang',p.id);expect(influenceIncome(w,p.id).total).toBe(9);
  setLocalHolder(w,prefecture.id,'liang',p.id);expect(influenceIncome(w,p.id).total).toBe(11);
  setLocalHolder(w,province.id,'liang',p.id);expect(influenceIncome(w,p.id).total).toBe(13);
  expect(influenceIncome(w,p.id).parts.filter(p=>p.label.includes('最高职权'))).toHaveLength(1);
  for(const c of Object.values(w.realm!.cities)){c.order=20;c.prosperity=20;}expect(influenceIncome(w,p.id).total).toBe(11);
 });
 it('实际执政、名义君主、中枢官员与失守职位分别读取真实权力',()=>{
  const w=start();stable(w);expect(influenceIncome(w,'xiao-yan').total).toBe(17);expect(influenceIncome(w,'yuan-shanjian').total).toBe(11);
  courtOf(w,'liang')!.ministries.finance='xiao-gang';expect(influenceIncome(w,'xiao-gang').total).toBe(13);
  w.realm!.cities.jiankang.controller='west';expect(influenceIncome(w,'xiao-yan').total).toBe(5);expect(influenceIncome(w,'xiao-gang').total).toBe(5);
 });
 it('在世忠诚效忠者对玩家和 NPC 共用收入，封顶且不计死者',()=>{
  const w=start(),id=reserve().id,followers=countyOfficials.filter(p=>p.realm==='liang').slice(0,5);stable(w);
  for(const p of followers)w.relationships!.oaths[p.id]={lord:id,since:0,loyalty:80};expect(influenceIncome(w,id).total).toBe(9);
  w.relationships!.oaths[followers[0].id].loyalty=69;die(w,followers[1].id,'age');expect(influenceIncome(w,id).total).toBe(8);
  const player=start();stable(player);for(const p of followers.slice(2))player.relationships!.oaths[p.id]={lord:'xiao-gang',since:0,loyalty:80};expect(influenceIncome(player,'xiao-gang').total).toBe(8);
 });
 it('月结一次、上限 999，死亡及已结束的局停止收入，玩家镜像不重复计入',()=>{
  const w=start('xiao-yan');stable(w);w.realm!.influence=990;w.day=30;advancePersonalInfluence(w);
  expect(personInfluence(w,'xiao-yan')).toBe(999);expect(w.realm!.personalInfluence!['xiao-yan']).toBe(999);const once=structuredClone(w);advancePersonalInfluence(w);expect(w).toEqual(once);
  const id=reserve().id;die(w,id,'age');const dead=personInfluence(w,id);w.day=60;advancePersonalInfluence(w);expect(personInfluence(w,id)).toBe(dead);
  w.campaign!.status='lost';w.day=90;const ended=structuredClone(w);advancePersonalInfluence(w);expect(w).toEqual(ended);
 });
 it('世界月结只结算一份收入，存读后推进一致',()=>{
  const w=start('xiao-yan');stable(w);w.day=29;const initial=personInfluence(w,'xiao-yan'),saved=parseWorld(serializeWorld(w));advance(w,1);advance(saved,1);
  expect(w).toEqual(saved);expect(personInfluence(w,'xiao-yan')).toBe(initial+influenceIncome(w,'xiao-yan').total);expect(w.realm!.lastInfluenceIncome).toBe(30);
 });
 it('0.4 旧档保留所有余额，缺失结算日期不补发当月，存档拒绝非法日期',()=>{
  const w=start();w.day=30;w.contentVersion='546-map-0.4';delete w.realm!.lastInfluenceIncome;w.realm!.influence=87;const balances=structuredClone(w.realm!.personalInfluence),loaded=parseWorld(serializeWorld(w));
  expect(loaded.realm!.personalInfluence).toEqual(balances);expect(loaded.realm!.influence).toBe(87);expect(loaded.realm!.lastInfluenceIncome).toBe(30);
  const once=structuredClone(loaded);advancePersonalInfluence(loaded);expect(loaded).toEqual(once);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
  loaded.realm!.lastInfluenceIncome=29;expect(()=>serializeWorld(loaded)).toThrow('存档');
 });
 it('合格闲人补空位零费用，在途任命保留且不能重复派任',()=>{
  const w=start('xiao-yan'),p=reserve(),t=post(w,'prefecture').id;w.realm!.influence=0;const command={type:'local',action:'appoint',territory:t,candidate:p.id} as const;
  expect(localInfluenceCost(w,command)).toBe(0);actLocal(w,command);expect(w.realm!.influence).toBe(0);expect(localHolder(w,t,'liang')).toBeNull();
  const before=structuredClone(w);expect(()=>actLocal(w,command)).toThrow('在途');expect(w).toEqual(before);
  const another=post(w,'province').id;expect(localReason(w,{...command,territory:another})).toContain('在途');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('撤换、调任和破格仍收费；余额不足原样拒绝，撤免不能成为免费撤换捷径',()=>{
  const w=start('xiao-yan'),p=reserve(),t=countyTerritory(p.home),command={type:'local',action:'appoint',territory:t,candidate:p.id} as const;
  expect(localInfluenceCost(w,command)).toBe(20);w.realm!.influence=19;const before=structuredClone(w);expect(()=>actLocal(w,command)).toThrow('影响力');expect(w).toEqual(before);
  w.realm!.influence=20;actLocal(w,{type:'local',action:'remove',territory:t});expect(w.realm!.influence).toBe(0);expect(localInfluenceCost(w,command)).toBe(0);
  governmentOf(w,'liang')!.merit[p.id]=0;expect(localInfluenceCost(w,command)).toBe(20);expect(()=>actLocal(w,command)).toThrow('影响力');
  governmentOf(w,'liang')!.merit[p.id]=50;setLocalHolder(w,post(w,'province').id,'liang',p.id);expect(localInfluenceCost(w,command)).toBe(20);
 });
 it('申请人费用与审批者费用分开，NPC 余额不足等恢复而非提前驳回',()=>{
  const w=start(),p=reserve('east'),t=post(w,'province','east').id;setLocalHolder(w,countyTerritory(p.home),'east',p.id);governmentOf(w,'east')!.merit[p.id]=100;w.realm!.personalInfluence![p.id]=10;
  actLocal(w,{type:'local',action:'apply',territory:t,candidate:p.id},p.id);expect(personInfluence(w,p.id)).toBe(0);const q=w.realm!.local!.requests.at(-1)!;
  w.day=8;advanceLocal(w);expect(q.status).toBe('pending');w.realm!.personalInfluence![q.approver]=20;w.day=9;advanceLocal(w);
  expect(q.status).toBe('approved');expect(personInfluence(w,q.approver)).toBe(0);expect(personInfluence(w,p.id)).toBe(0);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('中央合格补缺零费用，破格和撤换各 15；失败不改余额或任职',()=>{
  const w=start(),p=officeReserves.find(p=>p.realm==='liang'&&p.initialMerit===40)!;expect(centralAppointmentCost(w,'liang','finance',p.id)).toBe(0);
  actCourt(w,{type:'court',action:'appoint',ministry:'finance',candidate:p.id},'xiao-yan');expect(personInfluence(w,'xiao-yan')).toBe(0);
  w.day=30;expect(centralAppointmentCost(w,'liang','finance','xiao-gang')).toBe(15);const before=structuredClone(w);expect(()=>actCourt(w,{type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'},'xiao-yan')).toThrow('影响力');expect(w).toEqual(before);
  w.realm!.personalInfluence!['xiao-yan']=15;actCourt(w,{type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'},'xiao-yan');expect(personInfluence(w,'xiao-yan')).toBe(0);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('NPC 批奏议扣实际执政者，申请人零余额不阻止批准，重复推进不重扣',()=>{
  const w=start(),c=petition(w),coins=w.realm!.treasuries.liang.coins;w.realm!.influence=0;w.realm!.personalInfluence!['xiao-yan']=20;w.day=1;advanceCourts(w);
  expect(c.petition).toBeNull();expect(w.realm!.influence).toBe(0);expect(personInfluence(w,'xiao-yan')).toBe(0);expect(w.realm!.treasuries.liang.coins).toBe(coins-80);
  const once=structuredClone(w);advanceCourts(w);expect(w).toEqual(once);
 });
 it('NPC 奏议暂缺余额可等待，超过六十日仍缺款则结案，不扣申请人',()=>{
  const w=start(),c=petition(w),coins=w.realm!.treasuries.liang.coins;w.realm!.influence=99;w.day=1;advanceCourts(w);expect(c.petition).not.toBeNull();expect(w.realm!.treasuries.liang.coins).toBe(coins);
  w.realm!.personalInfluence!['xiao-yan']=20;w.day=2;advanceCourts(w);expect(c.petition).toBeNull();expect(w.realm!.influence).toBe(99);
  petition(w);w.day=61;advanceCourts(w);expect(c.petition).toBeNull();expect(w.realm!.influence).toBe(99);expect(w.realm!.treasuries.liang.coins).toBe(coins-80);
 });
});

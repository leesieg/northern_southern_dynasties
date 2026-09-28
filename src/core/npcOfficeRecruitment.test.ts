import {describe,it,expect} from 'vitest';
import {newCampaignWorld,advance} from './world';
import {advanceNPCOfficeRecruitment} from './npcOfficeRecruitment';
import {officeReserves,countyOfficials} from '../data/localOfficials';
import {relationshipPeople} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import {governmentOf,governingAuthority} from './government';
import {realms,type RealmId} from './realm';
import {ministryIds} from '../data/court';
import {courtOf,courtReason,actCourt} from './court';
import {makeAppointmentRound,advanceAppointments} from './appointmentCycle';
import {actLocal,advanceLocal,localHolder,localKey,localSites,setLocalHolder,completeLocalAppointment} from './localAdministration';
import {personInfluence} from './personalInfluence';
import {parseWorld,serializeWorld} from './save';
import {die} from './life';
import {advanceMobility,npcRoute} from './mobility';
import {presentAt} from './residence';
import {ensureWars} from './wars';
const start=(id='xiao-yan')=>newCampaignWorld(id,undefined,'sandbox');
type World=ReturnType<typeof start>;
const fund=(w:World,r:RealmId,amount=200)=>{w.realm!.personalInfluence![governingAuthority(w,r)!]=amount;};
const occupied=(w:World,r:RealmId)=>Object.values(courtOf(w,r)!.ministries).filter(Boolean);
function arrive(w:World,o:NonNullable<World['realm']>['offices'][number]){w.day=Math.max(w.day,o.due);w.mobility!.residences[o.candidate]={site:o.site,journey:null};expect(completeLocalAppointment(w,o)).toBe(true);w.realm!.offices=w.realm!.offices.filter(v=>v!==o);}

describe('持续补缺与后备士人',()=>{
 it('后备人物未预授官；满足门槛时人数足够，不强制制造空位',()=>{
  const w=start();expect(new Set(officeReserves.map(p=>p.id)).size).toBe(officeReserves.length);
  for(const p of officeReserves){expect(w.life!.people[p.id]).toBeDefined();expect(w.relationships!.reserves[p.id]).toBe(120);expect(governmentOf(w,p.realm)!.merit[p.id]).toBe(p.initialMerit);expect(Object.values(w.realm!.cities).some(c=>c.governor===p.id)).toBe(false);}
  for(const r of realms){for(const p of relationshipPeople)if(p.realm===r)governmentOf(w,r)!.merit[p.id]=100;const q=makeAppointmentRound(w,r);expect(q.rows.every(row=>row.candidate)).toBe(true);expect(new Set(q.rows.map(row=>row.candidate)).size).toBe(q.rows.length);}
 });
 it('月度中央、地方补缺支付实际任命者的影响力，保持原县官，重复推进幂等',()=>{
  const w=start(),player=w.realm!.influence,counties=structuredClone(w.realm!.cities);fund(w,'east');w.day=30;advanceNPCOfficeRecruitment(w);
  const orders=w.realm!.offices.filter(o=>o.realm==='east');expect(occupied(w,'east')).toHaveLength(ministryIds.length);expect(orders.length).toBeGreaterThan(1);
  expect(personInfluence(w,'gao-huan')).toBe(200-occupied(w,'east').length*15-orders.length*20);expect(w.realm!.influence).toBe(player);
  for(const p of countyOfficials)expect(w.realm!.cities[p.home].governor).toBe(counties[p.home].governor);
  const once=structuredClone(w);advanceNPCOfficeRecruitment(w);expect(w).toEqual(once);expect(parseWorld(serializeWorld(w))).toEqual(w);
  const order=orders[0];arrive(w,order);expect(localHolder(w,order.territory!,'east')).toBe(order.candidate);
 });
 it('任命者余额不足、失守与忙碌候选人不会被绕过',()=>{
  const w=start();fund(w,'east',14);w.day=30;advanceNPCOfficeRecruitment(w);expect(occupied(w,'east')).toHaveLength(0);expect(w.realm!.offices.filter(o=>o.realm==='east')).toHaveLength(0);expect(personInfluence(w,'gao-huan')).toBe(14);
  const lost=start();fund(lost,'east');lost.realm!.cities.ye.controller='west';lost.day=30;advanceNPCOfficeRecruitment(lost);expect(occupied(lost,'east')).toHaveLength(0);expect(lost.realm!.offices.every(o=>o.site!=='ye')).toBe(true);
  const busy=start(),p=officeReserves.find(p=>p.realm==='east')!;busy.retinue!.members[p.id]={host:'gao-huan',joined:0,post:null,site:null,arrears:0};fund(busy,'east');busy.day=30;advanceNPCOfficeRecruitment(busy);expect([...occupied(busy,'east'),...busy.realm!.offices.map(o=>o.candidate)]).not.toContain(p.id);
 });
 it('玩家执政时中央不自动任命，地方请任由玩家裁决',()=>{
  const w=start('gao-huan');for(const p of officeReserves)w.realm!.personalInfluence![p.id]=20;w.day=30;advanceNPCOfficeRecruitment(w);
  expect(occupied(w,'east')).toHaveLength(0);expect(w.realm!.offices.filter(o=>o.realm==='east')).toHaveLength(0);
  const requests=w.realm!.local!.requests.filter(q=>q.realm==='east');expect(requests).toHaveLength(3);expect(requests.every(q=>q.approver==='gao-huan'&&q.status==='pending')).toBe(true);
  w.day=35;advanceLocal(w);expect(requests.every(q=>q.status==='pending')).toBe(true);
  actLocal(w,{type:'local',action:'approve',id:requests[0].id});expect(requests[0].status).toBe('approved');expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('玩家地方上级掌握授权时，NPC 留下请任，不越过玩家批准',()=>{
  const w=start('gao-yang'),province=Object.values(territoryNodes).find(n=>n.level==='province'&&localSites(w,n.id,'east').length)!;
  setLocalHolder(w,province.id,'east','gao-yang');w.realm!.local!.seats[localKey('east',province.id)].delegated=true;
  for(const p of officeReserves)w.realm!.personalInfluence![p.id]=20;fund(w,'east');w.day=30;advanceNPCOfficeRecruitment(w);
  const requests=w.realm!.local!.requests.filter(q=>q.approver==='gao-yang');expect(requests.length).toBeGreaterThan(0);expect(requests.every(q=>q.status==='pending')).toBe(true);
  expect(w.realm!.offices.every(o=>!requests.some(q=>q.territory===o.territory))).toBe(true);
 });
 it('合法授权的 NPC 州郡官使用自己的余额补下属空位',()=>{
  const w=start(),province=Object.values(territoryNodes).find(n=>n.level==='province'&&localSites(w,n.id,'east').length)!,holder=officeReserves.find(p=>p.realm==='east'&&p.initialMerit===50)!;
  setLocalHolder(w,province.id,'east',holder.id);w.realm!.personalInfluence![holder.id]=40;fund(w,'east',0);w.day=30;advanceNPCOfficeRecruitment(w);
  expect(w.realm!.local!.seats[localKey('east',province.id)].delegated).toBe(true);const orders=w.realm!.offices.filter(o=>o.issuer===holder.id);expect(orders.length).toBeGreaterThan(0);expect(personInfluence(w,holder.id)).toBe(40-orders.length*20);
 });
 it('待审铨选期间不插入自动任命，已结束的局不补缺',()=>{
  const w=start();advanceAppointments(w);w.day=1096;advanceAppointments(w);fund(w,'east');const q=structuredClone(w.realm!.local!.cycle!.rounds.east);w.day=1110;advanceNPCOfficeRecruitment(w);
  expect(w.realm!.local!.cycle!.rounds.east).toEqual(q);expect(occupied(w,'east')).toHaveLength(0);expect(w.realm!.offices).toHaveLength(0);
  const ended=start();fund(ended,'east');ended.campaign!.status='lost';ended.day=30;const before=structuredClone(ended);advanceNPCOfficeRecruitment(ended);expect(ended).toEqual(before);
 });
 it('名单人选死亡后重编，等待七日复核后颁任命，不丢整轮',()=>{
  const w=start();advanceAppointments(w);w.day=1096;advanceAppointments(w);const old=w.realm!.local!.cycle!.rounds.east!,candidate=old.rows.find(row=>row.candidate&&row.candidate!==row.incumbent)!.candidate!;
  die(w,candidate,'age');w.day+=7;advanceAppointments(w);const next=w.realm!.local!.cycle!.rounds.east!;expect(next).not.toBe(old);expect(next.status).toBe('pending');expect(next.created).toBe(w.day);expect(next.rows.every(row=>row.candidate!==candidate)).toBe(true);
  expect(parseWorld(serializeWorld(w))).toEqual(w);w.day+=7;advanceAppointments(w);expect(next.status).toBe('approved');expect(w.realm!.offices.filter(o=>o.realm==='east').length).toBeGreaterThan(0);
 });
 it('内战控制区保持原任，名单仍能完成；失去控制权的审批失败不留下半份写入',()=>{
  const w=start();ensureWars(w);w.realm!.wars!.push({id:1,attacker:'east',defender:'east',target:'ye',started:0,score:0,civil:{claimant:'gao-yang',loyalist:'gao-huan',supporters:['gao-yang'],base:'ye',cities:['ye'],armies:[],name:'齐'}});w.realm!.nextWarId=2;w.realm!.war=w.realm!.wars![0];
  const q=makeAppointmentRound(w,'east');expect(q.rows.filter(row=>localSites(w,row.territory,'east').includes('ye')).filter(row=>row.territory==='county:ye').every(row=>row.candidate===row.incumbent)).toBe(true);
  w.realm!.local!.cycle={lastYear:q.year,rounds:{east:q}};w.day=7;advanceAppointments(w);expect(q.status).toBe('approved');expect(w.realm!.offices.every(o=>o.site!=='ye')).toBe(true);
  const candidate='gao-yang';expect(w.realm!.offices.some(o=>o.candidate===candidate)).toBe(false);w.mobility!.residences[candidate]={site:'ye',journey:null};w.realm!.personalInfluence![candidate]=20;
  actLocal(w,{type:'local',action:'apply',territory:'county:ye',candidate},candidate);const request=w.realm!.local!.requests.at(-1)!,before=structuredClone(w);
  expect(()=>actLocal(w,{type:'local',action:'approve',id:request.id},'gao-huan')).toThrow('内战');expect(w).toEqual(before);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('县官死亡后优先补县；原授官者死亡导致文书失效后，继任者重新授任',()=>{
  const w=start(),site='luoyang';die(w,w.realm!.cities[site].governor!,'age');fund(w,'east',95);w.day=30;advanceNPCOfficeRecruitment(w);const order=w.realm!.offices.find(o=>o.site===site)!;expect(order).toBeDefined();expect(order.territory).toBe('county:'+site);
  die(w,order.issuer!,'age');w.day=order.due;expect(completeLocalAppointment(w,order)).toBe(true);w.realm!.offices=w.realm!.offices.filter(o=>o!==order);expect(w.realm!.cities[site].governor).toBeNull();
  fund(w,'east',95);w.day=Math.ceil((w.day+1)/30)*30;advanceNPCOfficeRecruitment(w);const replacement=w.realm!.offices.find(o=>o.territory===order.territory)!;expect(replacement).toBeDefined();expect(replacement.issuer).toBe(governingAuthority(w,'east'));arrive(w,replacement);expect(w.realm!.cities[site].governor).toBe(replacement.candidate);
 });
 it('中央候选人沿真实道路到都城后任职，期间不发俸禄或扣授任费用',()=>{
  const w=start(),g=governmentOf(w,'east')!,candidate=officeReserves.find(p=>p.realm==='east'&&p.home!=='ye'&&p.initialMerit>=40)!;
  for(const id of Object.keys(g.merit))g.merit[id]=0;g.merit[candidate.id]=50;fund(w,'east',15);w.day=30;advanceNPCOfficeRecruitment(w);
  expect(occupied(w,'east')).toHaveLength(0);expect(personInfluence(w,'gao-huan')).toBe(15);expect(w.mobility!.residences[candidate.id].journey).not.toBeNull();const route=npcRoute(w,candidate.id,'ye')!;
  for(let i=0;i<route.days;i++){w.day++;advanceMobility(w);}expect(presentAt(w,candidate.id,'ye')).toBe(true);w.day=Math.ceil(w.day/30)*30;advanceNPCOfficeRecruitment(w);expect(occupied(w,'east')).toContain(candidate.id);expect(personInfluence(w,'gao-huan')).toBe(0);
 });
 it('外国中央任命失败不扣玩家或 NPC 余额，原有玩家入口复用相同规则',()=>{
  const w=start(),candidate=officeReserves.find(p=>p.realm==='east'&&p.home==='ye'&&p.initialMerit===40)!;fund(w,'east',15);const player=w.realm!.influence;
  const invalid={type:'court',action:'appoint',ministry:'finance',candidate:'xiao-gang'} as const;expect(courtReason(w,invalid,'gao-huan')).toContain('本国');expect(()=>actCourt(w,invalid,'gao-huan')).toThrow();expect(personInfluence(w,'gao-huan')).toBe(15);
  actCourt(w,{type:'court',action:'appoint',ministry:'finance',candidate:candidate.id},'gao-huan');expect(personInfluence(w,'gao-huan')).toBe(0);expect(w.realm!.influence).toBe(player);expect(courtOf(w,'east')!.ministries.finance).toBe(candidate.id);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('0.3 旧档只增补新人物账户，保留任官、钱粮、死亡与进行中文书，迁移幂等',()=>{
  const w=start();fund(w,'east');w.day=30;advanceNPCOfficeRecruitment(w);const deceased=officeReserves.find(p=>p.realm==='west')!;die(w,deceased.id,'age');
  const saved=structuredClone({cities:w.realm!.cities,treasuries:w.realm!.treasuries,offices:w.realm!.offices,coins:w.people[0].coins});w.contentVersion='546-map-0.3';
  for(const p of officeReserves.filter(p=>p.id!==deceased.id)){delete w.life!.people[p.id];delete w.relationships!.reserves[p.id];delete w.relationships!.maritalBasis[p.id];delete w.mobility!.residences[p.id];delete w.families!.prestige[p.id];delete w.realm!.personalInfluence![p.id];delete governmentOf(w,p.realm)!.merit[p.id];delete courtOf(w,p.realm)!.members[p.id];}
  const loaded=parseWorld(serializeWorld(w));expect({cities:loaded.realm!.cities,treasuries:loaded.realm!.treasuries,offices:loaded.realm!.offices,coins:loaded.people[0].coins}).toEqual(saved);expect(loaded.life!.people[deceased.id].death).toEqual(w.life!.people[deceased.id].death);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
  const corrupt=structuredClone(loaded);corrupt.realm!.local!.lastNPCRecruitment=29;expect(()=>serializeWorld(corrupt)).toThrow('存档');
 });
 it('世界推进接入补缺，存读后下一次局部推进结果一致',()=>{
  const w=start();fund(w,'east');w.day=29;const loaded=parseWorld(serializeWorld(w));advance(w,1);advance(loaded,1);expect(w).toEqual(loaded);expect(occupied(w,'east').length).toBeGreaterThan(0);
 });
});

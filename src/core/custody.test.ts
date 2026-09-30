import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance,planRoute} from './world';
import {detainPerson,actCustody,custodyReason,advanceCustody,resolveCommanderFate,captureCityPeople,custodyAuthority} from './custody';
import {publicBalance} from './treasury';
import {armyCommander,commandArmy,advanceMobility} from './mobility';
import {die} from './life';
import {detained} from './custodyState';
import {validLocalAdministration} from './localAdministrationSave';
import {validFiscal} from './treasurySave';
import {validRealm} from './realmSave';
import {validDiplomacy} from './diplomacySave';
import {validRelationships} from './relationshipSave';
import {validLife} from './lifeSave';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {governmentOf,governingExecutives} from './government';
import {authorityGrant} from './authority';
import {changeRelationOpinion} from './relationships';
import {lifeOf} from './lifeState';
import {syncCourt,courtOf} from './court';
import {ensureArmyOrganization} from './armyOrganization';
import {serializeWorld,parseWorld,validateWorld} from './save';
const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
const capture=(w:ReturnType<typeof start>,id='dugu-xin')=>{w.mobility!.residences[id]={site:'jiankang',journey:null};detainPerson(w,id,'liang','jiankang','battle','battle:test');};
describe('全人物拘押与结算',()=>{
 it('暂停具名官员权限，保留效忠和官职，不触发朝廷更替',()=>{
  const w=start(),g=governmentOf(w)!;g.court!.ministries.finance='xiao-gang';const before=structuredClone(g.court);capture(w,'xiao-gang');syncCourt(w,'liang');
  expect(allegianceRealm(w,'xiao-gang')).toBe('liang');expect(g.court!.ministries.finance).toBe('xiao-gang');expect(g.court!.tenure).toBe(before!.tenure);expect(publicOfficeReason(w,'xiao-gang')).toContain('拘禁');expect(authorityGrant(w,'xiao-gang','declareWar',{realm:'liang'}).allowed).toBe(false);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('君主被俘产生临时代理，君位与中央官署保留，释放后复职',()=>{
  const w=start(),g=governmentOf(w)!;g.court!.ministries.finance='xiao-gang';const tenure=courtOf(w)!.tenure;detainPerson(w,'xiao-yan','west','changan','battle','battle:king');syncCourt(w,'liang');
  expect(g.ruler).toBe('xiao-yan');expect(governingExecutives(w,'liang')).toEqual(['xiao-gang']);expect(g.court!.ministries.finance).toBe('xiao-gang');expect(g.court!.tenure).toBe(tenure);expect(lifeOf(w,'xiao-yan')!.death).toBeNull();
  const coins=w.people[0].coins,total=coins+w.realm!.treasuries.west.coins;act(w,{type:'custody',action:'ransom',person:'xiao-yan'});expect(detained(w,'xiao-yan')).toBe(false);expect(w.people[0].coins+w.realm!.treasuries.west.coins).toBe(total);expect(governingExecutives(w,'liang')).toContain('xiao-yan');validateWorld(w);
 });
 it('招降仅转移本人，原职、部队与下属不会隐式变国，承诺失信会损伤忠诚',()=>{
  const w=start(),id='dugu-xin';w.relationships!.oaths['wei-xiaokuan']={lord:id,since:0,loyalty:80};w.realm!.cities.changan.governor=id;capture(w,id);changeRelationOpinion(w,id,'xiao-yan',100);w.custody!.records[id].treatment='honored';const total=w.realm!.treasuries.liang.coins+w.relationships!.reserves[id];
  actCustody(w,{type:'custody',action:'recruit',person:id,offer:'office'});expect(allegianceRealm(w,id)).toBe('liang');expect(allegianceRealm(w,'wei-xiaokuan')).toBe('west');expect(w.realm!.cities.changan.governor).toBeNull();expect(w.realm!.treasuries.liang.coins+w.relationships!.reserves[id]).toBe(total);expect(w.custody!.records[id]).toBeUndefined();expect(parseWorld(serializeWorld(w))).toEqual(w);
  w.day=120;advanceCustody(w);expect(w.custody!.promises[0].status).toBe('broken');expect(w.relationships!.oaths[id].loyalty).toBe(30);validateWorld(w);
 });
 it('拒绝相同条件的重复招降，失败不扣礼金',()=>{
  const w=start();capture(w);const coins=w.realm!.treasuries.liang.coins;actCustody(w,{type:'custody',action:'recruit',person:'dugu-xin',offer:'stipend'});expect(w.custody!.records['dugu-xin']).toBeDefined();expect(w.realm!.treasuries.liang.coins).toBe(coins);w.day=8;expect(custodyReason(w,{type:'custody',action:'recruit',person:'dugu-xin',offer:'stipend'})).toContain('条件未改变');
 });
 it('换俘原子释放双方，不复制钱粮与资产',()=>{
  const w=start();capture(w);w.mobility!.residences['xiao-gang']={site:'changan',journey:null};detainPerson(w,'xiao-gang','west','changan','battle','battle:other');const total=Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0);actCustody(w,{type:'custody',action:'exchange',person:'dugu-xin',other:'xiao-gang'});expect(Object.keys(w.custody!.records)).toHaveLength(0);expect(Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)).toBe(total);expect(()=>actCustody(w,{type:'custody',action:'exchange',person:'dugu-xin',other:'xiao-gang'})).toThrow();validateWorld(w);
 });
 it('拘捕有执行时间，无依据损害支持，担保押金真实支付与返还',()=>{
  const w=start(),before=governmentOf(w)!.support;actCustody(w,{type:'custody',action:'arrest',person:'xiao-gang'});expect(detained(w,'xiao-gang')).toBe(false);expect(governmentOf(w)!.support).toBe(before-8);w.day=7;advanceCustody(w);expect(detained(w,'xiao-gang')).toBe(true);const coins=w.people[0].coins;actCustody(w,{type:'custody',action:'guarantee',person:'xiao-gang',guarantor:'xiao-yan'});expect(w.people[0].coins).toBe(coins-100);expect(w.custody!.guarantees[0].status).toBe('held');w.day=97;advanceCustody(w);expect(w.people[0].coins).toBe(coins);expect(w.custody!.guarantees[0].status).toBe('refunded');advanceCustody(w);expect(w.people[0].coins).toBe(coins);expect(validRelationships(w),'relationships').toBe(true);expect(validLife(w),'life').toBe(true);expect(validLocalAdministration(w),'local').toBe(true);expect(validFiscal(w),'fiscal').toBe(true);expect(validRealm(w),'realm').toBe(true);expect(validDiplomacy(w),'diplomacy').toBe(true);validateWorld(w);
 });
 it('处决使用公共死亡清理，存档拒绝伪造拘押与死亡原因',()=>{
  const w=start();capture(w);actCustody(w,{type:'custody',action:'execute',person:'dugu-xin'});expect(lifeOf(w,'dugu-xin')!.death?.cause).toBe('execution');expect(w.custody!.records['dugu-xin']).toBeUndefined();expect(parseWorld(serializeWorld(w))).toEqual(w);const bad=structuredClone(w);(bad.custody!.history[0] as {person:string}).person='unknown';expect(()=>validateWorld(bad)).toThrow();
 });
 it('无关驻地变国与军队移除不会伪造俘获，真实溃散只结算一次',()=>{
  const w=start();w.realm!.armies.push({realm:'west',location:'jiankang',troops:100,morale:0,supply:0,journey:null,siege:0},{realm:'liang',location:'jiankang',troops:600,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);const [a,b]=w.realm!.armies;w.mobility!.armyCommanders={[a.id!]:'dugu-xin'};w.mobility!.residences['dugu-xin']={site:'jiankang',journey:null};resolveCommanderFate(w,a,b,'battle:actual',false);const health=lifeOf(w,'dugu-xin')!.health,count=w.custody!.history.length;resolveCommanderFate(w,a,b,'battle:actual',false);expect(lifeOf(w,'dugu-xin')!.health).toBe(health);expect(w.custody!.history.length).toBe(count);
 });
});

it('实际城内官员才可能被俘，议降人员沿真实道路撤离',()=>{
 const w=start();w.realm!.cities.jingkou.governor='xiao-gang';w.mobility!.residences['xiao-gang']={site:'jiankang',journey:null};captureCityPeople(w,'jingkou','east','siege:remote');w.realm!.cities.jingkou.governor=null;w.realm!.cities.jiankang.governor='xiao-gang';expect(w.custody!.records['xiao-gang']).toBeUndefined();
 w.mobility!.residences['xiao-gang']={site:'jiankang',journey:null};captureCityPeople(w,'jiankang','east','siege:peace',true);expect(w.custody!.records['xiao-gang']).toBeUndefined();expect(w.mobility!.residences['xiao-gang'].journey).not.toBeNull();expect(w.people[0].journey).not.toBeNull();expect(allegianceRealm(w,'xiao-gang')).toBe('liang');validateWorld(w);
});
it('看管军队的位置是唯一旅程来源，普通赴任不能再次推进俘虏',()=>{
 const w=start(),route=planRoute('jiankang','jingkou')!;w.realm!.armies.push({realm:'liang',location:'jiankang',troops:600,morale:80,supply:120,journey:null,siege:0,automation:'direct'});ensureArmyOrganization(w);const a=w.realm!.armies[0];detainPerson(w,'dugu-xin','liang','jiankang','battle','battle:escort',a);a.journey={route:route.route,durations:route.durations,leg:0,elapsed:0,started:0};advance(w,1);const p=w.mobility!.residences['dugu-xin'];expect(p.site).toBe(a.location);expect(p.journey).toEqual(a.journey);advanceMobility(w);expect(p.journey).toEqual(a.journey);validateWorld(w);
 w.realm!.armies=[];w.realm!.cities[p.site].controller='west';w.day++;advanceCustody(w);expect(detained(w,'dugu-xin')).toBe(false);
});
it('俘虏死亡终止拘押，不伪造继承，未兑现承诺及押金继续按公共规则结清',()=>{
 const w=start();capture(w);die(w,'dugu-xin','illness');expect(w.custody!.records['dugu-xin']).toBeUndefined();expect(lifeOf(w,'dugu-xin')!.death?.cause).toBe('illness');validateWorld(w);
});
it('招降和断开追随者保留旧幕府欠俸债权，无法把旧债转嫁新国',()=>{
 const w=start();w.retinue!.members['wei-xiaokuan']={host:'dugu-xin',joined:0,post:null,site:null,arrears:2};capture(w);changeRelationOpinion(w,'dugu-xin','xiao-yan',100);w.custody!.records['dugu-xin'].treatment='honored';actCustody(w,{type:'custody',person:'dugu-xin',action:'recruit',offer:'stipend'});expect(w.obligations!.items.some(d=>d.from==='person:dugu-xin'&&d.to==='person:wei-xiaokuan'&&d.remaining===4)).toBe(true);expect(allegianceRealm(w,'wei-xiaokuan')).toBe('west');validateWorld(w);
});
it('本国中央无授权不能筹赎，招降礼金收款封顶不会留下半笔支付',()=>{
 const w=start();detainPerson(w,'xiao-gang','west','changan','battle','battle:request');const before=structuredClone(w.realm!.treasuries);expect(custodyReason(w,{type:'custody',action:'request-lord',person:'xiao-gang'},'xiao-gang')).not.toBe('');expect(w.realm!.treasuries).toEqual(before);
 const v=start();capture(v);v.relationships!.reserves['dugu-xin']=1_000_000;const coins=v.realm!.treasuries.liang.coins;expect(()=>actCustody(v,{type:'custody',action:'recruit',person:'dugu-xin',offer:'stipend'})).toThrow('礼金');expect(v.realm!.treasuries.liang.coins).toBe(coins);
});
it('内战俘虏的裁定者来自实际俘获阵营',()=>{
 const w=start();w.realm!.wars=[{id:1,attacker:'liang',defender:'liang',target:'jingkou',started:0,score:0,civil:{claimant:'xiao-gang',loyalist:'xiao-yan',supporters:['xiao-gang'],base:'jingkou',cities:['jingkou'],armies:[1],name:'义军'}}];w.realm!.armies.push({realm:'liang',location:'jingkou',troops:600,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);const a=w.realm!.armies[0];detainPerson(w,'xiao-yi','liang','jingkou','battle','battle:civil',a);expect(custodyAuthority(w,'xiao-yan',w.custody!.records['xiao-yi'])).toBe('');expect(custodyAuthority(w,'xiao-gang',w.custody!.records['xiao-yi'])).toBe('国家裁定');
});
it('本国收押不能循环招降刷礼金，NPC 朝廷也会按证据审理玩家案件',()=>{
 const w=newCampaignWorld('xiao-gang',undefined,'sandbox');detainPerson(w,'xiao-gang','liang','jiankang','arrest','warrant:trial');const coins=w.realm!.treasuries.liang.coins;expect(custodyReason(w,{type:'custody',action:'recruit',person:'xiao-gang',offer:'office'},'xiao-yan')).toContain('依法审理');expect(w.realm!.treasuries.liang.coins).toBe(coins);w.day=31;advanceCustody(w);expect(detained(w,'xiao-gang')).toBe(false);expect(w.custody!.history.at(-1)!.result).toBe('审理释放');validateWorld(w);
});

it('战役统帅被俘立即交接军权、原账户回收结余，俘虏不再跟随原军',()=>{
 const w=start();w.realm!.armies.push({realm:'liang',location:'jiankang',troops:600,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);const a=w.realm!.armies[0];w.militaryCampaigns={nextId:2,items:[{id:1,lastDay:0,realm:'liang',war:1,army:a.id!,commander:'xiao-gang',issuer:'xiao-yan',target:'luoyang',goal:'capture',source:'central:liang',budget:100,remaining:80,spent:20,started:0,deadline:180,strength:600,lossLimit:50,held:0,status:'active',reason:''}]};const before=publicBalance(w,'central:liang');detainPerson(w,'xiao-gang','west','changan','battle','battle:commission');expect(w.militaryCampaigns.items[0].status).toBe('failed');expect(w.militaryCampaigns.items[0].remaining).toBe(0);expect(publicBalance(w,'central:liang')).toBe(before+80);expect(armyCommander(w,a)).toBeUndefined();expect(commandArmy(w,'xiao-gang')).toBeUndefined();expect(w.mobility!.residences['xiao-gang'].site).toBe('changan');validateWorld(w);
});

it('撤换看管军统帅后，原俘获者不能凭历史记录继续释放俘虏',()=>{
 const w=start();w.realm!.armies.push({realm:'liang',location:'jiankang',troops:600,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);const a=w.realm!.armies[0];w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]='xiao-gang';detainPerson(w,'dugu-xin','liang','jiankang','battle','battle:guard',a);const p=w.custody!.records['dugu-xin'];expect(custodyAuthority(w,'xiao-gang',p)).toBe('看管将领');w.mobility!.armyCommanders[a.id!]='xiao-yi';expect(custodyAuthority(w,'xiao-gang',p)).toBe('');expect(custodyAuthority(w,'xiao-yi',p)).toBe('看管将领');expect(custodyReason(w,{type:'custody',action:'release',person:'dugu-xin'},'xiao-gang')).toContain('权限');validateWorld(w);
});

import {ensureWars} from './wars';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import type {World} from './types';
import {civilWar,settleCivilWar,advanceCivilPolitics,warCitySide,civilCityCapture,civilReason} from './civilWars';
import {independentCivil,migrateCivilPolities} from './civilPolities';
import {setLocalHolder,countyTerritory,localKey,localHolder,advanceLocal} from './localAdministration';
import {ensureArmyOrganization,armyOrganizationReason,actArmyOrganization} from './armyOrganization';
import {ensureFiscal,fiscalPath,routeGrant,actFiscal} from './treasury';
import {changeRelationOpinion} from './relationships';
import {canCommission} from './serviceMandates';
import {fortificationQuote} from './fortifications';
import {allegianceRealm} from './officeEligibility';
import {authorityGrant} from './authority';
import {governmentOf,regimeName} from './government';
import {administrativeRealm,provisionalRealm} from './polityRuntime';
import {occupyCity,settleWar} from './realm';
import {portraitRank} from '../character/portraitRank';
import {mobilizeRealm} from './militaryAI';
import {actPolity} from './politySeparation';
import {serializeWorld,parseWorld,validateWorld} from './save';
import {validGovernments} from './governmentSave';
import {validRealm} from './realmSave';
import {validRulerHistory,syncRulerHistory} from './rulerHistory';
import {validFiscal} from './treasurySave';

function fixture(rise=true,person='xiao-yi'){
 const w=newCampaignWorld(person,undefined,'sandbox'),site=w.people[0].location,r=allegianceRealm(w,person)!;
 setLocalHolder(w,countyTerritory(site),r,person);w.realm!.cities[site].grain=500;w.realm!.influence=400;w.people[0].coins=500;
 const source=fiscalPath(w,site)[0];ensureFiscal(w)!.balances[source]=300;
 w.realm!.armies.push({realm:r,location:site,troops:400,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);
 const a=w.realm!.armies.at(-1)!;a.payer=source;w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]=person;w.mobility!.residences[person]={site,journey:null};
 if(rise)act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:person,beneficiary:governmentOf(w,r)!.ruler,executive:person,name:''}});
 return {w,site,a,source};
}
function saved(w:World){expect({government:validGovernments(w),realm:validRealm(w),history:validRulerHistory(w.rulerHistory,w),fiscal:validFiscal(w)}).toEqual({government:true,realm:true,history:true,fiscal:true});validateWorld(w);expect(parseWorld(serializeWorld(w))).toEqual(w);}
const cash=(w:World)=>Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)+Object.values(w.realm!.fiscal!.balances).reduce((n,v)=>n+v,0)+w.people[0].coins;

describe('independent wartime military governments',()=>{
 it('takes the real uprising city and replaces its incumbent with the leader without granting legal land or resources',()=>{
  const {w,site,a}=fixture(false);setLocalHolder(w,countyTerritory(site),'liang','xiao-gang');
  for(const u of a.regiments!){u.loyalTo='xiao-yi';u.commanderLoyalty=90;u.institution=30;}
  const before=cash(w),population=w.realm!.cities[site].population,grain=w.realm!.cities[site].grain,troops=a.troops;
  const c={type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:'xiao-yan',executive:'xiao-yi',name:''}} as const;
  expect(civilReason(w,c)).toBe('');act(w,c);const war=civilWar(w,'liang')!,r=war.attacker;
  expect(war.civil!.cities).toContain(site);expect(w.realm!.cities[site]).toMatchObject({owner:'liang',controller:r,governor:'xiao-yi',occupiedByWar:war.id});
  expect(localHolder(w,countyTerritory(site),r)).toBe('xiao-yi');expect(localHolder(w,countyTerritory(site),'liang')).toBeNull();
  expect(allegianceRealm(w,'xiao-gang')).toBe('liang');expect(cash(w)).toBe(before);expect(a.troops).toBe(troops);expect(w.realm!.cities[site]).toMatchObject({population,grain});
  advanceLocal(w);expect(w.realm!.cities[site].governor).toBe('xiao-yi');saved(w);
 });
 it('repairs only a never-handed-over empty base office in existing independent saves, once',()=>{
  const {w,site}=fixture(),war=civilWar(w,'liang')!,r=war.attacker,county=countyTerritory(site),before=cash(w),day=w.day;
  setLocalHolder(w,county,r,null);delete w.realm!.local!.seats[localKey(r,county)];syncRulerHistory(w);
  const loaded=parseWorld(serializeWorld(w));expect(loaded.realm!.cities[site].governor).toBe('xiao-yi');expect(loaded.day).toBe(day);expect(cash(loaded)).toBe(before);saved(loaded);
  const snapshot=structuredClone(loaded);migrateCivilPolities(loaded);expect(loaded).toEqual(snapshot);
  setLocalHolder(loaded,county,r,null);migrateCivilPolities(loaded);expect(loaded.realm!.cities[site].governor).toBeNull();
  const lost=structuredClone(w);lost.realm!.cities[site].controller='west';migrateCivilPolities(lost);expect(lost.realm!.cities[site]).toMatchObject({controller:'west',governor:null});
 });
 it('also supports a nominal ruler raising a military camp against an actual regent',()=>{
  const {w}=fixture(true,'yuan-shanjian'),war=civilWar(w,'east')!;
  expect(governmentOf(w,'east')!.ruler).toBe('yuan-shanjian');expect(allegianceRealm(w,'yuan-shanjian')).toBe(war.attacker);expect(governmentOf(w,'east')!.executives).toContain('gao-huan');saved(w);
  settleCivilWar(w,war,'demand','rebel');expect(governmentOf(w,'east')!.executives).toEqual(['yuan-shanjian']);saved(w);
 });
 it('uses one real polity for command, recruitment and diplomacy while preserving legal title and cash',()=>{
  const {w,site,a}=fixture(false),before=cash(w),population=w.realm!.cities[site].population,grain=w.realm!.cities[site].grain;
  governmentOf(w,'liang')!.herd=200;
  act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:'xiao-yan',executive:'xiao-yi',name:''}});
  const war=civilWar(w,'liang')!,r=war.attacker;
  expect(independentCivil(war)).toBe(true);expect(provisionalRealm(w,r)).toBe(true);expect(allegianceRealm(w,'xiao-yi')).toBe(r);expect(allegianceRealm(w,'xiao-yan')).toBe('liang');
  expect(governmentOf(w,'liang')!.herd).toBe(200);expect(governmentOf(w,r)!.herd).toBe(0);
  expect(w.realm!.cities[site]).toMatchObject({owner:'liang',controller:r});expect(administrativeRealm(w,site)).toBe(r);expect(regimeName(w,r)).toBe('萧绎军府');
  expect(cash(w)).toBe(before);expect(w.realm!.cities[site].population).toBe(population);expect(w.realm!.cities[site].grain).toBe(grain);expect(a.realm).toBe(r);
  expect(portraitRank('xiao-yi',w)).toBe('commander');
  for(const capability of ['levy','declareWar','negotiatePeace'] as const)expect(authorityGrant(w,'xiao-yi',capability,{realm:r,site}).allowed).toBe(true);
  expect(authorityGrant(w,'xiao-yi','appoint',{realm:r,site,territory:countyTerritory(site)}).allowed).toBe(true);expect(canCommission(w,'xiao-yi',r,site,'taxation')).toBe(true);
  expect(authorityGrant(w,'xiao-yan','command',{realm:r,army:a}).allowed).toBe(false);
  const command={type:'army',action:'raise',site,kind:'spear',service:'levy',amount:200,target:a.id!} as const;
  expect(armyOrganizationReason(w,command)).toBe('');actArmyOrganization(w,command);expect(a.troops).toBe(600);expect(w.realm!.cities[site].population).toBe(population-200);expect(w.realm!.cities[site].grain).toBeLessThan(grain);routeGrant(w,site,100,'军府城防预算');expect(fortificationQuote(w,site).reason).toBe('');saved(w);
 });
 it('lets an NPC raise reinforcements using its own real money, people, grain and training time',()=>{
  const {w,site}=fixture(),r=civilWar(w,'liang')!.attacker,before=w.realm!.treasuries[r].coins,pop=w.realm!.cities[site].population,grain=w.realm!.cities[site].grain;
  expect(mobilizeRealm(w,r,site)).toBe(true);expect(w.realm!.treasuries[r].coins).toBe(before-120);expect(w.realm!.cities[site].population).toBe(pop-600);expect(w.realm!.cities[site].grain).toBe(grain-120);expect(w.realm!.armies.at(-1)!.trainingUntil).toBe(w.day+30);saved(w);
 });
 it('ends a powerless camp after a third country captures its last base, preserving the third-party occupation',()=>{
  const {w,site}=fixture(),war=civilWar(w,'liang')!,r=war.attacker;
  w.people[0].location='jiankang';w.mobility!.residences['xiao-yi']={site:'jiankang',journey:null};
  for(const a of w.realm!.armies.filter(a=>a.realm===r))delete w.mobility!.armyCommanders![a.id!];w.realm!.armies=w.realm!.armies.filter(a=>a.realm!==r);const external={id:w.realm!.nextWarId!++,attacker:'east' as const,defender:'liang' as const,target:site,started:w.day,score:0};w.realm!.wars!.push(external);
  occupyCity(w,external,site,'east',true);expect(war.civil!.cities).not.toContain(site);expect(warCitySide(w,war,site)).toBeNull();advanceCivilPolitics(w);
  expect(civilWar(w,'liang')).toBeUndefined();expect(w.realm!.cities[site]).toMatchObject({owner:'liang',controller:'east',occupiedByWar:external.id});expect(w.realm!.annexed?.[r]?.into).toBe('liang');saved(w);
 });
 it('keeps a camp with an actual recruiting base, and returns a foreign occupation to that camp on white peace',()=>{
  const {w,site}=fixture(),war=civilWar(w,'liang')!,r=war.attacker;
  w.realm!.armies=[];w.mobility!.armyCommanders={};advanceCivilPolitics(w);expect(civilWar(w,'liang')?.id).toBe(war.id);
  w.people[0].location='jiankang';w.mobility!.residences['xiao-yi']={site:'jiankang',journey:null};
  const external={id:w.realm!.nextWarId!++,attacker:'east' as const,defender:r,target:site,started:w.day,score:0,goal:'reparations' as const,captureLosses:[]};w.realm!.wars!.push(external);occupyCity(w,external,site,'east',true);
  expect(w.realm!.cities[site].occupiedFrom).toBe(r);saved(w);w.day+=90;settleWar(w,external,'white','east');
  expect(w.realm!.cities[site]).toMatchObject({owner:'liang',controller:r,occupiedByWar:war.id});expect(w.realm!.cities[site].occupiedFrom).toBeUndefined();saved(w);
 });
 it('retains overflowing balances until the successor treasury has capacity',()=>{
  const {w}=fixture(),war=civilWar(w,'liang')!,r=war.attacker;w.realm!.treasuries.liang.coins=999950;w.realm!.treasuries[r].coins=400;governmentOf(w,'liang')!.herd=950;governmentOf(w,r)!.herd=200;
  const before=cash(w);settleCivilWar(w,war,'white');expect(w.realm!.treasuries.liang.coins).toBe(1000000);expect(w.realm!.treasuries[r].coins).toBe(350);expect(governmentOf(w,'liang')!.herd).toBe(1000);expect(governmentOf(w,r)!.herd).toBe(150);expect(cash(w)).toBe(before);saved(w);
 });
 it('keeps a real subordinate grant request as history after its military government is dissolved',()=>{
  const {w}=fixture(false);setLocalHolder(w,countyTerritory('jiangling'),'liang','xiao-gang');w.mobility!.residences['xiao-gang']={site:'jiangling',journey:null};changeRelationOpinion(w,'xiao-gang','xiao-yi',100);changeRelationOpinion(w,'xiao-gang','xiao-yan',-100);
  act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:'xiao-yan',executive:'xiao-yi',name:''}});const war=civilWar(w,'liang')!;
  expect(allegianceRealm(w,'xiao-gang')).toBe(war.attacker);actFiscal(w,{type:'fiscal',action:'request',site:'jiangling',amount:20,purpose:'construction'},'xiao-gang');expect(w.realm!.fiscal!.requests.at(-1)!.status).toBe('pending');saved(w);
  settleCivilWar(w,war,'demand','loyal');expect(w.realm!.fiscal!.requests.at(-1)!).toMatchObject({realm:war.attacker,status:'cancelled'});saved(w);
 });
 it('preserves separate foreign wars against the same enemy when the camp reunifies',()=>{
  const {w}=fixture(),civil=civilWar(w,'liang')!,r=civil.attacker;
  w.realm!.wars!.push({id:w.realm!.nextWarId!++,attacker:'liang',defender:'east',target:'ye',started:0,score:0,goal:'reparations',captureLosses:[]},{id:w.realm!.nextWarId!++,attacker:r,defender:'east',target:'luoyang',started:0,score:0,goal:'reparations',captureLosses:[]});
  settleCivilWar(w,civil,'white');expect(w.realm!.wars).toHaveLength(2);expect(w.realm!.wars!.filter(v=>v.inheritedFrom===r)).toHaveLength(1);saved(w);
  const forged=structuredClone(w);forged.realm!.wars![1].inheritedFrom=undefined;expect(()=>validateWorld(forged)).toThrow();
 });
 it('does not revoke an unrelated observer realm military mandate when an NPC civil war ends',()=>{const {w}=fixture(),war=civilWar(w,'liang')!;w.characterId='yuwen-tai';w.realm!.mandate=true;settleCivilWar(w,war,'white');expect(w.realm!.mandate).toBe(true);});
 it.each(['loyal','rebel'] as const)('reunifies after %s victory without duplicating money, soldiers or arrears',winner=>{
  const {w,a}=fixture(),war=civilWar(w,'liang')!,r=war.attacker;a.arrears=80;const before=cash(w),troops=w.realm!.armies.reduce((n,a)=>n+a.troops,0);
  settleCivilWar(w,war,'demand',winner);expect(cash(w)).toBe(before);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(troops);expect(a.arrears).toBe(80);expect(a.realm).toBe('liang');expect(allegianceRealm(w,'xiao-yi')).toBe('liang');expect(w.realm!.annexed?.[r]?.into).toBe('liang');
  expect(governmentOf(w,'liang')!.ruler).toBe('xiao-yan');if(winner==='rebel')expect(governmentOf(w,'liang')!.executives).toEqual(['xiao-yi']);saved(w);
 });
 it('promotes the existing camp after agreed partition without free resources or fortifications',()=>{
  const {w,site}=fixture(),war=civilWar(w,'liang')!,r=war.attacker,fort=structuredClone(w.realm!.cities[site].fortification),before=cash(w);
  w.day=180;actPolity(w,{type:'polity',action:'partition',name:'后梁'});
  expect(civilWar(w,'liang')!.civil!.partitionOffer).toBeDefined();
  actPolity(w,{type:'polity',action:'partition-answer',accept:true},'xiao-yan');
  expect(w.realm!.cities[site]).toMatchObject({owner:r,controller:r});expect(civilWar(w,'liang')).toBeUndefined();expect(provisionalRealm(w,r)).toBe(false);expect(cash(w)).toBe(before);expect(w.realm!.cities[site].fortification).toEqual(fort);saved(w);
 });
 it('occupies a court city through actual civil control while leaving legal title unchanged',()=>{
  const {w,a}=fixture(),war=civilWar(w,'liang')!;a.location='jiankang';civilCityCapture(w,war,'jiankang','attack',a);
  expect(w.realm!.cities.jiankang).toMatchObject({owner:'liang',controller:war.attacker});expect(governmentOf(w,'liang')!.ruler).toBe('xiao-yan');saved(w);
 });
 it('migrates a legacy same-realm civil war once, without advancing time or minting resources',()=>{
  const {w,site,a}=fixture(false),before=cash(w),day=w.day;ensureWars(w);const id=w.realm!.nextWarId!++;
  const war={id,attacker:'liang' as const,defender:'liang' as const,target:'jiankang',started:day,score:0,captureLosses:[],civil:{claimant:'xiao-yi',loyalist:'xiao-yan',supporters:['xiao-yi'],base:site,cities:[site],armies:[a.id!],name:'讨奸'}};w.realm!.wars!.push(war);w.realm!.war=w.realm!.wars![0];
  syncRulerHistory(w);const old=serializeWorld(w),loaded=parseWorld(old);expect(loaded.day).toBe(day);expect(civilWar(loaded,'liang')!.attacker).toBe(`rebel-${id}`);expect(loaded.realm!.cities[site]).toMatchObject({controller:`rebel-${id}`,governor:'xiao-yi'});expect(cash(loaded)).toBe(before);saved(loaded);
  migrateCivilPolities(w);expect(w.day).toBe(day);expect(cash(w)).toBe(before);expect(war.attacker).toBe(`rebel-${id}`);const converted=structuredClone(w);migrateCivilPolities(w);expect(w).toEqual(converted);saved(w);
 });
 it.each(['liang','west'] as const)('does not reconquer a lost legacy base held by %s during migration',controller=>{
  const {w,site,a}=fixture(false);setLocalHolder(w,countyTerritory(site),'liang',null);a.location='jiankang';w.people[0].location='jiankang';w.mobility!.residences['xiao-yi']={site:'jiankang',journey:null};ensureWars(w);
  if(controller==='west'){const external={id:w.realm!.nextWarId!++,attacker:'west' as const,defender:'liang' as const,target:site,started:w.day,score:0};w.realm!.wars!.push(external);occupyCity(w,external,site,'west',true);}
  const war={id:w.realm!.nextWarId!++,attacker:'liang' as const,defender:'liang' as const,target:'jiankang',started:w.day,score:0,captureLosses:[],civil:{claimant:'xiao-yi',loyalist:'xiao-yan',supporters:['xiao-yi'],base:site,cities:[],armies:[a.id!],name:'讨奸'}};
  w.realm!.wars!.push(war);w.realm!.war=w.realm!.wars![0];const before=cash(w);migrateCivilPolities(w);
  expect(w.realm!.cities[site]).toMatchObject({controller,governor:null});expect(war.civil.cities).toEqual([]);expect(cash(w)).toBe(before);saved(w);
 });
});

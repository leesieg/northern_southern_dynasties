import {describe,it,expect} from 'vitest';
import {act,newCampaignWorld} from './world';
import {civilCityCapture,civilPeaceReason,civilWar,civilWarScore,civilVictoryReason,advanceCivilPolitics} from './civilWars';
import {ensureArmyOrganization} from './armyOrganization';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {ensureFiscal,fiscalPath,remitMilitarySurplus} from './treasury';
import {governmentOf,governingAuthority} from './government';
import {allPeople} from './personRegistry';
import {personResidence} from './residence';
import {parseWorld,serializeWorld} from './save';
import {civilPoliticalEvaluation} from './civilMobilization';
import {militaryMusterBudget,advanceMilitaryAI,delegatedArmyDecision} from './militaryAI';
import {nextMonthStart} from './calendar';
import {manpower} from './manpower';
import {armyMonthlyPay,realmForecast} from './realm';

function uprising(){
 const w=newCampaignWorld('xiao-yi',undefined,'sandbox'),site=w.people[0].location;
 setLocalHolder(w,countyTerritory(site),'liang','xiao-yi');w.realm!.cities[site].grain=2000;w.realm!.influence=400;w.people[0].coins=500;ensureFiscal(w)!.balances[fiscalPath(w,site)[0]]=1000;
 w.realm!.armies.push({realm:'liang',location:site,troops:600,morale:100,supply:1000,journey:null,siege:0});ensureArmyOrganization(w);const a=w.realm!.armies.at(-1)!;a.payer=fiscalPath(w,site)[0];w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]='xiao-yi';
 act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:'xiao-yan',executive:'xiao-yi',name:''}});
 const war=civilWar(w,a.realm)!;
 // Controlled resistance fixture: an actual defending army survives away from court.
 w.realm!.armies.push({realm:'liang',location:'jingkou',troops:600,morale:100,supply:100,journey:null,siege:0});ensureArmyOrganization(w);
 w.mobility!.residences['xiao-yan']={site:'jiankang',journey:null};w.life!.seed=1000;
 return {w,a,war,site};
}
const totalCash=(w:ReturnType<typeof uprising>['w'])=>Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)+Object.values(w.realm!.fiscal!.balances).reduce((n,v)=>n+v,0);

describe('executive civil war victory',()=>{
 it('allows transfer with a real captive incumbent and surviving remote resistance, retaining custody on reload',()=>{
  const {w,a,war}=uprising();a.location='jiankang';civilCityCapture(w,war,a.location,'attack',a,'battle');
  expect(w.custody!.records['xiao-yan']).toMatchObject({war:war.id,side:'attack',cause:'city'});expect(civilWarScore(w,war)).toBe(40);expect(civilPeaceReason(w,war,'demand')).toBe('');
  act(w,{type:'realm',action:'peace',war:war.id,terms:'demand'});expect(governingAuthority(w,'liang')).toBe('xiao-yi');expect(governmentOf(w,'liang')!.ruler).toBe('xiao-yan');expect(w.custody!.records['xiao-yan']).toMatchObject({captor:'liang'});expect(parseWorld(serializeWorld(w)).custody).toEqual(w.custody);
 });
 it('requires 60 without the king, and rejects an effective army at court even with a captive king',()=>{
  const {w,a,war}=uprising();a.location='jiankang';civilCityCapture(w,war,a.location,'attack',a,'surrender');expect(w.custody?.records['xiao-yan']).toBeUndefined();
  war.score=100;war.battles=19;expect(civilPeaceReason(w,war,'demand')).toContain('战分 60');war.battles=20;expect(civilPeaceReason(w,war,'demand')).toBe('');
  w.realm!.armies.find(b=>b.realm==='liang')!.location='jiankang';expect(civilPeaceReason(w,war,'demand')).toContain('朝廷驻地');
 });
 it('uses the current court location and never relaxes ruler/dynasty wars',()=>{
  const {w,a,war}=uprising();a.location='jiankang';civilCityCapture(w,war,a.location,'attack',a,'battle');war.battles=25;
  war.civil!.arrangement!.goal='ruler';expect(civilVictoryReason(w,war,true)).toContain('抵抗');war.civil!.arrangement!.goal='dynasty';expect(civilVictoryReason(w,war,true)).toContain('抵抗');
  war.civil!.arrangement!.goal='executive';(w.realm!.identities??={}).liang={origin:'liang',capital:'jingkou',created:0,predecessor:null};expect(civilVictoryReason(w,war,true)).toContain('当前权力中心');
 });
 it('does not count a captive from another war as court control, and shares the NPC completion predicate',()=>{
  const {w,a,war}=uprising();a.location='jiankang';civilCityCapture(w,war,a.location,'attack',a,'battle');w.custody!.records['xiao-yan'].war=999;
  expect(civilPeaceReason(w,war,'demand')).toContain('战分 60');w.custody!.records['xiao-yan'].war=war.id;
  // Observe the same lawful victory as a third party; no extra resistance edits.
  w.characterId='guest-west';w.people[0].id='guest-west';advanceCivilPolitics(w);expect(governingAuthority(w,'liang')).toBe('xiao-yi');expect(w.realm!.wars!.some(v=>v.id===war.id)).toBe(false);
 });
});

describe('one conquest method, one personnel disposition',()=>{
 it.each(['battle','surrender'] as const)('%s affects only actual free opponents present in the city',cause=>{
  const {w,a,war}=uprising();a.location='jiankang';const away=structuredClone(personResidence(w,'xiao-gang'));w.mobility!.residences['xiao-gang']={site:'jiangling',journey:null};
  civilCityCapture(w,war,a.location,'attack',a,cause);
  expect(w.custody?.records['xiao-gang']).toBeUndefined();expect(personResidence(w,'xiao-gang').site).toBe('jiangling');
  if(cause==='surrender'){expect(w.custody?.records['xiao-yan']).toBeUndefined();expect(personResidence(w,'xiao-yan').traveling).toBe(true);}else expect(w.custody!.records['xiao-yan'].war).toBe(war.id);
  const once=serializeWorld(w);civilCityCapture(w,war,a.location,'attack',a,cause);expect(serializeWorld(w)).toBe(once);expect(away.site).toBeTruthy();
 });
 it('allows genuine escape during a violent fall, rather than granting automatic king capture',()=>{
  const {w,a,war}=uprising();for(const p of allPeople(w))if(p.id!=='xiao-yan'&&p.id!==w.characterId)w.mobility!.residences[p.id]={site:'jiangling',journey:null};w.life!.seed=0;a.location='jiankang';civilCityCapture(w,war,a.location,'attack',a,'battle');expect(w.custody?.records['xiao-yan']).toBeUndefined();expect(personResidence(w,'xiao-yan').traveling).toBe(true);
 });
 it('peaceful surrender without a safe route leaves the king free in place',()=>{
  const {w,a,war}=uprising();a.location='jiankang';for(const [id,c] of Object.entries(w.realm!.cities))if(id!=='jiankang'&&c.controller==='liang')c.controller=war.attacker;
  civilCityCapture(w,war,a.location,'attack',a,'surrender');expect(w.custody?.records['xiao-yan']).toBeUndefined();expect(personResidence(w,'xiao-yan')).toMatchObject({site:'jiankang',traveling:false});
 });
});

describe('small military government preparation',()=>{
 it('remits only actual local surplus, conserves public cash and is idempotent without new revenue',()=>{
  const {w,war,site}=uprising(),key=fiscalPath(w,site)[0];ensureFiscal(w)!.balances[key]+=1000;const before=totalCash(w),old=w.realm!.treasuries[war.attacker].coins;
  remitMilitarySurplus(w,war.attacker);expect(totalCash(w)).toBe(before);expect(w.realm!.treasuries[war.attacker].coins).toBeGreaterThan(old);expect(w.realm!.fiscal!.balances[key]).toBeGreaterThan(0);const once=serializeWorld(w);remitMilitarySurplus(w,war.attacker);expect(serializeWorld(w)).toBe(once);
 });
 it('halves crown-specific penalties only when keeping the actual king',()=>{
  const {w,war}=uprising(),id='chen-baxian';w.relationships!.oaths[id]={lord:'xiao-yan',since:0,loyalty:90};
  const evaluation=(goal:'executive'|'ruler')=>civilPoliticalEvaluation(w,'liang','xiao-yi','xiao-yan',id,war,{...war.civil!.arrangement!,goal});
  expect(evaluation('executive').parts.find(p=>p.label==='当前效忠誓约')!.value).toBe(-15);expect(evaluation('ruler').parts.find(p=>p.label==='当前效忠誓约')!.value).toBe(-30);
  w.relationships!.oaths[id].lord='xiao-gang';expect(civilPoliticalEvaluation(w,'liang','xiao-yi','xiao-gang',id,war).parts.find(p=>p.label==='当前效忠誓约')!.value).toBe(-30);
 });
 it('quotes the purchase plus two real operating/pay periods and leaves an outmatched NPC at its base',()=>{
  const {w,a,war,site}=uprising();a.automation='delegated';w.characterId='guest-west';w.people[0].id='guest-west';const enemy=w.realm!.armies.find(b=>b.realm==='liang')!;enemy.troops=3000;enemy.regiments![0].troops=3000;
  const quote=militaryMusterBudget(w,war.attacker,site,Math.min(600,manpower(w,site).publicAvailable));expect(quote).toBeGreaterThan(120+2*armyMonthlyPay(w,a));expect(quote).toBeGreaterThan(2*realmForecast(w,war.attacker).expense);
  const decision=delegatedArmyDecision(w,a);expect(decision.intent).toBe('争取地方与整军');expect(decision.route).toBeUndefined();a.morale=20;expect(delegatedArmyDecision(w,a).intent).not.toBe('争取地方与整军');a.morale=100;
  w.realm!.treasuries[war.attacker].coins=militaryMusterBudget(w,war.attacker,site,100)-1;const count=w.realm!.armies.filter(b=>b.realm===war.attacker).length;advanceMilitaryAI(w);expect(w.realm!.armies.filter(b=>b.realm===war.attacker).length).toBe(count);
 });
});

it('funded NPC recruitment consumes real population, cash and grain, while a player executive keeps the decision',()=>{
 for(const npc of [true,false]){const {w,a,war,site}=uprising();a.automation='delegated';if(npc){w.characterId='guest-west';w.people[0].id='guest-west';}const enemy=w.realm!.armies.find(b=>b.realm==='liang')!;enemy.troops=3000;enemy.regiments![0].troops=3000;w.day=nextMonthStart(w.day,w.scriptId);const amount=Math.min(600,manpower(w,site).publicAvailable),cost=Math.ceil(amount*.2),budget=militaryMusterBudget(w,war.attacker,site,amount);w.realm!.treasuries[war.attacker].coins=budget;const population=w.realm!.cities[site].population,grain=w.realm!.cities[site].grain,count=w.realm!.armies.filter(b=>b.realm===war.attacker).length;
 advanceMilitaryAI(w);expect(w.realm!.armies.filter(b=>b.realm===war.attacker).length).toBe(count+(npc?1:0));expect(w.realm!.treasuries[war.attacker].coins).toBe(budget-(npc?cost:0));expect(w.realm!.cities[site].population).toBe(population-(npc?amount:0));expect(w.realm!.cities[site].grain).toBe(grain-(npc?cost:0));if(npc)expect(w.realm!.armies.filter(b=>b.realm===war.attacker).at(-1)!.trainingUntil).toBe(w.day+30);
 }
});

it('includes existing public arrears once in the recruitment reserve',()=>{const {w,a,war,site}=uprising(),before=militaryMusterBudget(w,war.attacker,site);a.arrears=50;expect(militaryMusterBudget(w,war.attacker,site)).toBe(before+50);});

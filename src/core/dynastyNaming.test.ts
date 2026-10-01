import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {dynastyNameOptions,normalizeLegacyDynastyNames,repairLegacyWestDynastyName} from './dynastyNaming';
import {actPower,applyPowerArrangement} from './powerPolitics';
import {governmentOf,regimeName} from './government';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {die} from './life';
import {advanceCivilPolitics,civilWar,settleCivilWar} from './civilWars';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {ensureArmyOrganization} from './armyOrganization';
import {economyHost} from './personalEconomyAdapter';
import {ensureFiscal,fiscalPath} from './treasury';
import {changeRelationOpinion,syncRelationships} from './relationships';
import {awardDeed} from './deeds';
import {successionDefinitions} from '../data/governments';

const start=()=>newCampaignWorld('guest-west',undefined,'sandbox');
function found(w:ReturnType<typeof start>,r:'west'|'east'='west',founder='yuwen-tai',name='新西魏'){
 applyPowerArrangement(w,r,{goal:'dynasty',sponsor:founder,beneficiary:founder,executive:founder,name});
}

describe('dynasty naming from recorded people and actual territory',()=>{
 it('keeps opening Wei names while using single-character family suggestions',()=>{
  const w=start();expect(regimeName(w,'west')).toBe('西魏');expect(regimeName(w,'east')).toBe('东魏');
  for(const [realm,founder] of [['west','yuwen-tai'],['east','gao-huan']] as const){
   const options=dynastyNameOptions(w,realm,founder);
   expect(options.length).toBeGreaterThan(0);expect(options.every(v=>[...v.name].length===1)).toBe(true);
  }
 });
 it('uses the actual founding family, including historical relatives, without forcing a realm template',()=>{
  const w=start(),before=structuredClone(w);
  expect(dynastyNameOptions(w,'west','yuwen-tai')[0].name).toBe('周');
  expect(dynastyNameOptions(w,'west','yuwen-hu')[0].name).toBe('周');
  expect(dynastyNameOptions(w,'west','chen-baxian')[0].name).toBe('陈');
  expect(dynastyNameOptions(w,'east','gao-yang')[0].name).toBe('齐');
  expect(dynastyNameOptions(w,'east','gao-longzhi')[0].name).not.toBe('齐');
  expect(dynastyNameOptions(w,'east','gao-longzhi').every(v=>!v.reason.includes('家系'))).toBe(true);
  expect(w).toEqual(before);
 });
 it('offers recorded seals and territorial alternatives without interpreting an heir title as a seal',()=>{
  const w=start();
  expect(dynastyNameOptions(w,'east','gao-huan').every(v=>[...v.name].length===1)).toBe(true);
  expect(dynastyNameOptions(w,'east','gao-yang').map(v=>v.name)).not.toContain('太原');
  const fallback=start();found(fallback,'west','yuwen-tai','齐');
  for(const c of Object.values(fallback.realm!.cities))if(c.owner==='east')c.controller='west';
  expect(dynastyNameOptions(fallback,'east','gao-huan')[0].name).toBe('渤海');
  expect(dynastyNameOptions(fallback,'east','gao-yang')[0].name).toBe('太原');
  expect(dynastyNameOptions(fallback,'east','gao-cheng')).toEqual([]);
  expect(dynastyNameOptions(w,'west','dugu-xin')[0]).toMatchObject({name:'雍'});
  expect(dynastyNameOptions(w,'west','dugu-xin').map(v=>v.name)).not.toContain('新西魏');
 });
 it('excludes occupied or foreign territory and treats 魏/东魏/西魏 as the same naming precedent',()=>{
  const w=start();for(const c of Object.values(w.realm!.cities))if(c.owner==='west')c.controller='east';
  expect(dynastyNameOptions(w,'west','dugu-xin')).toEqual([]);
  expect(dynastyNameOptions(w,'east','gao-longzhi').map(v=>v.name)).not.toContain('魏');
  expect(dynastyNameOptions(w,'west','missing-person')).toEqual([]);
 });
 it('avoids both active countries and names previously used by this realm, including qualified variants',()=>{
  const w=start();found(w,'east','gao-yang','周');
  expect(dynastyNameOptions(w,'west','yuwen-tai').map(v=>v.name)).not.toContain('周');
  const other=start();found(other,'west','yuwen-tai','北周');found(other,'west','dugu-xin','秦');
  expect(dynastyNameOptions(other,'west','yuwen-tai').map(v=>v.name)).not.toContain('周');
 });
 it('carries the same territorial name through a qualified NPC revolt and actual dynasty settlement',()=>{
  const w=start(),site='tianshui',actor='dugu-xin',g=governmentOf(w,'west')!;
  setLocalHolder(w,countyTerritory(site),'west',actor);w.realm!.cities[site].grain=300;
  ensureFiscal(w)!.balances[fiscalPath(w,site)[0]]=300;
  economyHost(w).personal(actor)!.write(500);w.realm!.personalInfluence![actor]=500;
  w.realm!.armies.push({realm:'west',location:site,troops:400,morale:80,supply:120,journey:null,siege:0});
  ensureArmyOrganization(w);const a=w.realm!.armies.at(-1)!;a.payer=fiscalPath(w,site)[0];
  w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]=actor;w.mobility!.residences[actor]={site,journey:null};
  g.support=10;g.legitimacy=20;changeRelationOpinion(w,actor,'yuwen-tai',-200);w.day=90;
  advanceCivilPolitics(w);const war=civilWar(w,'west');
  expect(war?.civil).toMatchObject({claimant:actor,name:'雍'});
  const legacy=structuredClone(w),expected=structuredClone(w);
  for(const state of [legacy,expected])for(const v of [...state.realm!.wars??[],...(state.realm!.war?[state.realm!.war]:[])])if(v.civil){
   v.civil.name=state===legacy?'北周':'周';
  }
  expect(parseWorld(serializeWorld(legacy))).toEqual(expected);
  settleCivilWar(w,war!,'yield','rebel');expect(regimeName(w,'west')).toBe('雍');
  expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
});

describe('canonical country names in existing saves',()=>{
 it('normalizes recorded 北周/北齐 names and arrangements without changing other world fields',()=>{
  const w=start();found(w,'west','yuwen-tai','北周');found(w,'east','gao-yang','北齐');
  const expected=structuredClone(w);
  for(const v of expected.realm!.governments!.regimes){if(v.name==='北周')v.name='周';if(v.name==='北齐')v.name='齐';}
  governmentOf(expected,'west')!.arrangement!.name='周';governmentOf(expected,'east')!.arrangement!.name='齐';
  const loaded=parseWorld(serializeWorld(w));expect(loaded).toEqual(expected);
  expect(normalizeLegacyDynastyNames(loaded)).toBe(false);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('normalizes 齐 and repairs 新西魏 in the same load, retaining custom names and opening identities',()=>{
  const w=start();found(w);found(w,'east','gao-yang','北齐');
  const loaded=parseWorld(serializeWorld(w));
  expect(regimeName(loaded,'west')).toBe('周');expect(regimeName(loaded,'east')).toBe('齐');
  expect(loaded.realm!.governments!.regimes.find(v=>v.id==='west-0')?.name).toBeUndefined();
  const custom=start();found(custom,'west','yuwen-tai','渤海');
  expect(parseWorld(serializeWorld(custom))).toEqual(custom);
 });
 it.each([
  {realm:'west',stage:'zhou-accession',actor:'yuwen-tai',year:557,old:'北周',name:'周'},
  {realm:'east',stage:'qi-accession',actor:'gao-huan',year:550,old:'北齐',name:'齐'},
 ] as const)('loads and continues an old $old historical proposal using $name',({realm,stage,actor,year,old,name})=>{
  const w=start(),g=governmentOf(w,realm)!,d=successionDefinitions[stage];
  w.day=Math.round((Date.UTC(year,0,1)-Date.UTC(546,0,1))/86400000);if(w.economy)w.economy.lastDay=w.day;
  g.support=90;g.merit[actor]=60;w.realm!.personalInfluence![actor]=500;
  for(let i=0;i<3;i++)awardDeed(w,realm,actor,'battle:'+i,15,'战胜');syncRelationships(w);
  const regency=w.relationships!.regencies[realm];if(regency)regency.since=w.day-360;
  actPower(w,{type:'power',action:'propose',goal:'dynasty',beneficiary:d.ruler,executive:d.executives[0],name,sourceStage:stage},actor);
  w.politics!.proposals[realm]!.name=old;
  const forged=structuredClone(w);forged.politics!.proposals[realm]!.name=realm==='west'?'北齐':'北周';
  expect(()=>serializeWorld(forged)).toThrow();
  const expected=structuredClone(w);expected.politics!.proposals[realm]!.name=name;
  const loaded=parseWorld(serializeWorld(w));expect(loaded).toEqual(expected);
  applyPowerArrangement(loaded,realm,loaded.politics!.proposals[realm]!);
  expect(regimeName(loaded,realm)).toBe(name);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
});

describe('authorized legacy 新西魏 correction on load',()=>{
 it('changes only the current name metadata, retaining assets, rulers, territory and political identity',()=>{
  const w=start();found(w);const expected=structuredClone(w);
  expected.realm!.governments!.regimes.at(-1)!.name='周';
  governmentOf(expected,'west')!.arrangement!.name='周';
  const loaded=parseWorld(serializeWorld(w));
  expect(loaded).toEqual(expected);expect(regimeName(loaded,'west')).toBe('周');
  expect(repairLegacyWestDynastyName(loaded)).toBe(false);
  expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('uses the recorded founder rather than assigning 周 to every western dynasty',()=>{
  const w=start();found(w,'west','dugu-xin');
  const loaded=parseWorld(serializeWorld(w));expect(regimeName(loaded,'west')).toBe('雍');
  expect(governmentOf(loaded,'west')!.ruler).toBe('dugu-xin');validateWorld(loaded);
 });
 it('uses the founding record after a later ruler arrangement and preserves the current arrangement',()=>{
  const w=start();found(w);
  applyPowerArrangement(w,'west',{goal:'ruler',sponsor:'yuwen-tai',beneficiary:'dugu-xin',executive:'dugu-xin',name:''});
  const loaded=parseWorld(serializeWorld(w));
  expect(regimeName(loaded,'west')).toBe('周');
  expect(governmentOf(loaded,'west')!.arrangement).toEqual(governmentOf(w,'west')!.arrangement);
  expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('retains a later same-family successor while deriving the name from the founding record',()=>{
  const w=start();found(w);die(w,'yuwen-tai','age');
  const ruler=governmentOf(w,'west')!.ruler;expect(ruler).not.toBe('yuwen-tai');
  const loaded=parseWorld(serializeWorld(w));
  expect(regimeName(loaded,'west')).toBe('周');expect(governmentOf(loaded,'west')!.ruler).toBe(ruler);
  expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('preserves custom names, historical parent records and the same text in other realms',()=>{
  const w=start();found(w,'west','yuwen-tai','新雍');found(w,'east','gao-yang','新西魏');
  expect(parseWorld(serializeWorld(w))).toEqual(w);
  expect(repairLegacyWestDynastyName(w)).toBe(false);
  const later=start();found(later);found(later,'west','dugu-xin','秦');
  expect(parseWorld(serializeWorld(later))).toEqual(later);
  expect(later.realm!.governments!.regimes.find(v=>v.name==='新西魏')).toBeDefined();
 });
});

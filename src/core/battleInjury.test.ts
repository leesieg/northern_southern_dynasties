import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {takeCasualties} from './militaryAftermath';
import {ensureArmyOrganization} from './armyOrganization';
import {attributes} from './social';
import {actFamily,advanceHouseholdLife,familyCommandReason} from './householdLife';
import {actLife,advanceLife} from './life';
import {validLife} from './lifeSave';
import {nextMonthStart} from './calendar';
import {parseWorld,serializeWorld} from './save';
function fixture(){
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.day=15;
 w.realm!.armies.push({realm:'east',location:'jinyang',troops:400,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);
 const a=w.realm!.armies.at(-1)!,b={...a,id:999,realm:'west' as const};w.mobility!.armyCommanders={[a.id!]:'gao-huan'};return {w,a,b};
}
describe('real combat injury',()=>{
 it('ignores no casualties, starvation, rout and small losses',()=>{
  const {w,a,b}=fixture(),p=w.life!.people['gao-huan'],health=p.health;
  takeCasualties(w,a,0,b);takeCasualties(w,a,40);takeCasualties(w,a,40,b,true);takeCasualties(w,a,1,b);
  expect(p.injuryUntil).toBeUndefined();expect(p.health).toBe(health);
 });
 it('injures only the actual commander once per recovery period with real ability cost',()=>{
  const {w,a,b}=fixture(),p=w.life!.people['gao-huan'],health=p.health,base=attributes(w,'gao-huan');
  takeCasualties(w,a,40,b);expect(p.health).toBe(health-8);expect(p.injuryUntil).toBe(75);
  expect(attributes(w,'gao-huan').martial).toBe(base.martial-2);expect(attributes(w,'gao-huan').stewardship).toBe(base.stewardship-1);
  takeCasualties(w,a,40,b);expect(p.health).toBe(health-8);expect(p.injuryUntil).toBe(75);
  expect(parseWorld(serializeWorld(w)).life!.people['gao-huan']).toEqual(p);
  w.day=75;expect(attributes(w,'gao-huan').martial).toBe(base.martial);
 });
 it('requires handing over the army before rest and shortens injury through rest',()=>{
  const {w,a,b}=fixture(),p=w.life!.people['gao-huan'];takeCasualties(w,a,40,b);
  expect(familyCommandReason(w,{type:'familyLife',action:'rest'})).toContain('交接');
  delete w.mobility!.armyCommanders![a.id!];actFamily(w,{type:'familyLife',action:'rest'});
  const health=p.health;w.day=31;advanceHouseholdLife(w);expect(p.health).toBe(health);expect(p.injuryUntil).toBe(75);
  w.day=45;advanceHouseholdLife(w);expect(p.injuryUntil).toBe(45);expect(p.health).toBe(health+8);advanceHouseholdLife(w);expect(p.health).toBe(health+8);
 });
 it('gives no completion recovery when rest is ended early',()=>{
  const {w,a,b}=fixture(),p=w.life!.people['gao-huan'];takeCasualties(w,a,40,b);delete w.mobility!.armyCommanders![a.id!];const health=p.health;
  actFamily(w,{type:'familyLife',action:'rest'});w.day=20;actFamily(w,{type:'familyLife',action:'resume'});w.day=45;advanceHouseholdLife(w);expect(p.health).toBe(health);expect(p.injuryUntil).toBe(75);
 });
 it('uses the existing paid care and validates bounded injury dates',()=>{
  const {w,a,b}=fixture(),p=w.life!.people['gao-huan'];takeCasualties(w,a,40,b);const coins=w.people[0].coins;
  actLife(w,{type:'health',action:'care',target:'gao-huan'});expect(w.people[0].coins).toBe(coins-30);
  w.day=nextMonthStart(w.day,w.scriptId);advanceLife(w);expect(p.injuryUntil).toBe(60);expect(validLife(w)).toBe(true);
  p.injuryUntil=w.day+61;expect(validLife(w)).toBe(false);
 });
});

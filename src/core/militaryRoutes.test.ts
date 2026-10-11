import {describe,it,expect} from 'vitest';
import {newCampaignWorld,planRoute,legDays} from './world';
import {canMarchThrough,advanceRealm,type Army} from './realm';
import {advanceMilitaryCampaigns,actMilitaryCampaign} from './militaryCampaigns';
import {armyAdvanceRoute} from './militaryRoutes';
import {strategicTargets} from './realmStrategy';
import {delegatedArmyDecision} from './militaryAI';
import {ensureWars} from './wars';
import {ensureArmyOrganization} from './armyOrganization';
import {parseWorld,serializeWorld} from './save';
import {roads} from '../data/scenario';
function setup(){const w=newCampaignWorld('guest-west',undefined,'sandbox'),s=w.realm!;const a:Army={realm:'east',location:'pingyao',troops:600,morale:100,supply:999,journey:null,siege:0,automation:'delegated'};s.armies=[a];ensureArmyOrganization(w);s.war={attacker:'east',defender:'west',target:'changan',started:0,score:0};delete s.wars;ensureWars(w);return {w,s,a};}
describe('western approaches and autonomous siege steps',()=>{
 it('keeps a commissioned capital objective and budget while attacking the intermediate fort',()=>{
  const {w,s,a}=setup();w.characterId='gao-huan';w.people[0].location=a.location;w.mobility!.residences['gao-huan']={site:a.location,journey:null};
  actMilitaryCampaign(w,{type:'militaryCampaign',action:'commission',army:a.id!,war:s.war!.id!,commander:'gao-huan',target:'changan',goal:'capture',budget:100,lossLimit:50});
  w.day++;advanceMilitaryCampaigns(w);expect(a.journey?.route.at(-1)).toBe('yubi');const q=w.militaryCampaigns!.items[0];expect(q.target).toBe('changan');
  a.location='yubi';a.journey=null;w.day++;advanceMilitaryCampaigns(w);expect(a.journey).toBeNull();expect(q.reason).toContain('先攻取');const budget=q.remaining;advanceMilitaryCampaigns(w);expect(q.remaining).toBe(budget);
  s.cities.yubi.controller='east';w.day++;advanceMilitaryCampaigns(w);expect((a as Army).journey?.route.at(-1)).toBe('puzhou');expect(q.status).toBe('active');
 });
 it('halts a previously booked multi-leg journey when an intermediate hostile fort blocks it',()=>{
  const {w,a}=setup();a.location='yubi';a.journey={route:['pingyao','yubi','puzhou','changan'],durations:[1,1,1],leg:1,elapsed:0,started:0};w.day=1;advanceRealm(w);expect(a.location).toBe('yubi');expect(a.journey).toBeNull();
 });
 it('removes the capital shortcuts from new routes and border targets',()=>{const w=newCampaignWorld('guest-west',undefined,'sandbox');expect(strategicTargets(w,'east').filter(t=>t.enemy==='west').map(t=>t.id).sort()).toEqual(['hongnong','yubi']);expect(planRoute('jinyang','changan')!.route).toEqual(['jinyang','pingyao','yubi','puzhou','fengyi','changan']);expect(planRoute('luoyang','changan')!.route).toEqual(['luoyang','hongnong','huayin','xinfeng','bacheng','changan']);for(const [from,to] of [['jinyang','changan'],['changan','luoyang']])expect(roads.find(e=>e.from===from&&e.to===to)?.legacyOnly).toBe(true);});
 it('advances to the first fort, holds until it falls, then attacks the next without rewriting the war goal',()=>{const {w,s,a}=setup();expect(planRoute(a.location,'changan',id=>canMarchThrough(w,'east',id,'changan',a))).toBeNull();expect(armyAdvanceRoute(w,a,'changan')?.route).toEqual(['pingyao','yubi']);expect(delegatedArmyDecision(w,a).target).toBe('yubi');a.location='yubi';expect(delegatedArmyDecision(w,a).current).toBe('攻取沿途据点');expect(armyAdvanceRoute(w,a,'changan')).toBeNull();s.cities.yubi.controller='east';expect(armyAdvanceRoute(w,a,'changan')?.route).toEqual(['yubi','puzhou']);a.location='puzhou';s.cities.puzhou.controller='east';expect(armyAdvanceRoute(w,a,'changan')?.route).toEqual(['puzhou','fengyi','changan']);expect(s.war!.target).toBe('changan');});
 it('respects third-party borders and does not invent a route when both approaches close',()=>{const {w,s,a}=setup();s.cities.yubi.controller='liang';s.cities.hongnong.controller='liang';expect(armyAdvanceRoute(w,a,'changan')).toBeNull();});
 it('keeps explicit old-save damage, balances and booked shortcut travel without enabling new shortcuts',()=>{const {w,s,a}=setup();s.cities.yubi.fortification={level:0,due:null};a.location='jinyang';a.journey={route:['jinyang','changan'],durations:[legDays('jinyang','changan')],leg:0,elapsed:0,started:w.day};const restored=parseWorld(serializeWorld(w));expect(restored.realm!.armies[0].journey).toEqual(a.journey);expect(restored.realm!.cities.yubi.fortification).toEqual({level:0,due:null});expect(restored.realm!.treasuries).toEqual(s.treasuries);expect(planRoute('jinyang','changan')!.route.length).toBeGreaterThan(2);});
});

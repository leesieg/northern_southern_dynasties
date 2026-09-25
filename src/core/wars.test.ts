import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {settleWar,realmReason} from './realm';
import {activeWars,ensureWars,peaceQuote,advanceReparations} from './wars';
import {atWar} from './diplomacy';
import {parseWorld,serializeWorld} from './save';
function setup(){const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.realm!.war={attacker:'liang',defender:'east',target:'ye',score:0,started:0};ensureWars(w);return w;}
describe('independent wars and settlements',()=>{
 it('migrates legacy wars once and preserves stable IDs on reload',()=>{const w=setup();ensureWars(w);expect(activeWars(w)).toHaveLength(1);expect(activeWars(w)[0].id).toBe(1);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('keeps third-party occupation and another war when a bilateral war ends',()=>{const w=setup(),s=w.realm!;s.wars!.push({id:s.nextWarId!++,attacker:'west',defender:'east',target:'jinyang',score:0,started:0});s.cities.jinyang.controller='west';s.cities.ye.controller='liang';settleWar(w,s.wars![0]);expect(atWar(w,'liang','east')).toBe(false);expect(atWar(w,'west','east')).toBe(true);expect(s.cities.ye.controller).toBe('east');expect(s.cities.jinyang.controller).toBe('west');expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('requires a specific war when several belong to the player',()=>{const w=setup(),s=w.realm!;s.wars!.push({id:s.nextWarId!++,attacker:'liang',defender:'west',target:'changan',score:0,started:0});expect(realmReason(w,{type:'realm',action:'peace'})).toContain('对应战事');});
 it('never grants unoccupied land and refuses day-one white peace',()=>{const w=setup(),war=activeWars(w)[0];war.score=100;expect(peaceQuote(w,war,'liang','demand').reason).toContain('实际控制');expect(peaceQuote(w,war,'liang','white').reason).toBeTruthy();});
 it('creates and pays only actual reparation transfers, retaining unpaid debt',()=>{const w=setup(),s=w.realm!,war=activeWars(w)[0];war.goal='reparations';war.demand=300;s.treasuries.east.coins=20;const before=s.treasuries.liang.coins;settleWar(w,war,'yield','east');expect(s.treasuries.liang.coins).toBe(before+20);expect(s.reparations![0].remaining).toBe(280);w.day=30;s.treasuries.east.coins=40;advanceReparations(w);expect(s.reparations![0].remaining).toBe(240);expect(s.treasuries.liang.coins).toBe(before+60);advanceReparations(w);expect(s.reparations![0].remaining).toBe(240);});
 it('rejects duplicate bilateral wars and forged instalments in saves',()=>{const w=setup(),s=w.realm!;s.wars!.push({...s.wars![0],id:s.nextWarId!++});expect(()=>parseWorld(serializeWorld(w))).toThrow();});
 it('leaves a departing army at its real location and orders a route home',()=>{const w=setup(),s=w.realm!;s.armies.push({realm:'liang',location:'ye',troops:600,morale:80,supply:100,journey:null,siege:0});settleWar(w,s.wars![0]);expect(s.armies[0].location).toBe('ye');expect(s.armies[0].withdrawalUntil).toBeGreaterThan(w.day);expect(s.armies[0].journey?.route[0]).toBe('ye');});
});

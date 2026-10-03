import {describe,it,expect} from 'vitest';
import {act,newCampaignWorld} from './world';
import {applyPowerArrangement} from './powerPolitics';
import {actCivilWar,settleCivilWar} from './civilWars';
import {governmentOf} from './government';
import {die} from './life';
import {pauseEvents,pauseSnapshot,pauseHasActions} from './pauseEvents';
import {parseWorld,serializeWorld} from './save';
import {ensureArmyOrganization} from './armyOrganization';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {ensureFiscal,fiscalPath} from './treasury';
const start=(id='xiao-yi')=>newCampaignWorld(id,undefined,'sandbox');
const change=(w:ReturnType<typeof start>,r:'liang'|'east'|'west'='liang',name='陈')=>applyPowerArrangement(w,r,r==='liang'?{goal:'dynasty',sponsor:'chen-baxian',beneficiary:'chen-baxian',executive:'chen-baxian',name}:r==='east'?{goal:'dynasty',sponsor:'gao-huan',beneficiary:'gao-yang',executive:'gao-huan',name}:{goal:'dynasty',sponsor:'yuwen-tai',beneficiary:'yuwen-jue',executive:'yuwen-tai',name});
const notices=(before:ReturnType<typeof pauseSnapshot>,w:ReturnType<typeof start>)=>pauseEvents(before,w).filter(e=>e.kind==='dynasty');
describe('dynasty change notifications',()=>{
 it('reports a committed political dynasty once with event-time country and ruler information',()=>{
  const w=start(),before=pauseSnapshot(w);change(w);const after=structuredClone(w),events=notices(before,w);
  expect(events).toHaveLength(1);expect(events[0].dynasty).toMatchObject({realm:'liang',previousName:'梁',name:'陈',previousRuler:'xiao-yan',ruler:'chen-baxian',rulerName:'陈霸先',cause:'political',executives:[{id:'chen-baxian',name:'陈霸先'}]});
  expect(events[0].body).toContain('梁');expect(events[0].body).toContain('陈');expect(pauseHasActions(w,events[0])).toBe(false);
  expect(w).toEqual(after);expect(notices(pauseSnapshot(w),w)).toEqual([]);
 });
 it('uses actual allegiance, ignores foreign changes, and reports even away from the home country',()=>{
  const w=start(),before=pauseSnapshot(w);change(w,'east','齐');expect(notices(before,w)).toEqual([]);
  (w.relationships!.allegiances??={})['xiao-yi']={realm:'east',from:'liang',since:w.day,army:0,source:'pact'};w.people[0].location='changan';
  const next=pauseSnapshot(w);change(w,'east','晋');expect(notices(next,w)[0].dynasty).toMatchObject({realm:'east',previousName:'齐',name:'晋'});
  const existing=pauseSnapshot(w);change(w,'liang');expect(notices(existing,w)).toEqual([]);
 });
 it('does not confuse ordinary ruler succession or executive replacement with a dynasty change',()=>{
  const w=start(),before=pauseSnapshot(w);applyPowerArrangement(w,'liang',{goal:'executive',sponsor:'xiao-yi',beneficiary:'xiao-yan',executive:'xiao-yi',name:''});expect(notices(before,w)).toEqual([]);
  const old=pauseSnapshot(w);die(w,'xiao-yan','age');expect(notices(old,w)).toEqual([]);
  const crown=pauseSnapshot(w);applyPowerArrangement(w,'liang',{goal:'ruler',sponsor:'xiao-yi',beneficiary:'xiao-yi',executive:'xiao-yi',name:''});expect(notices(crown,w)).toEqual([]);
 });
 it('takes the outgoing ruler from the current government rather than the initial regime record',()=>{
  const w=start();applyPowerArrangement(w,'liang',{goal:'ruler',sponsor:'xiao-yi',beneficiary:'xiao-gang',executive:'xiao-yi',name:''});const before=pauseSnapshot(w);change(w);
  expect(notices(before,w)[0].dynasty?.previousRuler).toBe('xiao-gang');
 });
 it('reports named cross-family succession alongside personal inheritance and retains the notice names',()=>{
  const w=start('xiao-yan');governmentOf(w,'liang')!.support=80;act(w,{type:'government',action:'nominate',office:'ruler',candidate:'chen-baxian',name:'陈'});
  const before=pauseSnapshot(w);die(w,'xiao-yan','age');const events=pauseEvents(before,w),notice=events.find(e=>e.kind==='dynasty')!;
  expect(events[0].kind).toBe('dynasty');expect(events.some(e=>e.kind==='inheritance')).toBe(true);expect(notice.dynasty).toMatchObject({cause:'inheritance',ruler:'chen-baxian',previousName:'梁',name:'陈'});expect(notice.body).toContain('萧衍身后');
  change(w,'liang','汉');expect(notice.dynasty?.name).toBe('陈');expect(notice.dynasty?.executives.map(p=>p.id)).not.toEqual(['chen-baxian']);
 });
 it('reports a real civil war dynasty settlement with its distinct cause',()=>{
  const w=start(),site=w.people[0].location;setLocalHolder(w,countyTerritory(site),'liang','xiao-yi');w.realm!.cities[site].grain=300;w.realm!.influence=400;w.people[0].coins=500;ensureFiscal(w)!.balances[fiscalPath(w,site)[0]]=300;
  w.realm!.armies.push({realm:'liang',location:site,troops:400,morale:80,supply:120,journey:null,siege:0});ensureArmyOrganization(w);const army=w.realm!.armies.at(-1)!;army.payer=fiscalPath(w,site)[0];w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[army.id!]='xiao-yi';
  actCivilWar(w,{type:'civilWar',action:'rise',name:'荆'});const before=pauseSnapshot(w);expect(notices(before,w)).toEqual([]);
  settleCivilWar(w,w.realm!.wars!.find(v=>v.civil)!,'demand','rebel');const event=notices(before,w)[0];expect(event.dynasty).toMatchObject({cause:'civilWar',name:'荆',ruler:'xiao-yi'});expect(event.body).toContain('内战已决');
  expect(notices(pauseSnapshot(parseWorld(serializeWorld(w))),parseWorld(serializeWorld(w)))).toEqual([]);
 });
 it('uses restored regime history as the baseline without replaying old changes or altering saves',()=>{
  const w=start();change(w);const restored=parseWorld(serializeWorld(w)),before=structuredClone(restored);
  expect(notices(pauseSnapshot(restored),restored)).toEqual([]);expect(restored).toEqual(before);
  const baseline=pauseSnapshot(restored);change(restored,'liang','汉');expect(notices(baseline,restored)[0].dynasty?.previousName).toBe('陈');
 });
});

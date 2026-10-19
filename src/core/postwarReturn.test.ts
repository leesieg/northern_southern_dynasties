import {describe,it,expect} from 'vitest';
import {newCampaignWorld,planRoute} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {actPact,currentPactBreaches} from './allegiancePacts';
import {advanceHistorical} from './historicalEvents';
import {advanceMobility,npcRoute,armyCommander} from './mobility';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {syncRulerHistory} from './rulerHistory';
import {allegianceRealm} from './officeEligibility';
import {ensureWars} from './wars';
import {serializeWorld,parseWorld} from './save';

function displaced(player='guest-west',lost=true){
 const w=newCampaignWorld(player,undefined,'sandbox');initializeHistoricalStart(w);const a=w.realm!.armies.find(a=>armyCommander(w,a)==='hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'west',army:a.id!,terms:'retain'},'hou-jing');
 const p=w.allegiancePacts!.items[0];actPact(w,{type:'pact',action:'answer',id:p.id,accept:true},'yuwen-tai');
 if(lost){w.realm!.armies=w.realm!.armies.filter(a=>a.id!==p.army);delete w.mobility!.armyCommanders![p.army!];}
 setLocalHolder(w,countyTerritory('yingchuan'),'east',null);w.realm!.cities.yingchuan.controller='east';w.mobility!.residences['hou-jing']={site:'yingchuan',journey:null};
 if(player==='hou-jing'){w.people[0].location='yingchuan';w.people[0].journey=null;}
 ensureWars(w);w.realm!.wars=[];w.realm!.war=null;w.realm!.truces['east|west']=90;
 syncRulerHistory(w);return {w,p,a};
}
describe('postwar personal return and a lost asylum force',()=>{
 it('returns an unarmed displaced NPC along real roads and settles the military agreement after actual arrival',()=>{
  const {w,p}=displaced(),money=structuredClone(w.realm!.treasuries),armies=structuredClone(w.realm!.armies),relationships=structuredClone(w.relationships);
  w.allegiancePacts!.items[0].breaches=['撤去约定兵权'];expect(currentPactBreaches(w,w.allegiancePacts!.items[0])).toEqual([]);
  advanceHistorical(w);expect(w.historical!.items[0]).toMatchObject({phase:'settlement',status:'active'});expect(w.historical!.items[0].decision).toBeUndefined();
  w.day++;advanceMobility(w);expect(w.mobility!.residences['hou-jing'].journey).not.toBeNull();
  for(let i=0;i<20&&w.historical!.items[0].status==='active';i++){w.day++;advanceMobility(w);advanceHistorical(w);}
  const at=w.mobility!.residences['hou-jing'];expect(at.journey).toBeNull();expect(w.realm!.cities[at.site].controller).toBe('west');expect(w.realm!.cities.yingchuan.controller).toBe('east');
  expect(w.historical!.items[0]).toMatchObject({phase:'aftermath',status:'resolved'});expect(w.allegiancePacts!.items.find(q=>q.id===p.id)!.status).toBe('ended');expect(allegianceRealm(w,'hou-jing')).toBe('west');
  expect(w.realm!.treasuries).toEqual(money);expect(w.realm!.armies).toEqual(armies);expect(w.relationships).toEqual(relationships);
  expect(parseWorld(serializeWorld(w))).toEqual(w);const once=structuredClone(w);advanceHistorical(w);expect(w).toEqual(once);
 });
 it('settles on actual reentry into the host without cancelling a continuing lawful journey',()=>{
  const {w}=displaced(),route=planRoute('yingchuan','changan')!,leg=route.route.indexOf('huayin');expect(leg).toBeGreaterThan(0);
  w.day=route.durations.slice(0,leg).reduce((n,d)=>n+d,0);w.mobility!.residences['hou-jing']={site:'huayin',journey:{route:route.route,durations:route.durations,leg,elapsed:0,started:0}};
  const before=structuredClone(w.mobility!.residences['hou-jing']);advanceHistorical(w);
  expect(w.historical!.items[0].status).toBe('resolved');expect(w.mobility!.residences['hou-jing']).toEqual(before);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it.each(['expired','war','third-country'] as const)('does not grant return passage when blocked by %s',cause=>{
  const {w}=displaced();expect(npcRoute(w,'hou-jing','huayin')).not.toBeNull();
  if(cause==='expired')w.realm!.truces['east|west']=w.day;
  if(cause==='war'){w.realm!.wars!.push({id:w.realm!.nextWarId!++,attacker:'east',defender:'west',target:'huayin',started:w.day,score:0});w.realm!.war=w.realm!.wars![0];}
  if(cause==='third-country')for(const [id,c] of Object.entries(w.realm!.cities))if(!['yingchuan','huayin'].includes(id))c.controller='liang';
  expect(npcRoute(w,'hou-jing','huayin')).toBeNull();
 });
 it('rechecks truce permission on each leg and leaves a blocked personal placement without recurring crisis decisions',()=>{
  const {w}=displaced();advanceHistorical(w);w.day++;advanceMobility(w);expect(w.mobility!.residences['hou-jing'].journey).not.toBeNull();
  w.realm!.truces['east|west']=w.day;w.day++;advanceMobility(w);expect(w.mobility!.residences['hou-jing']).toMatchObject({site:'yingchuan',journey:null});
  advanceHistorical(w);const before=structuredClone(w.historical);w.day+=35;advanceHistorical(w);expect(w.historical).toEqual(before);expect(w.historical!.items[0].decision).toBeUndefined();
 });
 it('keeps a real removal of a surviving force as a command dispute',()=>{
  const {w,a}=displaced('guest-west',false);delete a.owner;delete w.mobility!.armyCommanders![a.id!];advanceHistorical(w);
  expect(w.historical!.items[0].phase).toBe('dispute');expect(w.allegiancePacts!.items[0].status).toBe('active');
 });
 it('does not choose a personal journey or change allegiance for the player',()=>{
  const {w}=displaced('hou-jing'),player=structuredClone(w.people[0]);advanceHistorical(w);w.day++;advanceMobility(w);
  expect(w.people[0]).toEqual(player);expect(allegianceRealm(w,'hou-jing')).toBe('west');expect(w.historical!.items[0].status).toBe('active');
 });
});

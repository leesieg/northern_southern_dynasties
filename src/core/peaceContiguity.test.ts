import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {declareRealmWar,settleWar} from './realm';
import {peaceQuote,defaultPeaceQuote,defaultPeaceReturns,peaceSignature,ensureWars,warOccupationSites} from './wars';
import {advanceRealmStrategy,actPeaceOffer,peaceOfferReason} from './realmStrategy';
import {awardInfluence} from './personalInfluence';
import {parseWorld,serializeWorld} from './save';
import {nextMonthStart} from './calendar';
import {warTerritorySites,warObjectiveSites} from './warTerritories';
import {roads} from '../data/scenario';
import {territoryNeighbors} from '../data/territoryAdjacency';

function setup(person='xiao-yan',territory?:string){
 const w=newCampaignWorld(person,undefined,'sandbox');awardInfluence(w,'xiao-yan',500);
 const war=declareRealmWar(w,'xiao-yan','liang',territory?'jinyang':'luoyang','territory',territory);
 w.day=900;w.realm!.armies=[];w.realm!.treasuries.east.coins=0;
 return {w,war};
}
function take(w:ReturnType<typeof setup>['w'],site:string,to:'liang'|'east'|'west',war=w.realm!.wars![0]){const c=w.realm!.cities[site];c.controller=to;c.occupiedByWar=war.id;c.occupiedSince=w.day;}
function connected(){const s=setup();take(s.w,'liangxian','liang');take(s.w,'luoyang','liang');return s;}
function captureApproach(w:ReturnType<typeof setup>['w'],target:string){
 const previous=new Map<string,string|null>([['xiangyang',null]]),queue=['xiangyang'];
 for(const id of queue)for(const next of territoryNeighbors(id))if(!previous.has(next)&&['liang','east'].includes(w.realm!.cities[next].owner)){previous.set(next,id);queue.push(next);}
 if(!previous.has(target))throw new Error('No modeled approach to '+target);
 for(let id:string|null=target;id;id=previous.get(id)??null)if(w.realm!.cities[id].owner==='east')take(w,id,'liang');
}

describe('议和县域连续性',()=>{
 it.each(['statusQuo','demand','yield'] as const)('%s cannot cede an isolated default or goal county, even through a retired road',terms=>{
  const {w,war}=setup();take(w,'luoyang','liang');expect(roads.some(r=>r.legacyOnly&&r.from==='xiangyang'&&r.to==='luoyang')).toBe(true);
  const actor=terms==='yield'?'east':'liang',q=peaceQuote(w,war,actor,terms);expect(q.reason).toContain('接壤');expect(q.disconnectedCessions.map(c=>c.site)).toEqual(['luoyang']);
  const before=serializeWorld(w);expect(()=>settleWar(w,war,terms,actor)).toThrow('接壤');expect(serializeWorld(w)).toBe(before);
 });
 it.each(['prefecture:taiyuan','province:east:并州'])('rejects a fully occupied but isolated regional goal %s',territory=>{
  const {w,war}=setup('xiao-yan',territory);for(const id of warObjectiveSites(war))take(w,id,'liang');
  expect(peaceQuote(w,war,'liang','demand').reason).toContain('接壤');const before=serializeWorld(w);expect(()=>settleWar(w,war,'demand')).toThrow('接壤');expect(serializeWorld(w)).toBe(before);
 });
 it.each(['prefecture:taiyuan','province:east:并州'])('distinguishes isolated and connected additional regional clauses %s',territory=>{
  const {w,war}=connected();for(const id of warTerritorySites(w,territory,'east'))take(w,id,'liang');
  const q=peaceQuote(w,war,'liang','demand',[territory]);if(territory==='prefecture:taiyuan'){expect(q.reason).toContain('接壤');expect(q.disconnectedCessions.some(c=>c.site==='jinyang')).toBe(true);}else expect(q.disconnectedCessions).toEqual([]);
 });
 it('accepts an entire batch corridor and settles the counties without creating resources',()=>{
  const {w,war}=connected();for(const id of ['ye',...warTerritorySites(w,'prefecture:taiyuan','east')])captureApproach(w,id);
  const q=peaceQuote(w,war,'east','yield'),treasuries=structuredClone(w.realm!.treasuries),pop=Object.values(w.realm!.cities).reduce((n,c)=>n+c.population,0);
  expect(q.reason).toBe('');expect(q.disconnectedCessions).toEqual([]);settleWar(w,war,'yield','east');
  for(const id of ['liangxian','luoyang','ye','jinyang','yuci'])expect(w.realm!.cities[id].owner).toBe('liang');expect(w.realm!.treasuries).toEqual(treasuries);expect(Object.values(w.realm!.cities).reduce((n,c)=>n+c.population,0)).toBe(pop);
  const saved=serializeWorld(w);settleWar(w,war,'yield','east');expect(serializeWorld(w)).toBe(saved);expect(parseWorld(saved)).toEqual(w);
 });
 it('rejects a corridor returned to its old owner, before paying any attached reparations',()=>{
  const {w,war}=connected(),q=peaceQuote(w,war,'liang','demand',[],100,undefined,['liangxian']);expect(q.reason).toContain('接壤');
  const before=serializeWorld(w);expect(()=>settleWar(w,war,'demand','liang',[],100,undefined,['liangxian'])).toThrow('接壤');expect(serializeWorld(w)).toBe(before);
 });
 it('cannot anchor new land to an existing border county ceded away in the same peace',()=>{
  const {w,war}=connected();take(w,'xiangyang','east');const q=peaceQuote(w,war,'liang','statusQuo');expect(q.reason).toContain('接壤');expect(q.disconnectedCessions.map(c=>c.site)).toContain('liangxian');
  expect(peaceQuote(w,war,'liang','statusQuo',[],0,undefined,['xiangyang']).reason).toBe('');
 });
 it('does not use an ally’s separately ceded county as a corridor',()=>{
  const {w,war}=connected();war.allies={west:'attack'};take(w,'ye','west');for(const id of warTerritorySites(w,'prefecture:taiyuan','east'))take(w,id,'liang');
  const q=peaceQuote(w,war,'liang','statusQuo');expect(q.reason).toContain('接壤');expect(q.disconnectedCessions.some(c=>c.site==='jinyang'&&c.to==='liang')).toBe(true);
 });
 it('checks the actual allied recipient rather than the negotiating leader’s border',()=>{
  const {w,war}=setup();war.allies={west:'attack'};for(const id of warTerritorySites(w,'prefecture:taiyuan','east'))take(w,id,'liang');
  expect(peaceQuote(w,war,'liang','demand',['prefecture:taiyuan']).reason).not.toBe('');
  const q=peaceQuote(w,war,'liang','demand',['prefecture:taiyuan'],0,'west',['luoyang']);expect(q.reason).toContain('归还');
  for(const [id,c] of Object.entries(w.realm!.cities))if(c.owner==='east')take(w,id,'liang');const region=warTerritorySites(w,'prefecture:taiyuan','east'),returns=warOccupationSites(w,war).filter(id=>!region.includes(id));
  expect(peaceQuote(w,war,'liang','demand',['prefecture:taiyuan'],0,'west',returns).reason).toBe('');
 });
 it('does not borrow an occupation belonging to another war as a corridor',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');const other={id:w.realm!.nextWarId!++,attacker:'west' as const,defender:'east' as const,target:'liangxian',started:0,score:0,captureLosses:[]};w.realm!.wars!.push(other);ensureWars(w);take(w,'liangxian','west',other);
  expect(peaceQuote(w,war,'liang','demand').reason).toContain('接壤');settleWar(w,war,'white');expect(w.realm!.cities.liangxian.controller).toBe('west');expect(w.realm!.wars).toContain(other);
 });
 it.each(['white','annex'] as const)('keeps the explicit %s settlement available under its own rules',terms=>{
  const {w,war}=setup();if(terms==='annex'){for(const [id,c] of Object.entries(w.realm!.cities))if(c.owner==='east')take(w,id,'liang');}else take(w,'luoyang','liang');
  expect(peaceQuote(w,war,'liang',terms).reason).toBe('');expect(defaultPeaceReturns(w,war,terms)).toEqual([]);settleWar(w,war,terms);
  expect(terms==='annex'?w.realm!.annexed?.east?.into:w.realm!.cities.luoyang.owner).toBe(terms==='annex'?'liang':'east');
 });
 it('NPC peace ends the war while returning isolated occupation and retaining connected counties',()=>{
  const {w,war}=setup('yuwen-tai');for(const id of ['liangxian','luoyang','jinyang'])take(w,id,'liang');expect(defaultPeaceReturns(w,war)).toEqual(['jinyang']);
  w.day=nextMonthStart(w.day);advanceRealmStrategy(w);expect(w.realm!.wars).not.toContain(war);expect(w.realm!.cities.luoyang.owner).toBe('liang');expect(w.realm!.cities.jinyang).toMatchObject({owner:'east',controller:'east'});expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('signed NPC offers show and apply the same returns, survive loading, and invalidate on occupation changes',()=>{
  const {w,war}=connected();take(w,'jinyang','liang');const quote=defaultPeaceQuote(w,war,'east','statusQuo');expect(quote.reason).toBe('');expect(quote.returning).toEqual(['jinyang']);
  war.peaceOffer={from:'east',to:'liang',terms:'statusQuo',created:w.day,until:w.day+15,signature:peaceSignature(quote)};
  const loaded=parseWorld(serializeWorld(w));expect(peaceOfferReason(loaded,{type:'peaceOffer',war:war.id!,accept:true})).toBe('');actPeaceOffer(loaded,{type:'peaceOffer',war:war.id!,accept:true});expect(loaded.realm!.cities.jinyang.owner).toBe('east');expect(loaded.realm!.cities.luoyang.owner).toBe('liang');
  take(w,'ye','liang');expect(peaceOfferReason(w,{type:'peaceOffer',war:war.id!,accept:true})).toContain('变化');const before=serializeWorld(w);expect(()=>actPeaceOffer(w,{type:'peaceOffer',war:war.id!,accept:true})).toThrow('变化');expect(serializeWorld(w)).toBe(before);
 });
});

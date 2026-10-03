import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {declareRealmWar,occupyCity,settleWar,type Army} from './realm';
import {peaceQuote,peaceSignature,warOccupationSites,ensureWars} from './wars';
import {captureLossQuote,migrateCaptureLosses} from './warOccupation';
import {awardInfluence} from './personalInfluence';
import {ensureArmyOrganization} from './armyOrganization';
import {assaultQuote} from './militaryAftermath';
import {actPeaceOffer,peaceOfferReason,advanceRealmStrategy} from './realmStrategy';
import {nextMonthStart} from './calendar';
import {civilCityCapture} from './civilWars';
import {parseWorld,serializeWorld} from './save';
import type {World} from './types';

function setup(goal:'territory'|'reparations'='territory',person='xiao-yan'){
 const w=newCampaignWorld(person,undefined,'sandbox');awardInfluence(w,'xiao-yan',500);
 const war=declareRealmWar(w,'xiao-yan','liang','luoyang',goal);w.day=900;w.realm!.armies=[];w.realm!.treasuries.east.coins=0;
 return {w,war};
}
function take(w:World,site:string,realm:'liang'|'east'|'west',war= w.realm!.wars![0]){const c=w.realm!.cities[site];c.controller=realm;c.occupiedByWar=war.id;c.occupiedSince=w.day;}
function saved(w:World){expect(parseWorld(serializeWorld(w))).toEqual(w);}
describe('占领现状议和与夺城居民损失',()=>{
 it('defaults to both sides retaining only occupied counties and never charges population at peace',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');take(w,'xiangyang','east');const pop=Object.fromEntries(Object.entries(w.realm!.cities).map(([id,c])=>[id,c.population]));
  const q=peaceQuote(w,war,'liang','statusQuo');expect(q.reason).toBe('');expect(q.cessions).toEqual(expect.arrayContaining([{site:'luoyang',from:'east',to:'liang'},{site:'xiangyang',from:'liang',to:'east'}]));
  expect(q.cost).toBe(q.territoryGained-q.territoryLost);settleWar(w,war);expect(w.realm!.cities.luoyang.owner).toBe('liang');expect(w.realm!.cities.xiangyang.owner).toBe('east');expect(w.realm!.cities.yuci.owner).toBe('east');
  expect(Object.fromEntries(Object.entries(w.realm!.cities).map(([id,c])=>[id,c.population]))).toEqual(pop);saved(w);const s=serializeWorld(w);settleWar(w,war);expect(serializeWorld(w)).toBe(s);
 });
 it('also includes occupation outside a city war objective without manual claims',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');take(w,'liangxian','liang');const q=peaceQuote(w,war,'liang','demand');expect(q.reason).toBe('');expect(q.lands).toEqual(['luoyang','liangxian']);settleWar(w,war,'demand');expect(w.realm!.cities.liangxian.owner).toBe('liang');saved(w);
 });
 it('can return either side’s county and explicitly restore the old border',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');take(w,'xiangyang','east');expect(peaceQuote(w,war,'liang','statusQuo',[],0,undefined,['luoyang']).cessions.map(c=>c.site)).toEqual(['xiangyang']);
  settleWar(w,war,'statusQuo','liang',[],0,undefined,['xiangyang']);expect(w.realm!.cities.xiangyang).toMatchObject({owner:'liang',controller:'liang'});expect(w.realm!.cities.luoyang.owner).toBe('liang');saved(w);
  const other=setup();take(other.w,'luoyang','liang');settleWar(other.w,other.war,'white');expect(other.w.realm!.cities.luoyang).toMatchObject({owner:'east',controller:'east'});saved(other.w);
 });
 it('refuses stale or forged returns before any mutation and refuses first-day settlements',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');for(const ids of [['luoyang','luoyang'],['jiankang'],['missing']]){const before=serializeWorld(w);expect(()=>settleWar(w,war,'statusQuo','liang',[],0,undefined,ids)).toThrow('归还');expect(serializeWorld(w)).toBe(before);}
  w.day=0;delete w.realm!.cities.luoyang.occupiedSince;delete w.realm!.cities.luoyang.occupiedByWar;const before=serializeWorld(w);expect(()=>settleWar(w,war,'white')).toThrow('交战');expect(serializeWorld(w)).toBe(before);
 });
 it('keeps unrelated occupation in another war and attributes only unambiguous legacy occupation',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');const other={id:w.realm!.nextWarId!++,attacker:'west' as const,defender:'east' as const,target:'jinyang',started:0,score:0,captureLosses:[]};w.realm!.wars!.push(other);take(w,'jinyang','west',other);ensureWars(w);
  expect(warOccupationSites(w,war)).toEqual(['luoyang']);settleWar(w,war);expect(w.realm!.cities.jinyang.controller).toBe('west');expect(w.realm!.wars).toContain(other);saved(w);
 });
 it('does not let default cession extinguish a polity without explicit annexation',()=>{
  const {w,war}=setup();for(const [id,c] of Object.entries(w.realm!.cities))if(c.owner==='east')take(w,id,'liang');const before=serializeWorld(w);
  expect(peaceQuote(w,war,'liang','statusQuo').reason).toContain('吞并');expect(()=>settleWar(w,war)).toThrow('吞并');expect(serializeWorld(w)).toBe(before);expect(peaceQuote(w,war,'liang','annex')).toMatchObject({annexes:true,cost:120,reason:''});
  settleWar(w,war,'annex');expect(w.realm!.annexed?.east?.into).toBe('liang');saved(w);
 });
 it('caps territorial terms at 100 and deduplicates a grouped regional price',()=>{
  const {w,war}=setup();for(const [id,c] of Object.entries(w.realm!.cities))if(c.owner==='east'&&id!=='ye')take(w,id,'liang');const q=peaceQuote(w,war,'liang','statusQuo');expect(q.territoryGained).toBe(100);expect(q.cost).toBeLessThan(120);expect(q.reason).toBe('');
  const grouped=peaceQuote(w,war,'liang','demand',['prefecture:taiyuan']);expect(new Set(grouped.lands).size).toBe(grouped.lands.length);expect(grouped.landCosts.filter(c=>c.sites.includes('jinyang'))).toHaveLength(1);
 });
 it('preserves an ally’s occupied territory without treating its opponent’s whole state as acquired',()=>{
  const {w,war}=setup();war.allies={west:'attack'};take(w,'changan','east');take(w,'luoyang','liang');take(w,'ye','west');const q=peaceQuote(w,war,'liang','statusQuo');expect(q.cessions).toContainEqual({site:'changan',from:'west',to:'east'});expect(q.cessions).toContainEqual({site:'ye',from:'east',to:'west'});expect(q.cessions).toEqual(peaceQuote(w,war,'east','statusQuo').cessions);expect(q.reason).toBe('');settleWar(w,war);expect(w.realm!.cities.changan.owner).toBe('east');expect(w.realm!.cities.ye.owner).toBe('west');saved(w);
 });
 it('charges 2% battle deaths only once per city and direction, including recapture',()=>{
  const {w,war}=setup();const c=w.realm!.cities.luoyang,pop=c.population;occupyCity(w,war,'luoyang','liang');expect(c.population).toBe(pop-Math.floor(pop*.02));const one=c.population;occupyCity(w,war,'luoyang','liang');expect(c.population).toBe(one);
  occupyCity(w,war,'luoyang','east');expect(c.population).toBe(one-Math.floor(one*.02));const two=c.population;occupyCity(w,war,'luoyang','liang');expect(c.population).toBe(two);expect(war.captureLosses).toHaveLength(2);saved(w);
 });
 it('charges 0.5% on actual surrender and respects the resident floor',()=>{
  const {w,war}=setup();const c=w.realm!.cities.luoyang,pop=c.population;occupyCity(w,war,'luoyang','liang',true);expect(c.population).toBe(pop-Math.floor(pop*.005));expect(war.captureLosses![0].cause).toBe('surrender');saved(w);
  const tiny=setup();tiny.w.realm!.cities.luoyang.population=101;expect(captureLossQuote(tiny.w,tiny.war,'luoyang','attack','battle').deaths).toBe(1);occupyCity(tiny.w,tiny.war,'luoyang','liang');expect(tiny.w.realm!.cities.luoyang.population).toBe(100);saved(tiny.w);
 });
 it('migrates old occupied saves without retroactive deaths, preserves deduplication and rejects forged records',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');delete war.captureLosses;const before=w.realm!.cities.luoyang.population,loaded=parseWorld(serializeWorld(w)),v=loaded.realm!.wars![0];expect(loaded.realm!.cities.luoyang.population).toBe(before);expect(v.captureLosses).toEqual([{site:'luoyang',side:'attack',day:900,deaths:0,cause:'legacy'}]);
  occupyCity(loaded,v,'luoyang','east');const recovered=loaded.realm!.cities.luoyang.population;occupyCity(loaded,v,'luoyang','liang');expect(loaded.realm!.cities.luoyang.population).toBe(recovered);saved(loaded);
  for(const mutate of [(r:typeof v)=>r.captureLosses![0].day=901,(r:typeof v)=>r.captureLosses!.push({...r.captureLosses![0]}),(r:typeof v)=>r.captureLosses![0].deaths=1]){const bad=structuredClone(loaded);mutate(bad.realm!.wars![0]);expect(()=>serializeWorld(bad)).toThrow();}
  migrateCaptureLosses(loaded);expect(loaded.realm!.cities.luoyang.population).toBe(recovered);
 });
 it('records real assault losses separately from military casualties and makes failed assault cost no residents',()=>{
  for(const troops of [600,3000]){const {w,war}=setup();w.day=5;const c=w.realm!.cities.luoyang;c.population=10000;c.order=70;const pop=c.population;
   const a:Army={realm:'liang',location:'luoyang',troops,morale:100,supply:1000,journey:null,siege:5};w.realm!.armies.push(a);ensureArmyOrganization(w);w.realm!.sieges=[{war:war.id!,side:'attack',site:'luoyang',progress:5,last:5}];const quote=assaultQuote(w,a);expect(quote.success).toBe(troops===3000);
   act(w,{type:'militaryAction',army:a.id!,site:'luoyang',action:'assault'});expect(c.population).toBe(quote.success?pop-Math.floor(pop*.02):pop);expect(war.captureLosses?.[0]?.cause).toBe(quote.success?'battle':undefined);saved(w);
  }
 });
 it('keeps a signed NPC offer reviewable and invalidates it when occupation changes',()=>{
  const {w,war}=setup();take(w,'luoyang','liang');war.peaceOffer={from:'east',to:'liang',terms:'statusQuo',created:w.day,until:w.day+15,signature:peaceSignature(peaceQuote(w,war,'east','statusQuo'))};const loaded=parseWorld(serializeWorld(w));expect(loaded.realm!.wars![0].peaceOffer?.terms).toBe('statusQuo');
  take(w,'liangxian','liang');expect(peaceOfferReason(w,{type:'peaceOffer',war:war.id!,accept:true})).toContain('变化');const before=serializeWorld(w);expect(()=>actPeaceOffer(w,{type:'peaceOffer',war:war.id!,accept:true})).toThrow('变化');expect(serializeWorld(w)).toBe(before);actPeaceOffer(w,{type:'peaceOffer',war:war.id!,accept:false});expect(w.realm!.wars).toContain(war);
 });
 it('lets NPCs propose occupied-land settlement to the player instead of secretly signing it',()=>{
  const {w,war}=setup('reparations');take(w,'xiangyang','east');w.day=nextMonthStart(w.day,w.scriptId);advanceRealmStrategy(w);expect(war.peaceOffer).toBeDefined();expect(war.peaceOffer?.terms).not.toBe('white');expect(war.peaceOffer?.signature).toBeTruthy();expect(w.realm!.cities.xiangyang.owner).toBe('liang');saved(w);
 });
 it('settles real occupied land between NPC states while the player observes another polity',()=>{
  const {w,war}=setup('territory','yuwen-tai');take(w,'luoyang','liang');take(w,'liangxian','liang');w.day=nextMonthStart(w.day,w.scriptId);advanceRealmStrategy(w);
  expect(w.realm!.wars).not.toContain(war);expect(w.realm!.cities.luoyang.owner).toBe('liang');expect(w.realm!.cities.liangxian.owner).toBe('liang');saved(w);
 });
 it('protects already mobilized transport labor from population loss',()=>{
  const {w,war}=setup();const city=w.realm!.cities.luoyang;city.population=1000;
  w.realm!.armies.push({realm:'liang',location:'jiankang',troops:600,morale:80,supply:100,journey:null,siege:0,convoy:{from:'luoyang',to:'jiankang',grain:1,labor:899,route:['luoyang','jiankang'],durations:[1],leg:0,elapsed:0}});
  expect(captureLossQuote(w,war,'luoyang','attack','battle').deaths).toBe(1);occupyCity(w,war,'luoyang','liang');expect(city.population).toBe(999);
 });
 it('applies civilian losses to actual civil-war control changes without turning internal peace into cession',()=>{
  const {w,war}=setup();war.defender='liang';war.civil={claimant:'xiao-gang',loyalist:'xiao-yan',supporters:['xiao-gang'],base:'jingkou',cities:['jingkou'],armies:[],name:'内战'};
  const a:Army={realm:'liang',location:'jiankang',troops:600,morale:80,supply:100,journey:null,siege:0};const c=w.realm!.cities.jiankang,pop=c.population;
  civilCityCapture(w,war,'jiankang','attack',a,'surrender');expect(c.population).toBe(pop-Math.floor(pop*.005));const one=c.population;civilCityCapture(w,war,'jiankang','attack',a,'surrender');expect(c.population).toBe(one);
  expect(peaceQuote(w,war,'liang','statusQuo').reason).toContain('内战');expect(peaceQuote(w,war,'liang','white').cessions).toEqual([]);
 });
});

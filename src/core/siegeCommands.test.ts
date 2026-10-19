import {describe,it,expect} from 'vitest';
import {act,newCampaignWorld} from './world';
import {type Army,type Siege} from './realm';
import {ensureArmyOrganization} from './armyOrganization';
import {ensureWars} from './wars';
import {syncRulerHistory} from './rulerHistory';
import {civilWar} from './civilWars';
import {allegianceRealm} from './officeEligibility';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {ensureFiscal,fiscalPath} from './treasury';
import {governmentOf} from './government';
import {militaryPauses} from './pauseEvents';
import {advanceSiegePhase,playerSiegeDecisionAvailable,siegeDecisionReason} from './siegePhases';
import {assaultQuote,militaryActionReason} from './militaryAftermath';
import {captureLossQuote} from './warOccupation';
import {parseWorld,serializeWorld} from './save';
import {createSimulationRuntime} from '../worker/simulationRuntime';
import {createPreviewStorage} from './previewStorage';
import type {Reply} from './types';

function pendingSiege(atCity=true){
 const w=newCampaignWorld('xiao-yan',undefined,'sandbox');w.day=5;w.realm!.armies=[];w.realm!.wars=[];w.realm!.war=null;ensureWars(w);
 const war={id:1,attacker:'east' as const,defender:'liang' as const,target:'jiankang',score:0,started:0};w.realm!.wars!.push(war);w.realm!.war=war;w.realm!.nextWarId=2;
 setLocalHolder(w,countyTerritory('jiankang'),'liang','xiao-yan');w.people[0].location=atCity?'jiankang':'jingkou';w.people[0].journey=null;
 const a:Army={realm:'east',location:'jiankang',troops:3000,morale:100,supply:1000,journey:null,siege:60};w.realm!.armies.push(a);ensureArmyOrganization(w);
 const s:Siege={war:1,site:'jiankang',side:'attack',progress:60,last:5,started:0,nextPhase:19,round:2,playerDecision:true};w.realm!.sieges=[s];syncRulerHistory(w);return {w,a,s};
}
function civilSiege(troops=3000){
 const w=newCampaignWorld('xiao-yi',undefined,'sandbox'),site=w.people[0].location,r=allegianceRealm(w,'xiao-yi')!;
 setLocalHolder(w,countyTerritory(site),r,'xiao-yi');w.realm!.cities[site].grain=500;w.realm!.influence=400;w.people[0].coins=500;
 const source=fiscalPath(w,site)[0];ensureFiscal(w)!.balances[source]=300;
 const a:Army={realm:r,location:site,troops,morale:100,supply:1000,journey:null,siege:0};w.realm!.armies.push(a);ensureArmyOrganization(w);a.payer=source;w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]='xiao-yi';
 act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:governmentOf(w,r)!.ruler,executive:'xiao-yi',name:''}});
 const war=civilWar(w,a.realm)!;w.day=5;a.location='jiankang';a.siege=20;w.realm!.armies=[a];const city=w.realm!.cities.jiankang;city.population=10000;city.order=70;
 const s:Siege={war:war.id!,site:a.location,side:'attack',progress:20,last:5};w.realm!.sieges=[s];return {w,a,s,war,base:site};
}
const decision=(w:ReturnType<typeof pendingSiege>['w'])=>militaryPauses(w).filter(p=>p.id.startsWith('siege-decision:'));

describe('reachable siege decisions',()=>{
 it('keeps a real on-site decision paused and charges a hold only once',()=>{const {w,s}=pendingSiege();expect(playerSiegeDecisionAvailable(w,s)).toBe(true);expect(decision(w)).toHaveLength(1);const order=w.realm!.cities.jiankang.order;
  act(w,{type:'siegeDecision',war:1,site:s.site,choice:'hold'});expect(w.realm!.cities.jiankang.order).toBe(order-5);expect(decision(w)).toHaveLength(0);const saved=serializeWorld(w);expect(()=>act(w,{type:'siegeDecision',war:1,site:s.site,choice:'hold'})).toThrow();expect(serializeWorld(w)).toBe(saved);
 });
 it('loads an off-site pending decision and advances the real worker without teleporting its governor',async()=>{const {w}=pendingSiege(false),storage=createPreviewStorage();await storage.saveWorld(w);const replies:Reply[]=[],runtime=createSimulationRuntime(storage,m=>replies.push(structuredClone(m)));await runtime.dispatch({type:'init'});await runtime.dispatch({type:'step',requestId:'advance'});
  expect(replies.at(-1)).toMatchObject({type:'receipt',ok:true,requestId:'advance'});const state=replies.filter((r):r is Extract<Reply,{type:'world'}>=>r.type==='world').at(-1)!.world;expect(state.day).toBe(6);expect(state.people[0].location).toBe('jingkou');expect(state.realm!.cities.jiankang.controller).toBe('east');expect(state.realm!.cities.jiankang.owner).toBe('liang');expect(decision(state)).toHaveLength(0);expect((await storage.loadWorld())!.realm!.sieges?.some(s=>s.site==='jiankang')).toBe(false);
 });
 it.each(['withdrawal','starvation','governor','fieldArmy'] as const)('does not pause an invalid %s decision',change=>{const {w,a,s}=pendingSiege();if(change==='withdrawal')a.withdrawalUntil=w.day+2;if(change==='starvation')a.supply=0;if(change==='governor')w.realm!.cities.jiankang.governor=null;if(change==='fieldArmy'){w.realm!.armies.push({realm:'liang',location:s.site,troops:600,morale:80,supply:100,journey:null,siege:0});ensureArmyOrganization(w);}
  expect(playerSiegeDecisionAvailable(w,s)).toBe(false);expect(decision(w)).toHaveLength(0);expect(siegeDecisionReason(w,{type:'siegeDecision',war:1,site:s.site,choice:'hold'})).not.toBe('');
  if(change==='starvation'){expect(advanceSiegePhase(w,s,[a])).toBe(false);expect(s.playerDecision).toBeUndefined();expect(w.realm!.cities.jiankang.controller).toBe('liang');}
 });
 it('does not create another impossible decision when the absent governor reaches the next siege phase',()=>{const {w,a,s}=pendingSiege(false);delete s.playerDecision;s.nextPhase=w.day;s.progress=100;s.breach=3;w.realm!.cities.jiankang.grain=0;
  for(let round=0;round<20;round++){s.round=round;s.nextPhase=w.day;if(advanceSiegePhase(w,s,[a])){expect(s.playerDecision).toBeUndefined();return;}}throw new Error('No real surrender phase reached');
 });
});

describe('manual actions use the army’s actual civil siege',()=>{
 it.each([600,3000])('quotes and settles a %i-person rebel assault, with one cost and a reloadable record',troops=>{const {w,a,s,war}=civilSiege(troops);s.progress=5;a.siege=5;const q=assaultQuote(w,a),city=w.realm!.cities.jiankang,population=city.population,grain=a.supply,men=a.troops,loss=captureLossQuote(w,war,a.location,'attack','battle').deaths;
  expect(q.progress).toBe(5);expect(q.civilianDeaths).toBe(loss);expect(q.success).toBe(troops===3000);expect(militaryActionReason(w,{type:'militaryAction',action:'assault',army:a.id!,site:a.location})).toBe('');act(w,{type:'militaryAction',action:'assault',army:a.id!,site:a.location});
  expect(a.supply).toBe(grain-q.grain);expect(a.troops).toBe(men-q.losses);expect(city.population).toBe(population-(q.success?loss:0));expect(city.controller).toBe(q.success?a.realm:'liang');expect(city.owner).toBe('liang');expect(w.militaryAftermath!.siegeEvents!.at(-1)!.kind).toBe(q.success?'assaultWon':'assaultLost');if(!q.success)expect(s.progress).toBe(3);
  const data=serializeWorld(w);expect(parseWorld(data).militaryAftermath!.siegeEvents).toEqual(w.militaryAftermath!.siegeEvents);expect(()=>act(w,{type:'militaryAction',action:'assault',army:a.id!,site:a.location})).toThrow();expect(serializeWorld(w)).toBe(data);
 });
 it('accepts surrender through the civil capture path and preserves the unrelated war and siege',()=>{const {w,a,s,war}=civilSiege(),city=w.realm!.cities.jiankang;city.order=20;city.grain=0;const otherWar={id:war.id!+1,attacker:'west' as const,defender:'liang' as const,target:'xiangyang',score:0,started:0};w.realm!.wars!.push(otherWar);w.realm!.nextWarId=otherWar.id+1;
  const other:Siege={war:otherWar.id,site:'xiangyang',side:'attack',progress:38,last:w.day};w.realm!.sieges!.push(other);const population=city.population,loss=captureLossQuote(w,war,s.site,'attack','surrender').deaths,grain=a.supply,men=a.troops;
  expect(militaryActionReason(w,{type:'militaryAction',action:'surrender',army:a.id!,site:s.site})).toBe('');act(w,{type:'militaryAction',action:'surrender',army:a.id!,site:s.site});expect(city.controller).toBe(a.realm);expect(war.civil!.cities).toContain(s.site);expect(city.population).toBe(population-loss);expect(a.supply).toBe(grain);expect(a.troops).toBe(men);expect(w.realm!.sieges).toEqual([other]);expect(w.militaryAftermath!.siegeEvents!.at(-1)!.kind).toBe('surrender');
  const data=serializeWorld(w);expect(parseWorld(data).realm!.sieges).toEqual([other]);expect(()=>act(w,{type:'militaryAction',action:'surrender',army:a.id!,site:s.site})).toThrow();expect(serializeWorld(w)).toBe(data);
 });
 it('lets the loyalist side recapture the rebel base without changing its legal owner',()=>{const {w,a,war,base}=civilSiege();w.characterId='xiao-yan';w.people[0].id='xiao-yan';a.realm='liang';a.location=base;delete w.mobility!.armyCommanders![a.id!];w.realm!.cities[base].order=20;w.realm!.cities[base].grain=0;w.realm!.sieges=[{war:war.id!,site:base,side:'defend',progress:20,last:w.day}];
  expect(militaryActionReason(w,{type:'militaryAction',action:'surrender',army:a.id!,site:base})).toBe('');act(w,{type:'militaryAction',action:'surrender',army:a.id!,site:base});expect(w.realm!.cities[base].controller).toBe('liang');expect(w.realm!.cities[base].owner).toBe('liang');expect(war.civil!.cities).not.toContain(base);
 });
 it('rejects stale progress, the wrong side and retreating troops, and never quotes negative casualties',()=>{const {w,a,s}=civilSiege();s.progress=0;a.siege=90;expect(militaryActionReason(w,{type:'militaryAction',action:'surrender',army:a.id!,site:a.location})).toContain('10');s.side='defend';expect(assaultQuote(w,a)).toMatchObject({progress:0,success:false});s.side='attack';s.progress=100;w.realm!.cities.jiankang.fortification={level:0,due:null};expect(assaultQuote(w,a).losses).toBe(0);a.withdrawalUntil=w.day+1;expect(militaryActionReason(w,{type:'militaryAction',action:'assault',army:a.id!,site:a.location})).not.toBe('');
 });
 it('keeps supply, morale and real field-force restrictions in civil war',()=>{const {w,a}=civilSiege(),c={type:'militaryAction' as const,action:'assault' as const,army:a.id!,site:a.location};a.supply=0;expect(militaryActionReason(w,c)).toContain('随军粮不足');a.supply=1000;a.morale=20;expect(militaryActionReason(w,c)).toContain('士气');a.morale=100;w.realm!.armies.push({realm:'liang',location:a.location,troops:500,morale:80,supply:100,journey:null,siege:0});ensureArmyOrganization(w);expect(militaryActionReason(w,c)).toContain('野战军');
 });
});

describe('ordinary and civil conquest share personnel rules',()=>{
 it.each(['assault','surrender'] as const)('handles an ordinary %s using the same real presence, escape and war provenance',async action=>{
  const {allPeople}=await import('./personRegistry');
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');ensureWars(w);const war={id:w.realm!.nextWarId!++,attacker:'east' as const,defender:'liang' as const,target:'jiankang',started:w.day,score:0,captureLosses:[]};w.realm!.wars!.push(war);w.realm!.war=war;
  const a:Army={realm:'east',location:'jiankang',troops:3000,morale:100,supply:1000,journey:null,siege:100};w.realm!.armies.push(a);ensureArmyOrganization(w);
  for(const p of allPeople(w))if(p.id!=='xiao-yan'&&p.id!==w.characterId)w.mobility!.residences[p.id]={site:'jiangling',journey:null};w.mobility!.residences['xiao-yan']={site:'jiankang',journey:null};
  const city=w.realm!.cities.jiankang;city.population=10000;city.order=20;city.grain=0;city.fortification={level:0,due:null};w.realm!.sieges=[{war:war.id,site:'jiankang',side:'attack',progress:100,last:w.day}];w.life!.seed=1000;
  act(w,{type:'militaryAction',action,army:a.id!,site:'jiankang'});expect(city.controller).toBe('east');expect(city.owner).toBe('liang');
  if(action==='assault')expect(w.custody!.records['xiao-yan']).toMatchObject({war:war.id,side:'attack',cause:'city',army:a.id});else {expect(w.custody?.records['xiao-yan']).toBeUndefined();expect(w.mobility!.residences['xiao-yan'].journey).not.toBeNull();}
  expect(w.custody?.records['xiao-gang']).toBeUndefined();expect(parseWorld(serializeWorld(w)).realm!.cities.jiankang.controller).toBe('east');
 });
});

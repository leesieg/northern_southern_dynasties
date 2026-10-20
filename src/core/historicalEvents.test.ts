import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceHistorical,historicalPending,historicalReason,actHistorical,northConflict} from './historicalEvents';
import {actPact,pactReason,currentPactBreaches,advancePacts} from './allegiancePacts';
import {parseWorld,serializeWorld} from './save';
import {validHistorical} from './historicalValidation';
import {monthlyAgeRisk,mortalityRisk,recoveryChance} from './lifeState';
import {personInfluence} from './personalInfluence';
import {governingAuthority} from './government';
function start(id='hou-jing'){const w=newCampaignWorld(id,undefined,'sandbox');initializeHistoricalStart(w);return w;}
describe('historical Hou Jing factual chain',()=>{
 it.each(['personal','retain'] as const)('reconsiders Liang only when the rejected %s offer has different terms',terms=>{
  const w=start('guest-west'),army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms},'hou-jing');
  actPact(w,{type:'pact',action:'answer',id:w.allegiancePacts!.items[0].id,accept:false},'xiao-yan');
  w.day=200;w.life!.people['gao-huan'].illness={kind:'fever',severity:3,since:w.day};
  const troops=army.troops,coins=w.realm!.treasuries.liang.coins;
  advanceHistorical(w);
  expect(w.allegiancePacts!.items.at(-1)).toMatchObject({to:terms==='personal'?'liang':'west',terms:'retain',status:'pending',army:army.id});
  expect(w.allegiancePacts!.items[0].status).toBe('rejected');expect(w.realm!.armies.find(a=>a.id===army.id)!.troops).toBe(troops);expect(w.realm!.treasuries.liang.coins).toBe(coins);
  w.day++;advanceHistorical(w);expect(w.allegiancePacts!.items.at(-1)?.status).toBe('active');
  expect(w.realm!.armies.find(a=>a.id===army.id)!.troops).toBe(troops);expect(w.realm!.treasuries.liang.coins).toBe(coins-(terms==='personal'?100:0));
  expect(parseWorld(serializeWorld(w)).historical).toEqual(w.historical);
 });
 it('funds four real opening forces once, and does not backfill legacy saves',()=>{
  const w=newCampaignWorld('hou-jing',undefined,'sandbox'),population=Object.values(w.realm!.cities).reduce((n,c)=>n+c.population,0),grain=Object.values(w.realm!.cities).reduce((n,c)=>n+c.grain,0),coins=Object.values(w.realm!.treasuries).reduce((n,c)=>n+c.coins,0);
  initializeHistoricalStart(w);
  expect(w.realm!.armies).toHaveLength(4);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(2400);
  expect(Object.values(w.realm!.cities).reduce((n,c)=>n+c.population,0)).toBe(population-2400);
  expect(Object.values(w.realm!.cities).reduce((n,c)=>n+c.grain,0)+w.realm!.armies.reduce((n,a)=>n+a.supply,0)).toBe(grain);
  expect(Object.values(w.realm!.treasuries).reduce((n,c)=>n+c.coins,0)).toBe(coins-720);
  expect(personInfluence(w,'hou-jing')).toBe(80);expect(()=>initializeHistoricalStart(w)).toThrow();
  expect(parseWorld(serializeWorld(w))).toEqual(w);
  const old=newCampaignWorld('hou-jing',undefined,'sandbox');delete old.historical;const restored=parseWorld(serializeWorld(old));expect(restored.realm!.armies).toHaveLength(0);expect(restored.historical?.since).toBe(old.day);
 });
 it('rolls back a failed opening setup without partially consuming any resources',()=>{const w=newCampaignWorld('hou-jing',undefined,'sandbox');w.realm!.treasuries.liang.coins=0;const before=structuredClone(w);expect(()=>initializeHistoricalStart(w)).toThrow();expect(w).toEqual(before);});
 it('does not force a healthy protector to die and creates one revision for real severe illness',()=>{
  const w=start(),e=w.historical!.items[0];advanceHistorical(w);expect(e.phase).toBe('dormant');expect(northConflict(w,e)).toBe('');
  w.life!.people['gao-huan'].illness={kind:'fever',severity:3,since:0};advanceHistorical(w);expect(e.phase).toBe('north');expect(historicalPending(w)).toHaveLength(1);const state=structuredClone(w.historical);advanceHistorical(w);expect(w.historical).toEqual(state);
  const d=e.decision!,command={type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId:'seek',realm:'liang',terms:'retain'} as const;
  expect(historicalReason(w,command,'gao-huan')).not.toBe('');act(w,command);expect(w.historical!.items[0].phase).toBe('reception');expect(w.allegiancePacts?.items[0].status).toBe('pending');expect(()=>actHistorical(w,command)).toThrow();expect(parseWorld(serializeWorld(w)).historical).toEqual(w.historical);
 });
 it('counteroffers spend only proposal influence until both parties confirm, stale responses do nothing',()=>{
  const w=start('xiao-yan'),a=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:a.id,terms:'retain'},'hou-jing');const p=w.allegiancePacts!.items[0],coins=w.realm!.treasuries.liang.coins,troops=w.realm!.armies.map(a=>[a.id,a.realm,a.troops]);
  actPact(w,{type:'pact',action:'propose',id:p.id,terms:'personal'},'xiao-yan');expect(w.realm!.treasuries.liang.coins).toBe(coins);expect(w.realm!.armies.map(a=>[a.id,a.realm,a.troops])).toEqual(troops);expect(w.allegiancePacts!.items[0].terms).toBe('retain');
  const offer=w.allegiancePacts!.items[0].offer!,command={type:'pact',action:'respondOffer',id:p.id,revision:offer.revision,accept:true} as const;const before=structuredClone(w);expect(()=>actPact(w,{...command,revision:99},'hou-jing')).toThrow();expect(w).toEqual(before);
  actPact(w,command,'hou-jing');expect(w.allegiancePacts!.items[0].status).toBe('active');expect(w.allegiancePacts!.items[0].terms).toBe('personal');expect(w.realm!.treasuries.liang.coins).toBe(coins);expect(w.realm!.armies.map(a=>[a.id,a.realm,a.troops])).toEqual(troops);expect(()=>actPact(w,command,'hou-jing')).toThrow();
  expect(parseWorld(serializeWorld(w)).allegiancePacts).toEqual(w.allegiancePacts);
 });
 it('binds NPC receptions without changing the player, clears resolved breaches and reopens only on a fresh conflict',()=>{
  const w=start('xiao-yan'),actor=w.characterId!,a=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:a.id,terms:'retain'},'hou-jing');advanceHistorical(w);expect(historicalPending(w)).toHaveLength(1);
  const id=w.allegiancePacts!.items[0].id;expect(pactReason(w,{type:'pact',action:'answer',id,accept:true})).toBe('');actPact(w,{type:'pact',action:'answer',id,accept:true});advanceHistorical(w);expect(w.characterId).toBe(actor);
  let p=w.allegiancePacts!.items[0],army=w.realm!.armies.find(a=>a.id===p.army)!;army.arrears=1;advanceHistorical(w);expect(w.historical!.items[0].phase).toBe('dispute');army.arrears=0;p.breaches=['连续欠饷'];advanceHistorical(w);w.day=30;advanceHistorical(w);expect(w.historical!.items[0].status).toBe('active');expect(w.historical!.items[0].phase).toBe('settlement');w.historical!.items[0].appliedEffects.push('review:'+p.id);advanceHistorical(w);expect(w.historical!.items[0].status).toBe('resolved');expect(currentPactBreaches(w,p)).toEqual([]);advancePacts(w);expect(w.realm!.wars?.some(v=>v.civil?.claimant==='hou-jing')).toBeFalsy();
  army=w.realm!.armies.find(a=>a.id===p.army)!;army.arrears=1;advanceHistorical(w);expect(w.historical!.items[0].status).toBe('active');expect(w.historical!.items[0].phase).toBe('dispute');expect(validHistorical(w)).toBe(true);
 });
 it('rejects malformed event state, forgery and duplicate decisions',()=>{const w=start();w.historical!.items[0].revision=NaN;expect(validHistorical(w)).toBe(false);expect(()=>serializeWorld(w)).toThrow();});
 it('routes serious-illness discussions to the real chief and cancels them after recovery',()=>{const w=start('gao-huan');expect(governingAuthority(w,'east')).toBe('gao-huan');w.life!.people['gao-huan'].illness={kind:'fever',severity:3,since:0};advanceHistorical(w);expect(historicalPending(w)[0]?.title).toBe('病榻议事');w.life!.people['gao-huan'].illness=null;advanceHistorical(w);expect(historicalPending(w)).toEqual([]);});
});
describe('separate aging and illness hazards',()=>{
 it.each([[16,0],[39,0],[40,0],[49,0],[50,0],[59,0],[60,.08],[70,.18],[80,.35],[90,.55],[120,.55]])('converts age %s annual risk exactly', (age,risk)=>expect(1-(1-monthlyAgeRisk(age))**12).toBeCloseTo(risk,12));
 it('care changes illness only, combines independent risks and never guarantees a cure',()=>{const untreated=mortalityRisk(80,15,3),treated=mortalityRisk(80,15,3,true);expect(treated.aging).toBe(untreated.aging);expect(treated.illness).toBeCloseTo(untreated.illness*.6);expect(treated.total).toBeCloseTo(1-(1-treated.aging)*(1-treated.illness));expect(recoveryChance('cold',1,10000,true,true)).toBe(.95);expect(recoveryChance('wasting',3,10000)).toBeCloseTo(.38*.35);expect(recoveryChance('wasting',3,10000)).toBe(recoveryChance('wasting',3,0));});
});

it('carries a real rebellion through siege and captured court without automatic annexation',async()=>{
 const {changeRelationOpinion}=await import('./relationships'),{civilWar,civilCityCapture,advanceCivilPolitics}=await import('./civilWars');
 const w=start(),armyId=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!.id!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:armyId,terms:'retain'});const pactId=w.allegiancePacts!.items[0].id;
 actPact(w,{type:'pact',action:'answer',id:pactId,accept:true},'xiao-yan');
 // A legal local appointment and completed journey are fixture facts, never event rewards.
 (await import('./treasury')).routeGrant(w,'shouchun',200,'测试：合法拨款');w.realm!.cities.shouchun.governor='hou-jing';w.realm!.cities.shouchun.order=70;w.people[0].location='shouchun';w.people[0].coins=200;w.mobility!.residences['hou-jing']={site:'shouchun',journey:null};
 const a=w.realm!.armies.find(a=>a.id===armyId)!;a.location='shouchun';a.arrears=80;changeRelationOpinion(w,'hou-jing','xiao-yan',-60);
 advanceHistorical(w);w.day=30;advanceHistorical(w);const e=w.historical!.items[0],d=e.decision!;expect(d.kind).toBe('crisis');const command={type:'historicalEvent',instanceId:e.id,decisionId:d.id,revision:d.revision,optionId:'rise'} as const;expect(historicalReason(w,command)).toBe('');act(w,command);
 const war=civilWar(w,'liang')!;expect(w.realm!.cities.shouchun).toMatchObject({owner:'liang',controller:war.attacker,governor:'hou-jing'});expect(war.civil!.arrangement?.goal).toBe('executive');expect(w.historical!.items[0].phase).toBe('rebellion');expect(parseWorld(serializeWorld(w))).toEqual(w);
 w.realm!.sieges=[{war:war.id!,site:war.target,side:'attack',progress:1,last:w.day}];advanceHistorical(w);expect(w.historical!.items[0].phase).toBe('siege');
 const rebel=w.realm!.armies.find(a=>a.id===armyId)!;rebel.location=war.target;w.mobility!.residences['xiao-yan']={site:war.target,journey:null};w.life!.seed=1000;civilCityCapture(w,war,war.target,'attack',rebel);advanceHistorical(w);expect(w.historical!.items[0].phase).toBe('court');expect(w.realm!.cities.jiangling.owner).toBe('liang');expect(w.custody?.records['xiao-yan']).toBeDefined();advanceCivilPolitics(w);expect(civilWar(w,'liang')).toBeDefined();expect(validHistorical(w)).toBe(true);
});
it('notifies only on dangerous health transitions and keeps high-age succession actionable',async()=>{
 const {pauseSnapshot,pauseEvents}=await import('./pauseEvents'),{seniorSuccessionAttention}=await import('./healthAttention');const w=newCampaignWorld('xiao-yan',undefined,'sandbox');const before=pauseSnapshot(w);w.life!.people['xiao-yan'].illness={kind:'fever',severity:3,since:w.day};w.life!.people['xiao-yan'].health=24;expect(pauseEvents(before,w).filter(p=>p.kind==='health')).toHaveLength(2);expect(pauseEvents(pauseSnapshot(w),w).filter(p=>p.kind==='health')).toHaveLength(0);expect(seniorSuccessionAttention(w)).toBeTruthy();
});
async function warFixture(){
 const {civilWar,actCivilWar}=await import('./civilWars'),{routeGrant}=await import('./treasury');const w=start();const a=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
 routeGrant(w,'yingchuan',200,'测试拨款');w.realm!.cities.yingchuan.governor='hou-jing';actCivilWar(w,{type:'civilWar',action:'rise',name:'',arrangement:{goal:'executive',sponsor:'hou-jing',beneficiary:'yuan-shanjian',executive:'hou-jing',name:''}});return {w,war:civilWar(w,'east')!,a};
}
it('ends a rebellion when its claimant changes allegiance',async()=>{const {w,war}=await warFixture(),{advanceCivilPolitics}=await import('./civilWars');w.relationships!.allegiances??={};w.relationships!.allegiances['hou-jing']={realm:'liang',from:'east',since:w.day,army:0,source:'pact'};advanceCivilPolitics(w);expect(w.realm!.wars?.some(v=>v.id===war.id)).toBe(false);});
it('does not keep an NPC rebellion alive without troops and its base',async()=>{const {w,war}=await warFixture(),{advanceCivilPolitics,warArmySide}=await import('./civilWars');w.characterId='xiao-yan';w.realm!.armies=w.realm!.armies.filter(a=>warArmySide(w,war,a)!=='attack');w.realm!.cities[war.civil!.base].controller='east';advanceCivilPolitics(w);expect(w.realm!.wars?.some(v=>v.id===war.id)).toBe(false);});
it('vacates an invalid loyalist without deleting loyal troops, then fills a real replacement',async()=>{const {w,war}=await warFixture(),{advanceCivilPolitics}=await import('./civilWars');for(const id of w.realm!.governments!.realms.east.executives)w.life!.people[id].death={day:w.day,cause:'illness'};for(const city of Object.values(w.realm!.cities))if(city.owner==='east'&&city.governor!=='hou-jing')city.governor=null;advanceCivilPolitics(w);expect(war.civil!.loyalist).toBeNull();w.realm!.cities.ye.governor='gao-yang';advanceCivilPolitics(w);expect(war.civil!.loyalist).toBe('gao-yang');});
it('uses the pre-course risk once when this month worsens an illness',async()=>{
 const {advanceLife}=await import('./life'),{nextMonthStart}=await import('./calendar');
 // Use an unmodified subject: Gao Huan now has a genuine pre-existing strain risk.
 const w=newCampaignWorld('gao-cheng',undefined,'sandbox'),p=w.life!.people['gao-cheng'];p.health=24;p.illness={kind:'fever',since:0,severity:2};w.life!.people={'gao-cheng':p,...w.life!.people};
 const next=(n:number)=>(Math.imul(n,1664525)+1013904223)>>>0;let seed=0;
 for(;seed<65536;seed++){const a=next(seed),b=next(a),c=next(b);if(a/4294967296>.005&&a/4294967296<.025&&b/4294967296>.6&&c/4294967296<.08)break;}
 expect(seed).toBeLessThan(65536);w.life!.seed=seed;w.day=nextMonthStart(w.day,w.scriptId);advanceLife(w);expect(p.death).toBeNull();expect(p.illness?.severity).toBe(3);const state=structuredClone(w);advanceLife(w);expect(w).toEqual(state);
});
it('rechecks pending armed counteroffers against the real budget without partially accepting',()=>{const w=start('xiao-yan'),a=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;actPact(w,{type:'pact',action:'request',realm:'liang',army:a.id,terms:'retain'},'hou-jing');const id=w.allegiancePacts!.items[0].id;actPact(w,{type:'pact',action:'propose',id,terms:'reform'});const offer=w.allegiancePacts!.items[0].offer!,command={type:'pact',action:'respondOffer',id,revision:offer.revision,accept:true} as const;w.realm!.treasuries.liang.coins=99;const before=structuredClone(w);expect(pactReason(w,command,'hou-jing')).toContain('100');expect(()=>actPact(w,command,'hou-jing')).toThrow();expect(w).toEqual(before);});

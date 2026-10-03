import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {fortificationLevel,cityOperatingExpense,siegeRequirement,advanceRealm} from './realm';
import {ensureFortifications,fortificationQuote,startFortification,advanceFortificationAI} from './fortifications';
import {fiscalPath,localBalance} from './treasury';
import {governingAuthority} from './government';
import {civilianFood} from './population';
import {actPolity} from './politySeparation';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {nextMonthStart} from './calendar';
import {snapshotWarValues} from './warScoring';
import {roads} from '../data/scenario';
import {ensureWars} from './wars';

const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
function fund(w:ReturnType<typeof start>,site:string,coins=1000){w.realm!.fiscal!.balances[fiscalPath(w,site)[0]]=coins;w.realm!.cities[site].grain=civilianFood(w,site)*20;}
describe('capital facilities and autonomous fortification',()=>{
 it('stores opening capital defence as a real level-one facility, retains Luoyang and leaves ordinary cities at zero',()=>{
  const w=start();for(const id of ['jiankang','ye','changan','luoyang'])expect(w.realm!.cities[id].fortification).toEqual({level:1,due:null});
  expect(w.realm!.cities.jingkou.fortification).toEqual({level:0,due:null});expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('materializes missing old-save facilities once without minting money or restoring recorded damage',()=>{
  const w=start();delete w.realm!.cities.ye.fortification;w.realm!.cities.jiankang.fortification={level:0,due:null};
  w.realm!.cities.jingkou.fortification={level:0,due:30};const treasuries=structuredClone(w.realm!.treasuries),fiscal=structuredClone(w.realm!.fiscal);
  const restored=parseWorld(serializeWorld(w));expect(restored.realm!.cities.ye.fortification).toEqual({level:1,due:null});
  expect(restored.realm!.cities.jiankang.fortification).toEqual({level:0,due:null});expect(restored.realm!.cities.jingkou.fortification).toEqual({level:0,due:30});
  expect(restored.realm!.treasuries).toEqual(treasuries);expect(restored.realm!.fiscal).toEqual(fiscal);
  const snapshot=structuredClone(restored);ensureFortifications(restored);expect(restored).toEqual(snapshot);expect(parseWorld(serializeWorld(restored))).toEqual(restored);
 });
 it('establishes the new capital once, retains the old walls and applies current-capital upkeep and siege rules',()=>{
  const w=start(),oldExpense=cityOperatingExpense(w,'jiankang'),newExpense=cityOperatingExpense(w,'jingkou'),a={realm:'liang' as const,location:'jingkou',troops:600,morale:80,supply:100,journey:null,siege:0},oldRequirement=siegeRequirement(w,a);
  w.people[0].location='jingkou';const cash=w.realm!.treasuries.liang.coins;actPolity(w,{type:'polity',action:'relocate',site:'jingkou'});
  expect(fortificationLevel(w,'jingkou')).toBe(1);expect(fortificationLevel(w,'jiankang')).toBe(1);
  expect(cityOperatingExpense(w,'jingkou')).toBe(newExpense);expect(cityOperatingExpense(w,'jiankang')).toBe(oldExpense+2);
  expect(siegeRequirement(w,a)).toBeGreaterThan(oldRequirement);expect(w.realm!.treasuries.liang.coins).toBe(cash-100);
  w.realm!.cities.jingkou.fortification={level:0,due:null};ensureFortifications(w);expect(fortificationLevel(w,'jingkou')).toBe(0);validateWorld(w);
 });
 it('preserves a paid level-one construction order when the court relocates there',()=>{
  const w=start();fund(w,'jingkou');startFortification(w,'jingkou');const before=structuredClone(w.realm!.cities.jingkou.fortification),cash=localBalance(w,'jingkou');
  w.people[0].location='jingkou';actPolity(w,{type:'polity',action:'relocate',site:'jingkou'});
  expect(w.realm!.cities.jingkou.fortification).toEqual(before);expect(localBalance(w,'jingkou')).toBe(cash);
  w.day=30;advanceRealm(w);expect(fortificationLevel(w,'jingkou')).toBe(1);expect(w.realm!.cities.jingkou.fortification!.due).toBeNull();
 });
 it('uses the shared price, duration and guarded local payment for NPC capital upgrades',()=>{
  const w=start(),actor=governingAuthority(w,'west')!;fund(w,'changan');const quote=fortificationQuote(w,'changan',actor),before=localBalance(w,'changan'),player=structuredClone(w.people[0]),treasuries=structuredClone(w.realm!.treasuries);
  expect(quote).toEqual({level:1,cost:160,days:60,reason:''});advanceFortificationAI(w);
  expect(w.realm!.cities.changan.fortification).toEqual({level:1,due:60});expect(localBalance(w,'changan')).toBe(before-160);
  expect(w.realm!.treasuries).toEqual(treasuries);expect(w.people[0]).toEqual(player);expect(w.characterId).toBe('xiao-yan');
  const after=structuredClone(w);expect(()=>startFortification(w,'changan',actor)).toThrow('正在修筑');expect(w).toEqual(after);validateWorld(w);
 });
 it('protects player decisions, occupied and starving cities, insufficient reserves and the level cap',()=>{
  const w=start();fund(w,'jiankang');fund(w,'changan',160);fund(w,'ye');w.realm!.cities.ye.grain=0;
  advanceFortificationAI(w);for(const id of ['jiankang','changan','ye'])expect(w.realm!.cities[id].fortification!.due).toBeNull();
  fund(w,'changan');w.realm!.cities.changan.controller='east';advanceFortificationAI(w);expect(w.realm!.cities.changan.fortification!.due).toBeNull();
  w.realm!.cities.changan.controller='west';w.realm!.cities.changan.fortification={level:3,due:null};advanceFortificationAI(w);expect(w.realm!.cities.changan.fortification).toEqual({level:3,due:null});
 });
 it('prioritizes a wartime capital and exposed border with paid upgrades rather than instant defence',()=>{
  const w=start(),s=w.realm!;for(const key of Object.keys(s.fiscal!.balances))s.fiscal!.balances[key]=0;
  const edge=roads.find(e=>!e.legacyOnly&&((s.cities[e.from].owner==='west'&&s.cities[e.to].owner==='east')||(s.cities[e.to].owner==='west'&&s.cities[e.from].owner==='east')))!;
  expect(edge).toBeDefined();const border=s.cities[edge.from].owner==='east'?edge.from:edge.to;expect(border).not.toBe('ye');
  s.wars=[{attacker:'east',defender:'west',target:'changan',started:w.day,score:0}];ensureWars(w);
  s.cities.ye.fortification={level:2,due:null};s.cities[border].fortification={level:1,due:null};fund(w,'ye');fund(w,border);
  const cash=localBalance(w,'ye'),borderCash=localBalance(w,border);advanceFortificationAI(w);
  expect(s.cities.ye.fortification).toEqual({level:2,due:w.day+90});expect(localBalance(w,'ye')).toBe(cash-240);
  expect(s.cities[border].fortification).toEqual({level:1,due:w.day+60});expect(localBalance(w,border)).toBe(borderCash-160);validateWorld(w);
 });
 it('limits monthly starts and existing projects, and never settles the same month twice',()=>{
  const w=start();for(const [id,c] of Object.entries(w.realm!.cities))if(c.owner==='west')fund(w,id);
  w.day=nextMonthStart(w.day+1,w.scriptId);advanceRealm(w);const building=Object.values(w.realm!.cities).filter(c=>c.owner==='west'&&c.fortification?.due!=null);
  expect(building.length).toBeGreaterThan(0);expect(building.length).toBeLessThanOrEqual(2);
  const forts=Object.fromEntries(Object.entries(w.realm!.cities).map(([id,c])=>[id,structuredClone(c.fortification)])),fiscal=structuredClone(w.realm!.fiscal);
  advanceRealm(w);expect(Object.fromEntries(Object.entries(w.realm!.cities).map(([id,c])=>[id,c.fortification]))).toEqual(forts);expect(w.realm!.fiscal).toEqual(fiscal);
  // Three existing projects exhaust the construction concurrency budget.
  for(const id of ['changan','tianshui','jincheng'])w.realm!.cities[id].fortification={level:1,due:w.day+60};
  const snapshot=structuredClone(w);advanceFortificationAI(w);expect(w).toEqual(snapshot);
 });
 it('repairs capital damage through the paid shared action rather than free daily regeneration',()=>{
  const w=start();w.realm!.cities.jiankang.fortification={level:0,due:null};fund(w,'jiankang');const coins=localBalance(w,'jiankang');
  act(w,{type:'realm',action:'fortify',site:'jiankang'});expect(localBalance(w,'jiankang')).toBe(coins-80);expect(w.realm!.cities.jiankang.fortification).toEqual({level:0,due:30});
 });
 it('uses the same facility level and current capital in war values and freezes an existing snapshot',()=>{
  const w=start();w.people[0].location='jingkou';actPolity(w,{type:'polity',action:'relocate',site:'jingkou'});
  const war={attacker:'liang' as const,defender:'east' as const,target:'pengcheng',started:0,score:0};const values=snapshotWarValues(w,war);
  const c=w.realm!.cities.jingkou;expect(values.jingkou).toBe(Math.min(15,3+Math.floor(c.population/20000)+Math.floor(c.prosperity/25)+2+3));
  c.fortification!.level=3;expect((war as typeof war&{values:Record<string,number>}).values.jingkou).toBe(values.jingkou);
 });
});

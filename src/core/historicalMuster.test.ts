import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {advanceHistorical} from './historicalEvents';
import {historicalMusterQuote} from './historicalMuster';
import {accountWallet} from './obligations';
import {die} from './life';

function start(){const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');initializeHistoricalStart(w);return w;}
function unarmed(w:ReturnType<typeof start>){w.realm!.armies=w.realm!.armies.filter(a=>w.mobility?.armyCommanders?.[a.id!]!=='hou-jing');}
const population=(w:ReturnType<typeof start>)=>Object.values(w.realm!.cities).reduce((n,c)=>n+c.population,0);

describe('Hou Jing old-follower rally',()=>{
 it('gathers real Henan recruits once and trains them',()=>{
  const w=start();unarmed(w);
  const before=population(w),cash=accountWallet(w,'person:hou-jing')!.read(),grain=w.realm!.treasuries.east.grain;
  die(w,'gao-huan','illness');
  advanceHistorical(w);
  const e=w.historical!.items[0];
  expect(e.appliedEffects).toContain('old-followers');
  const army=w.realm!.armies.find(a=>a.owner==='hou-jing')!;
  expect(army.troops).toBeGreaterThanOrEqual(300);
  expect(army.troops).toBeLessThanOrEqual(800);
  expect(army.trainingUntil).toBe(w.day+30);
  expect(army.regiments!.every(u=>u.loyalTo==='hou-jing')).toBe(true);
  expect(army.supply).toBeGreaterThan(0);
  expect(w.realm!.treasuries.east.grain).toBeLessThan(grain);
  expect(before-population(w)).toBe(army.troops);
  expect(accountWallet(w,'person:hou-jing')!.read()).toBeGreaterThanOrEqual(0);
  expect(accountWallet(w,'person:hou-jing')!.read()).toBeLessThanOrEqual(cash+800*60);
  const count=w.realm!.armies.filter(a=>a.owner==='hou-jing').length;
  advanceHistorical(w);
  expect(w.realm!.armies.filter(a=>a.owner==='hou-jing')).toHaveLength(count);
 });

 it('refuses to rally outside the Henan old-follower counties',()=>{
  const w=start();unarmed(w);
  const e=w.historical!.items[0];e.phase='north';e.status='active';e.lastConflict='fixture';
  expect(historicalMusterQuote(w,e,'ye').reason).toContain('河南');
 });
});

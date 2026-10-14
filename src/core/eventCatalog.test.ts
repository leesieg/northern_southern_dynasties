import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {eventCatalog,filterCatalog} from './eventCatalog';
import {advanceHistorical} from './historicalEvents';
import {actPact} from './allegiancePacts';
import {actGovernment,governmentOf,governmentReason} from './government';
import {actPower,applyPowerArrangement} from './powerPolitics';
import {serializeWorld,parseWorld} from './save';
import {successionIds,reformIds} from '../data/governments';
const start=(id='hou-jing')=>{const w=newCampaignWorld(id,undefined,'sandbox');initializeHistoricalStart(w);return w;};
const row=(w:ReturnType<typeof start>,id:string)=>eventCatalog(w).find(e=>e.id===id)!;

describe('read-only historical event catalog',()=>{
 it('lists every current definition once including dormant entries without changing the world',()=>{
  const w=start(),before=structuredClone(w),entries=eventCatalog(w);
  expect(entries).toHaveLength(1+successionIds.length+reformIds.length);expect(new Set(entries.map(e=>e.id)).size).toBe(entries.length);
  expect(entries[0].status).toBe('dormant');expect(row(w,'reform:west-register').status).toBe('initial');
  filterCatalog(entries,'高洋','all',w);expect(w).toEqual(before);
 });
 it('searches people and original realms and honors the status filter',()=>{
  const w=start(),entries=eventCatalog(w);
  expect(filterCatalog(entries,'高洋','all',w).map(e=>e.id)).toEqual(expect.arrayContaining(['succession:east-regency','succession:qi-accession']));
  expect(filterCatalog(entries,'西魏','initial',w)).toHaveLength(2);
  expect(filterCatalog(entries,'不存在','all',w)).toEqual([]);
 });
 it('does not invent instances in legacy worlds and marks other modes as inapplicable',()=>{
  const w=start();delete w.historical;const before=structuredClone(w);expect(row(w,'hou-jing').status).toBe('dormant');expect(w).toEqual(before);
  delete w.mode;expect(eventCatalog(w).every(e=>e.status==='unavailable')).toBe(true);
 });
 it('shows the real decision, pact and deadline only to entitled readers',()=>{
  const w=start('xiao-yan'),army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');advanceHistorical(w);
  const known=row(w,'hou-jing');expect(known.status).toBe('active');expect(known.pending).toBe(true);expect(known.deadline?.day).toBe(w.allegiancePacts!.items[0].due);expect(known.facts[0].text).toContain('部曲');expect(known.people.slice(0,2)).toEqual(['hou-jing','xiao-yan']);
  w.characterId='yuwen-tai';const hidden=row(w,'hou-jing');expect(hidden.status).toBe('unknown');expect(hidden.facts).toEqual([]);expect(hidden.deadline).toBeUndefined();expect(hidden.site).toBeUndefined();expect(hidden.action).toBeUndefined();expect(hidden.pending).toBe(false);expect(hidden.people).not.toContain('xiao-yan');
 });
 it('old public news cannot expose a later secret chapter or result',()=>{
  const w=start('yuwen-tai'),e=w.historical!.items[0];e.phase='dispute';e.handlingDue=30;e.milestones=[{key:'public',day:0,text:'公开旧闻',public:true,people:[],realms:[]},{key:'secret',day:0,text:'未公开结果',public:false,people:['hou-jing'],realms:['east']}];
  const entry=row(w,'hou-jing');expect(entry.status).toBe('unknown');expect(entry.summary).toBe('公开旧闻');expect(entry.chapter).not.toContain('疑云');expect(entry.history).toHaveLength(1);expect(entry.deadline).toBeUndefined();
 });
 it('reflects completion, cancellation and reopening from authoritative event state',()=>{
  const w=start(),e=w.historical!.items[0];e.status='resolved';e.result='交涉平息';expect(row(w,'hou-jing').status).toBe('resolved');expect(row(w,'hou-jing').summary).toBe('交涉平息');
  e.status='cancelled';expect(row(w,'hou-jing').status).toBe('cancelled');e.status='active';e.phase='dispute';delete e.result;expect(row(w,'hou-jing').status).toBe('active');
 });
 it('uses actual reform eligibility and task progress, retaining cancellation records',()=>{
  const w=start('gao-huan'),g=governmentOf(w,'east')!;w.realm!.treasuries.east.coins=1000;w.realm!.influence=100;g.support=80;g.legitimacy=80;
  expect(governmentReason(w,{type:'government',action:'law',law:'east-assessment'})).toBe('');expect(row(w,'reform:east-assessment').status).toBe('available');
  actGovernment(w,{type:'government',action:'law',law:'east-assessment'});g.task!.progress=17;
  const active=row(w,'reform:east-assessment');expect(active.status).toBe('active');expect(active.progress?.value).toBe(17);expect(active.progress?.max).toBe(120);expect(active.deadline).toBeUndefined();
  actGovernment(w,{type:'government',action:'cancel'});expect(row(w,'reform:east-assessment').status).toBe('cancelled');expect(row(w,'reform:east-assessment').history.at(-1)?.text).toContain('撤回');
 });
 it('does not equate a ruler or a matching country name to a completed historical arrangement',()=>{
  const w=start('gao-huan'),g=governmentOf(w,'east')!;g.ruler='gao-yang';g.executives=['gao-yang'];expect(row(w,'succession:qi-accession').status).not.toBe('resolved');
  g.stages=['qi-accession'];expect(row(w,'succession:qi-accession').status).toBe('resolved');expect(row(w,'succession:qi-accession').history).toEqual([]);
 });
 it('preserves a real historical arrangement after save/load without adding catalog state',()=>{
  const w=start('gao-huan');w.day=Math.round((Date.UTC(549,0,1)-Date.UTC(546,0,1))/86400000);if(w.economy)w.economy.lastDay=w.day;w.realm!.personalInfluence!['gao-huan']=100;
  actPower(w,{type:'power',action:'propose',goal:'executive',beneficiary:'yuan-shanjian',executive:'gao-yang',sourceStage:'east-regency'});
  expect(row(w,'succession:east-regency').status).toBe('active');applyPowerArrangement(w,'east',w.politics!.proposals.east!);
  expect(row(w,'succession:east-regency').status).toBe('resolved');const restored=parseWorld(serializeWorld(w));expect(row(restored,'succession:east-regency').status).toBe('resolved');
 });
 it('conceals private political preparations from outsiders without pretending they have not begun',()=>{
  const w=start('gao-huan');w.day=Math.round((Date.UTC(549,0,1)-Date.UTC(546,0,1))/86400000);if(w.economy)w.economy.lastDay=w.day;w.realm!.personalInfluence!['gao-huan']=100;
  actPower(w,{type:'power',action:'propose',goal:'executive',beneficiary:'yuan-shanjian',executive:'gao-yang',sourceStage:'east-regency'});
  w.characterId='yuwen-tai';const hidden=row(w,'succession:east-regency');expect(hidden.status).toBe('unknown');expect(hidden.history).toEqual([]);expect(hidden.action).toBeUndefined();
 });
 it('keeps the historical succession direction while displaying the current treasury owner',()=>{
  const w=start('gao-huan'),g=governmentOf(w,'east')!;g.dynasty='qi';g.stages=['qi-accession'];
  expect(row(w,'succession:qi-accession').chapter).toBe('东魏 → 齐');
  expect(row(w,'reform:east-assessment').facts.find(f=>f.label==='启动成本')?.text).toMatch(/^齐中央公款/);
 });
 it('does not leave a blank executive label when nobody is serving',()=>{
  const w=start('gao-huan');governmentOf(w,'east')!.executives=[];
  expect(row(w,'succession:east-regency').facts.find(f=>f.label==='当前执政')?.text).toBe('当前无人履职');
 });
});

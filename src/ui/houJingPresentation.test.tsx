import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newCampaignWorld} from '../core/world';
import {initializeHistoricalStart} from '../core/historicalStart';
import {actPact} from '../core/allegiancePacts';
import {advanceHistorical} from '../core/historicalEvents';
import {routeGrant} from '../core/treasury';
import {warArmySide,warCitySide,settleCivilWar,actCivilWar} from '../core/civilWars';
import {HouJingDesk} from './HouJingDesk';
import {HouJingResponses} from './HouJingResponses';
import {WarDetails} from './WarDetails';
import {civilPromiseOptions,civilCommitments} from '../core/civilPromises';
import {actCivilPolitics,civilFixedSide,civilStanceQuote} from '../core/civilMobilization';
import {awardInfluence} from '../core/personalInfluence';
import {houJingPresentation,houJingParty,houJingMembers} from './houJingPresentation';

const start=(actor='hou-jing')=>{const w=newCampaignWorld(actor,undefined,'sandbox');initializeHistoricalStart(w);return w;};
function rebellion(){
 const w=start(),army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');
 actPact(w,{type:'pact',action:'answer',id:w.allegiancePacts!.items[0].id,accept:true},'xiao-yan');advanceHistorical(w);
 const force=w.realm!.armies.find(a=>a.id===w.allegiancePacts!.items[0].army)!;
 force.location='shouchun';force.journey=null;w.people[0].location='shouchun';w.mobility!.residences['hou-jing']={site:'shouchun',journey:null};w.realm!.cities.shouchun.governor='hou-jing';routeGrant(w,'shouchun',200,'测试：合法基地拨款');
 actCivilWar(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'hou-jing',beneficiary:'xiao-yan',executive:'hou-jing',name:''}},'hou-jing');advanceHistorical(w);
 return w;
}
const noop=()=>{},send=async()=>true;
const navigation={onPerson:noop,onSite:noop,onWar:noop,onCourt:noop,onArmy:noop};

describe('Hou Jing presentation boundaries (no browser)',()=>{
 it('reads a dormant event without creating instances, deadlines or a war',()=>{
  const w=start(),before=structuredClone(w),v=houJingPresentation(w);
  expect(v.war).toBeUndefined();expect(v.deadline).toBeUndefined();expect(v.document).toBeUndefined();expect(v.waiting.join()).toContain('公开动向');expect(w).toEqual(before);
 });
 it('preserves the catalog visibility boundary after older public news',()=>{
  const w=start('yuwen-tai'),e=w.historical!.items[0];e.phase='dispute';e.site='shouchun';e.handlingDue=42;e.warId=11;
  e.milestones=[{key:'old',day:0,text:'已知旧闻',public:true,people:[],realms:[]},{key:'private',day:0,text:'秘密交涉',public:false,people:['hou-jing'],realms:['liang']}];
  const before=structuredClone(w),v=houJingPresentation(w);
  expect(v.entry.status).toBe('unknown');expect(v.entry.summary).toBe('已知旧闻');expect(v.event).toBeUndefined();expect(v.war).toBeUndefined();expect(v.document).toBeUndefined();expect(v.deadline).toBeUndefined();expect(v.entry.site).toBeUndefined();expect(w).toEqual(before);
  const html=renderToStaticMarkup(<HouJingDesk world={w} view={v} pending={false} send={send} navigation={navigation} onLocate={noop} onClose={noop} onCatalog={noop}/>);
  expect(html).not.toContain('秘密交涉');expect(html).not.toContain('寿春');expect(html).not.toContain('办理待决文书');
 });
 it('shows the real reception deadline only to the recipient authority',()=>{
  const w=start('xiao-yan'),army=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
  actPact(w,{type:'pact',action:'request',realm:'liang',army:army.id,terms:'retain'},'hou-jing');advanceHistorical(w);
  const before=structuredClone(w),v=houJingPresentation(w);
  expect(v.deadline?.day).toBe(w.allegiancePacts!.items[0].due);expect(v.waiting.join()).toContain('待本人');expect(v.document?.id).toBe(w.historical!.items[0].id);expect(w).toEqual(before);
 });
 it('uses actual war, political target and capital control instead of preview numbers',()=>{
  const w=rebellion(),v=houJingPresentation(w),war=v.war!,before=structuredClone(w);
  expect(war.civil?.claimant).toBe('hou-jing');expect(v.goal).toBe('更换执政');expect(v.politicalTarget).toContain('保留君主');expect(v.waiting.join()).toContain('尚未形成围城');
  const html=renderToStaticMarkup(<HouJingDesk world={w} view={v} pending={false} send={send} navigation={navigation} onLocate={noop} onClose={noop} onCatalog={noop}/>);
  expect(html).toContain('非战争完成度');expect(html).not.toContain('24,600');expect(html).not.toContain('内战已持续 164');expect(html).not.toContain('已被侯景占据');expect(w).toEqual(before);
  w.realm!.cities[war.target].controller=war.attacker;expect(houJingPresentation(w).waiting[0]).toContain('已由起兵方控制');
  w.realm!.cities[war.target].controller='west';expect(houJingPresentation(w).waiting[0]).toContain('第三方控制');
 });
 it('deduplicates party assets and conceals foreign troop figures',()=>{
  const w=rebellion(),war=houJingPresentation(w).war!;w.characterId='xiao-yan';
  const before=structuredClone(w),loyal=houJingParty(w,war,'defend');
  expect(loyal.cities).toEqual(Object.keys(w.realm!.cities).filter(id=>warCitySide(w,war,id)==='defend'));
  expect(new Set(loyal.cities).size).toBe(loyal.cities.length);expect(loyal.troops).toBe(w.realm!.armies.filter(a=>warArmySide(w,war,a)==='defend').reduce((n,a)=>n+a.troops,0)*10);
  expect(houJingParty(w,war,'attack').troops).toBeNull();expect(w).toEqual(before);
 });
 it('uses the player response deadline and does not infer participation from allegiance',()=>{
  const w=rebellion(),war=houJingPresentation(w).war!,id=Object.entries(war.civil!.mobilization!.members).find(([,m])=>m.choice==='pending'&&!m.unavailable)![0];w.characterId=id;const v=houJingPresentation(w),m=v.war!.civil!.mobilization!.members[id];
  expect(m.choice).toBe('pending');expect(v.stanceDue).toBe(m.due);expect(v.deadline?.label).toBe('本人表态期限');expect(v.waiting.join()).toContain('待本人选择');
  const before=structuredClone(w),rows=houJingMembers(w,v.war!),html=renderToStaticMarkup(<HouJingResponses world={w} war={v.war!} pending={false} send={send} onPerson={noop} onLocate={noop}/>);
  expect(rows.find(r=>r.id===id)?.stance).toBe('待表态');expect(html).toContain('尚未表态');expect(html).toContain('调整本人立场');expect(w).toEqual(before);
 });
 it('does not expose other people’s private bargains or grant a spectator authority',()=>{
  const w=rebellion();let war=houJingPresentation(w).war!;w.characterId='xiao-yan';awardInfluence(w,'xiao-yan',20);
  const target=Object.keys(war.civil!.mobilization!.members).find(id=>!civilFixedSide(w,war,id)&&civilPromiseOptions(w,war,'xiao-yan',id).length)!;
  const offer=civilPromiseOptions(w,war,'xiao-yan',target)[0];expect(offer).toBeDefined();
  actCivilPolitics(w,{type:'civilWar',action:'pledge',war:war.id!,person:target,side:'loyal',target:offer.target,mode:offer.mode});
  war=houJingPresentation(w).war!;war.civil!.mobilization!.members[target].choice='watch';w.characterId='yuwen-tai';const before=structuredClone(w);
  expect(civilCommitments(w).some(q=>q.person===target)).toBe(true);
  const html=renderToStaticMarkup(<HouJingResponses world={w} war={war} pending={false} send={send} onPerson={noop} onLocate={noop}/>);
  expect(html).toContain('disabled');expect(html).not.toContain('与本人有关的约定');expect(w).toEqual(before);
 });
 it('keeps ordinary war navigation intact while embedding Hou Jing’s tactical content',()=>{
  const w=rebellion(),war=houJingPresentation(w).war!,before=structuredClone(w);
  const ordinary=renderToStaticMarkup(<WarDetails world={w} war={war} pending={false} send={send}/>);
  const embedded=renderToStaticMarkup(<WarDetails world={w} war={war} embedded pending={false} send={send} showHeading={false}/>);
  expect(ordinary).toContain('aria-label="战争详情"');expect(ordinary).toContain('war-details-parties');
  expect(embedded).not.toContain('aria-label="战争详情"');expect(embedded).not.toContain('war-details-parties');expect(embedded).toContain('进行中的战役与围城');expect(w).toEqual(before);
 });
 it('keeps real postwar obligations visible to their parties without exposing them to spectators',()=>{
  const w=rebellion();w.characterId='xiao-yan';awardInfluence(w,'xiao-yan',20);let war=houJingPresentation(w).war!;
  const target=Object.keys(war.civil!.mobilization!.members).find(id=>!civilFixedSide(w,war,id)&&civilPromiseOptions(w,war,'xiao-yan',id).length)!;
  const offer=civilPromiseOptions(w,war,'xiao-yan',target)[0];
  actCivilPolitics(w,{type:'civilWar',action:'pledge',war:war.id!,person:target,side:'loyal',target:offer.target,mode:offer.mode});war=houJingPresentation(w).war!;
  const quote=civilStanceQuote(w,war,target,'loyal');expect(quote.reason).toBe('');
  actCivilPolitics(w,{type:'civilWar',action:'stance',war:war.id!,choice:'loyal',revision:quote.revision},target);war=houJingPresentation(w).war!;
  settleCivilWar(w,war,'demand','loyal');advanceHistorical(w);
  const before=structuredClone(w),v=houJingPresentation(w);expect(v.war).toBeUndefined();expect(v.commitments.some(q=>q.person===target&&q.civil.status==='active')).toBe(true);expect(v.deadline?.day).toBe(w.day+30);
  const html=renderToStaticMarkup(<HouJingDesk world={w} view={v} initialPage="history" pending={false} send={send} navigation={navigation} onLocate={noop} onClose={noop} onCatalog={noop}/>);
  expect(html).toContain('与本人有关的待遇');expect(html).toContain('前往朝廷办理职权');expect(w).toEqual(before);
  w.characterId='yuwen-tai';expect(houJingPresentation(w).commitments).toEqual([]);expect(houJingPresentation(w).deadline).toBeUndefined();
 });
 it('keeps the ended event readable without keeping live war operations',()=>{
  const w=rebellion(),war=houJingPresentation(w).war!;settleCivilWar(w,war,'yield');advanceHistorical(w);
  const v=houJingPresentation(w);expect(v.war).toBeUndefined();expect(['resolved','cancelled']).toContain(v.entry.status);expect(v.deadline).toBeUndefined();
  const html=renderToStaticMarkup(<HouJingDesk world={w} view={v} initialPage="responses" pending={false} send={send} navigation={navigation} onLocate={noop} onClose={noop} onCatalog={noop}/>);
  expect(html).toContain('已知经过');expect(html).not.toContain('侯景之乱地方响应');expect(html).not.toContain('本人待表态');
 });
});

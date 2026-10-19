import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {initializeHistoricalStart} from './historicalStart';
import {actPact,advancePacts,pactReformReview} from './allegiancePacts';
import {governingAuthority} from './government';
import {changeRelationOpinion,relationOpinion} from './relationships';
import {nextMonthStart} from './calendar';
import {detainPerson} from './custody';
import {parseWorld,serializeWorld} from './save';
function agreed(){
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');initializeHistoricalStart(w);const a=w.realm!.armies.find(a=>w.mobility!.armyCommanders?.[a.id!]==='hou-jing')!;
 actPact(w,{type:'pact',action:'request',realm:'liang',army:a.id,terms:'retain'},'hou-jing');advancePacts(w);const p=w.allegiancePacts!.items[0],chief=governingAuthority(w,'liang');
 actPact(w,{type:'pact',action:'renegotiate',id:p.id,terms:'reform'},'hou-jing');const live=w.allegiancePacts!.items[0];actPact(w,{type:'pact',action:'respondOffer',id:p.id,revision:live.offer!.revision,accept:true},chief);
 const pact=w.allegiancePacts!.items[0];changeRelationOpinion(w,'hou-jing',chief,-52-relationOpinion(w,'hou-jing',chief));w.day=nextMonthStart(pact.due,w.scriptId);return {w,p:pact,chief};
}
describe('bilaterally agreed reform',()=>{
 it('completes at the actual monthly review despite negative opinion and survives reload without repeating',()=>{
  const {w,p,chief}=agreed();expect(relationOpinion(w,'hou-jing',chief)).toBe(-52);expect(pactReformReview(w,p)!.reasons).toEqual([]);advancePacts(w);expect(p.integrationCompletedAt).toBe(w.day);expect(pactReformReview(w,p)).toBeUndefined();
  const once=serializeWorld(w);advancePacts(w);expect(serializeWorld(w)).toBe(once);expect(parseWorld(once).allegiancePacts).toEqual(w.allegiancePacts);
 });
 it.each(['arrears','custody','missing','realm'] as const)('reports a real %s block and the next review rather than inventing progress',kind=>{
  const {w,p}=agreed(),a=w.realm!.armies.find(a=>a.id===p.army)!;
  if(kind==='arrears')a.arrears=10;if(kind==='custody')detainPerson(w,p.person,'east',a.location,'battle','battle:1');if(kind==='missing')w.realm!.armies=w.realm!.armies.filter(b=>b!==a);if(kind==='realm')a.realm='east';
  const before=pactReformReview(w,p)!;expect(before.reasons).not.toHaveLength(0);expect(before.due).toBe(p.due);expect(before.nextReview).toBe(w.day);advancePacts(w);expect(p.integrationCompletedAt).toBeUndefined();expect(pactReformReview(w,p)!.nextReview).toBe(nextMonthStart(w.day,w.scriptId));
 });
 it('does not execute between the agreed date and the monthly settlement',()=>{
  const {w,p}=agreed();w.day--;advancePacts(w);expect(p.integrationCompletedAt).toBeUndefined();expect(pactReformReview(w,p)!.nextReview).toBe(w.day+1);
 });
});

import {presentAt} from './residence';
import {attributes,type Ability} from './social';
import {familyPrestige} from './family';
import {clanStanding} from './clans';
import {recommendationBonus} from './retinue';
import {relationOpinion} from './relationships';
import {relationshipPersonById} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import type {MinistryId} from '../data/court';
import type {World} from './types';
import type {RealmId} from './realm';
import {governanceRules} from './governanceRules';

export interface AppointmentPost {ministry?:MinistryId;territory?:string;site?:string}
export const ministryAbility:Record<MinistryId,Ability>={secretariat:'diplomacy',personnel:'stewardship',finance:'stewardship',military:'martial',censorate:'intrigue'};
/** Qualification stays in officeEligibility/localAdministration; this is preference, not permission. */
export function appointmentEvaluation(w:World,r:RealmId,id:string,post:AppointmentPost={},approver?:string) {
 const g=w.realm!.governments!.realms[r],rules=governanceRules(w,r),level=post.territory?territoryNodes[post.territory]?.level:'county';
 const merit=g.merit[id]??0,prestige=w.families?.prestige[id]??0,family=familyPrestige(w,relationshipPersonById[id]?.family??'');
 const ability=attributes(w,id)[post.ministry?ministryAbility[post.ministry]:'stewardship'];
 const practical=!!post.ministry&&['finance','military','censorate'].includes(post.ministry);
 const weights=rules.appointment==='lineage'?{ability:practical?2.5:1.5,merit:.5,family:practical?12:28,prestige:20}:rules.appointment==='selection'?{ability:2.5,merit:.7,family:12,prestige:15}:{ability:3,merit:.9,family:5,prestige:8};
 const trust=Math.max(-12,Math.min(12,Math.round(approver?relationOpinion(w,approver,id)/5:0))),recommendation=recommendationBonus(w,id);
 const reference=post.ministry?40:level==='province'?50:level==='prefecture'?30:20;
 const threshold=post.ministry?45:level==='province'?55:level==='prefecture'?35:20;
 const factors=[{label:'对口能力',value:Math.round(ability*weights.ability)},{label:'履历功绩',value:Math.round(Math.min(60,merit)*weights.merit)},{label:'门第与家望',value:Math.round(Math.min(1,(clanStanding(w,id)?.petition??0)/20+family/3000)*weights.family)},{label:'个人声誉',value:Math.round(Math.min(1,prestige/300)*weights.prestige)},{label:'举荐与信任',value:trust+recommendation},{label:'当地履职条件',value:post.site&&presentAt(w,id,post.site)?5:0}];
 const legalMerit=g.laws.includes('west-offices')||g.laws.includes('east-assessment')?20:0;
 const score=factors.reduce((n,f)=>n+f.value,0),trial=rules.access==='trial'&&ability>=12&&score>=threshold,sponsored=rules.access==='sponsorship'&&ability>=10&&trust+recommendation>=12&&score>=threshold;
 return {merit,prestige,family,ability,score,threshold,factors,reference,legalMerit,trial,sponsored,ordinary:merit>=legalMerit&&(merit>=reference||trial||sponsored)};
}

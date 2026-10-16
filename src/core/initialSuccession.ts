import {campaignSetup} from '../data/campaignSetup';
import {governmentOf} from './government';
import {rulerEligibility,dynasticKin,claimantProvenance,supportClaim} from './claims';
import {validDynastyName} from './courtSave';
import {successionCandidates} from './publicSuccession';
import type {World} from './types';
import type {RealmId} from './realm';
/** Author initial state, applied once after all real eligibility systems exist. */
export function initializeSuccession(w:World){
 for(const [id,h] of Object.entries(campaignSetup.succession??{})){
  const r=id as RealmId,g=governmentOf(w,r);if(!g)throw new Error('继承配置政权不存在：'+id);
  if(h.ruler&&(h.ruler===g.ruler||rulerEligibility(w,r,h.ruler,{allowFounder:validDynastyName(h.dynasty)})))throw new Error('君位继承初态不符合实际资格：'+h.ruler);
  if(h.ruler&&!dynasticKin(w,h.ruler,g.ruler)?!validDynastyName(h.dynasty):h.dynasty!==null)throw new Error('非宗亲继承须注明有效新国号，宗亲继承不另填国号：'+id);
  if(h.executive&&(h.executive===g.executives[0]||!successionCandidates(w,r,'executive').includes(h.executive)))throw new Error('执政继任者不符合实际资格：'+h.executive);
  g.heirs=structuredClone(h);if(h.ruler&&claimantProvenance(w,r,h.ruler))supportClaim(w,r,h.ruler,g.executives[0],'designated');
 }
}

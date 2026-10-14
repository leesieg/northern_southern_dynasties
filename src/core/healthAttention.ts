import type {World} from './types';
import {ageAt,isAlive} from './lifeState';
import {heirs} from './social';
import {allegianceRealm} from './officeEligibility';
import {governmentOf} from './government';
import {nominationReason,successionCandidates} from './publicSuccession';
/** Only remind the current player about succession choices they can actually make. */
export function seniorSuccessionAttention(w:World){
 const id=w.characterId;if(!id||!isAlive(w,id)||(ageAt(w,id)??0)<70||w.campaign?.status!=='active')return '';
 const needs:string[]=[];
 if(!heirs(w).some(p=>p.id===w.social?.heir)&&heirs(w).length)needs.push('家业继任');
 const r=allegianceRealm(w,id),g=r&&governmentOf(w,r);
 if(g)for(const office of ['ruler','executive'] as const){const assigned=g.heirs?.[office],valid=assigned&&successionCandidates(w,r!,office).includes(assigned);if(!valid&&successionCandidates(w,r!,office).some(candidate=>candidate!==id&&!nominationReason(w,{type:'government',action:'nominate',office,candidate},id)))needs.push(office==='ruler'?'君位继任':'执政继任');}
 return needs.join('、');
}

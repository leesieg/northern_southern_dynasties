import {isMonthStart} from './calendar';
import {relationshipPeople} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import {actCourt,courtEnabled,courtReason} from './court';
import {ministryIds,type MinistryId} from '../data/court';
import {civilCanAdmin} from './civilWars';
import {governmentOf,governingExecutives} from './government';
import {appointmentApprover,appointmentRank} from './appointmentCycle';
import {canonicalTerritory,localSites,localActive,localHolder,localAppointer,localMeritReference,localOfficeLoad,localKey,localReason,actLocal,localSeatSite} from './localAdministration';
import {npcRoute,dispatchNPC} from './mobility';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {personInfluence} from './personalInfluence';
import {isAdventurer} from './resignation';
import {personResidence,presentAt} from './residence';
import {isAlive,lifeOf} from './lifeState';
import {attributes,type Ability} from './social';
import {capital,realms,type RealmId} from './realm';
import type {World} from './types';
export const NPC_CENTRAL_APPOINTMENTS=2;
export const NPC_LOCAL_APPOINTMENTS=3;

function idleCandidates(w:World,r:RealmId){
 const g=governmentOf(w,r)!,reserved=new Set([
  ...w.realm!.offices.map(o=>o.candidate),
  ...w.realm!.local!.requests.filter(q=>q.status==='pending').map(q=>q.candidate),
  ...realms.flatMap(realm=>{const q=w.realm!.local!.cycle?.rounds[realm];return q?.status==='pending'?q.rows.flatMap(row=>row.candidate?[row.candidate]:[]):[];}),
 ]);
 return relationshipPeople.filter(p=>p.id!==w.characterId&&allegianceRealm(w,p.id)===r&&!isAdventurer(w,p.id)&&!publicOfficeReason(w,p.id)&&lifeOf(w,p.id)?.illness?.severity!==3&&!personResidence(w,p.id).traveling&&!w.mobility?.appointments[p.id]&&!reserved.has(p.id)&&p.id!==g.ruler&&!governingExecutives(w,r).includes(p.id)&&!Object.values(g.court?.ministries??{}).includes(p.id)&&!localOfficeLoad(w,p.id));
}

/** A monthly decision, paid by the actual appointing person. It never replaces a
 * pending review, appoints the player, or moves an incumbent to manufacture a vacancy. */
export function advanceNPCOfficeRecruitment(w:World){
 const s=w.realm?.local;
 if(!s||w.mode!=='sandbox'||w.campaign?.status!=='active'||w.realm!.event||!isMonthStart(w.day,w.scriptId)||(s.lastNPCRecruitment??-1)>=w.day)return;
 s.lastNPCRecruitment=w.day;
 for(const r of realms){
  if(w.realm!.annexed?.[r]||s.cycle?.rounds[r]?.status==='pending')continue;
  const g=governmentOf(w,r)!,chief=appointmentApprover(w,r);
  if(!isAlive(w,chief))continue;
  const posts=Object.values(territoryNodes).filter(n=>n.level!=='realm'&&canonicalTerritory(n.id)===n.id&&localSites(w,n.id,r).length&&localActive(w,n.id,r)).sort((a,b)=>Number(['county','city'].includes(b.level))-Number(['county','city'].includes(a.level))||appointmentRank(b.id)-appointmentRank(a.id)||a.id.localeCompare(b.id));
  if(chief!==w.characterId){
   // Delegation follows actual living provincial/prefectural holders and permits
   // their own influence balances to fund appointments below them.
   for(const n of posts.filter(n=>['province','prefecture'].includes(n.level))){
    const holder=localHolder(w,n.id,r),command={type:'local',action:'delegate',territory:n.id,enabled:true} as const;
    if(holder&&holder!==w.characterId&&!s.seats[localKey(r,n.id)]?.delegated&&!localReason(w,command,chief))actLocal(w,command,chief);
   }
   fillCentral(w,r,chief);
  }
  let applications=0;const appointments=new Map<string,number>();
  for(const n of posts){
   if(localHolder(w,n.id,r)||w.realm!.offices.some(o=>canonicalTerritory(o.territory??'city:'+o.site)===n.id)||s.requests.some(q=>q.status==='pending'&&q.realm===r&&q.territory===n.id))continue;
   const actor=localAppointer(w,n.id,r),site=localSeatSite(w,n.id,r)!;
   if(!isAlive(w,actor)||!civilCanAdmin(w,actor,site))continue;
   if(actor===w.characterId&&applications>=3||actor!==w.characterId&&(appointments.get(actor)??0)>=NPC_LOCAL_APPOINTMENTS)continue;
   const reference=localMeritReference(n.id),candidate=idleCandidates(w,r).filter(p=>(g.merit[p.id]??0)>=reference&&(actor!==w.characterId||personInfluence(w,p.id)>=10)).sort((a,b)=>Number(presentAt(w,b.id,site))-Number(presentAt(w,a.id,site))||(g.merit[a.id]??0)-(g.merit[b.id]??0)||a.id.localeCompare(b.id)).find(p=>!!npcRoute(w,p.id,site));
   if(!candidate)continue;
   const command={type:'local',action:actor===w.characterId?'apply':'appoint',territory:n.id,candidate:candidate.id} as const,issuer=actor===w.characterId?candidate.id:actor;
   if(localReason(w,command,issuer))continue;
   actLocal(w,command,issuer);if(actor===w.characterId)applications++;else appointments.set(actor,(appointments.get(actor)??0)+1);
  }
 }
}

function fillCentral(w:World,r:RealmId,actor:string){
 if(!courtEnabled(w,r)||w.realm!.cities[capital(r)].owner!==r||w.realm!.cities[capital(r)].controller!==r||!civilCanAdmin(w,actor,capital(r)))return;
 const g=governmentOf(w,r)!,court=g.court!;let decisions=0;
 const skills:Record<MinistryId,Ability>={secretariat:'diplomacy',personnel:'stewardship',finance:'stewardship',military:'martial',censorate:'intrigue'};
 for(const ministry of ministryIds){
  if(decisions>=NPC_CENTRAL_APPOINTMENTS)break;if(court.ministries[ministry])continue;
  const candidate=idleCandidates(w,r).filter(p=>(g.merit[p.id]??0)>=40).map(p=>({id:p.id,ability:attributes(w,p.id)[skills[ministry]],merit:g.merit[p.id]})).sort((a,b)=>Number(presentAt(w,b.id,capital(r)))-Number(presentAt(w,a.id,capital(r)))||b.ability-a.ability||a.merit-b.merit||a.id.localeCompare(b.id)).find(p=>!!npcRoute(w,p.id,capital(r)));
  if(!candidate)continue;
  const command={type:'court',action:'appoint',ministry,candidate:candidate.id} as const;
  if(courtReason(w,command,actor))continue;
  decisions++;
  if(!presentAt(w,candidate.id,capital(r))){dispatchNPC(w,candidate.id,capital(r));continue;}
  actCourt(w,command,actor);
 }
}

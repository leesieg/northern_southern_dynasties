import {civilCanAdmin} from './civilWars';
import {survivingRealm} from './polityLifecycle';
import type {World} from './types';
import type {Assignment} from './assignments';
import {assignmentTemplates,assignmentPlans,type AssignmentKind} from '../data/assignments';
import type {RealmId} from './realm';
import {allegianceRealm} from './officeEligibility';
import {governingExecutives,governmentOf} from './government';
import {countyTerritory,localAncestors,localHolder,localActive,localSuperior} from './localAdministration';
import {centralAccount,territoryAccount,publicBalance,fiscalRecord,ensureFiscal} from './treasury';
import {centralMinistry,dutyMinistries} from './officialDuties';
import {presentAt} from './residence';
import {capital} from './realm';
import type {MinistryId} from '../data/court';
import {isAlive} from './lifeState';

export interface ServiceMandate {issuer:string;automatic:boolean;orderFloor:number;qualityFloor:number;reserve:number}
export interface ServiceFunding {account:string;grainSite:string|null;coins:number;grain:number}
export interface ServiceRefund extends ServiceFunding {}
const national=(kind:AssignmentKind)=>kind==='envoy'||kind==='greatworks';
const commissionMinistries:Partial<Record<AssignmentKind,MinistryId[]>>={...dutyMinistries,relief:['secretariat','finance'],agriculture:['finance'],commerce:['finance'],training:['military'],supply:['military'],inspection:['censorate','personnel']};
function centralCommission(w:World,actor:string,r:RealmId,kind:AssignmentKind){const ministry=centralMinistry(w,actor);return !!ministry&&presentAt(w,actor,capital(r))&&!!commissionMinistries[kind]?.includes(ministry);}
export function canCommission(w:World,actor:string,r:RealmId,site:string,kind:AssignmentKind){
 if(!isAlive(w,actor)||!civilCanAdmin(w,actor,site)||allegianceRealm(w,actor)!==r||w.realm?.cities[site]?.owner!==r||w.realm.cities[site].controller!==r)return false;
 if(governingExecutives(w,r).includes(actor))return true;
 if(national(kind))return false;if(centralCommission(w,actor,r,kind))return true;
 return [countyTerritory(site),...localAncestors(countyTerritory(site)).map(n=>n.id)].some(t=>localActive(w,t,r)&&localHolder(w,t,r)===actor);
}
export function serviceApprover(w:World,t:Pick<Assignment,'realm'|'site'|'kind'|'officer'|'mandate'>){
 const issuer=t.mandate?.issuer;
 if(issuer&&issuer!==t.officer&&canCommission(w,issuer,t.realm,t.site,t.kind))return issuer;
 if(!national(t.kind)){
  const local=localSuperior(w,countyTerritory(t.site),t.realm,t.officer)?.holder;
  if(local&&canCommission(w,local,t.realm,t.site,t.kind))return local;
 }
 if(!national(t.kind)){const minister=Object.values(governmentOf(w,t.realm)?.court?.ministries??{}).find(id=>id&&id!==t.officer&&canCommission(w,id,t.realm,t.site,t.kind));if(minister)return minister;}
 return governingExecutives(w,t.realm).find(id=>id!==t.officer);
}
export function serviceAuthority(w:World,t:Assignment,actor:string){return actor!==t.officer&&(serviceApprover(w,t)===actor||governingExecutives(w,t.realm).includes(actor));}
/** Capacity comes from paid, filled posts rather than a national task-slot allowance. */
export function serviceCapacity(w:World,actor:string,r:RealmId){
 const central=governingExecutives(w,r).includes(actor);
 const staff=central?Object.values(governmentOf(w,r)?.court?.ministries??{}).filter(id=>id&&isAlive(w,id)).length:Object.entries(w.retinue?.members??{}).filter(([id,m])=>m.host===actor&&m.post&&!m.arrears&&isAlive(w,id)).length;
 return 1+staff;
}
export function servicePayer(w:World,t:Pick<Assignment,'realm'|'site'|'kind'|'officer'|'mandate'>,actor=serviceApprover(w,t)){
 const r=t.realm;
 if(!actor||governingExecutives(w,r).includes(actor))return {account:centralAccount(r),grainSite:null};
 const territory=[countyTerritory(t.site),...localAncestors(countyTerritory(t.site)).slice().reverse().map(n=>n.id)].find(id=>localHolder(w,id,r)===actor&&localActive(w,id,r));
 return {account:territory?territoryAccount(w,r,territory):centralAccount(r),grainSite:territory?t.site:null};
}
export function serviceBudgetReason(w:World,t:Pick<Assignment,'realm'|'site'|'kind'|'officer'|'mandate'>,coins:number,grain:number,actor?:string){
 const p=servicePayer(w,t,actor),food=p.grainSite?w.realm!.cities[p.grainSite].grain:w.realm!.treasuries[t.realm].grain;
 return publicBalance(w,p.account)<coins?'主管公库不足，须先向上级申请拨款':food<grain?'拨付粮仓不足':'';
}
export function payService(w:World,t:Assignment,coins:number,grain:number,actor:string){
 const reason=serviceBudgetReason(w,t,coins,grain,actor);if(reason)throw new Error(reason);
 const p=servicePayer(w,t,actor),f=ensureFiscal(w)!;
 if(!t.funding&&t.funds.coins)t.funding=[{account:centralAccount(t.realm),grainSite:null,...t.funds}];
 if(p.account.startsWith('central:'))w.realm!.treasuries[t.realm].coins-=coins;else f.balances[p.account]=publicBalance(w,p.account)-coins;
 if(p.grainSite)w.realm!.cities[p.grainSite].grain-=grain;else w.realm!.treasuries[t.realm].grain-=grain;
 (t.funding??=[]).push({...p,coins,grain});fiscalRecord(w,t.realm,p.account,'task:'+t.id,coins,'委任专项预算');
}
/** Unreturnable balances stay in escrow; a full receiving treasury never destroys them. */
export function settleServiceRefund(w:World,t:Assignment){
 for(const p of t.refunds??[]){
  const amount=Math.min(p.coins,1_000_000-publicBalance(w,p.account));
  if(amount){if(p.account.startsWith('central:'))w.realm!.treasuries[t.realm].coins+=amount;else ensureFiscal(w)!.balances[p.account]=publicBalance(w,p.account)+amount;p.coins-=amount;fiscalRecord(w,t.realm,'task:'+t.id,p.account,amount,'退回原拨款公库');}
  const receiver=p.grainSite?w.realm!.cities[p.grainSite]:w.realm!.treasuries[t.realm];
  // A captured granary cannot silently receive the former owner's escrow.
  if(p.grainSite&&w.realm!.cities[p.grainSite].controller!==survivingRealm(w,t.realm))continue;
  const grain=Math.min(p.grain,1_000_000-receiver.grain);receiver.grain+=grain;p.grain-=grain;
 }
 t.refunds=t.refunds?.filter(p=>p.coins||p.grain);
}
export function refundService(w:World,t:Assignment,coins:number,grain:number){
 const sources=t.funding??[{account:centralAccount(t.realm),grainSite:null,...t.funds}];
 t.refunds=[];
 for(const source of sources.slice().reverse()){const refund={...source,coins:Math.min(coins,source.coins),grain:Math.min(grain,source.grain)};coins-=refund.coins;grain-=refund.grain;if(refund.coins||refund.grain)t.refunds.push(refund);}
 settleServiceRefund(w,t);
}
export function serviceException(w:World,t:Assignment){
 if(!t.mandate?.automatic)return true;
 const budget=t.phase==='approval'?Math.ceil(assignmentTemplates[t.kind].coins*assignmentPlans[t.plan??'balanced'].cost/100):0;
 const grain=t.phase==='approval'?Math.ceil(assignmentTemplates[t.kind].grain*assignmentPlans[t.plan??'balanced'].cost/100):0;
 return t.result?.success===false||serviceApprover(w,t)!==t.mandate.issuer||!canCommission(w,t.mandate.issuer,t.realm,t.site,t.kind)||budget>assignmentTemplates[t.kind].coins||grain>assignmentTemplates[t.kind].grain||!!serviceBudgetReason(w,t,budget,grain)||national(t.kind)||w.realm!.cities[t.site].order<t.mandate.orderFloor||(t.quality??100)<t.mandate.qualityFloor||w.day>t.deadline||t.phase==='aid';
}

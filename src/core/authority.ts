import {armyCommander} from './mobility';
import type {World} from './types';
import type {RealmId,Army} from './realm';
import {isAlive} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {governingExecutives,governmentOf} from './government';
import {localCanAppoint,localHolder,localActive,localAncestors,countyTerritory} from './localAdministration';
import {territoryAccount,publicBalance} from './treasury';
import {actorCommandsSide,civilCanAdmin} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
export type Capability='appoint'|'delegate'|'spendPublic'|'levy'|'command'|'declareWar'|'negotiatePeace'|'inspect';
export interface AuthorityScope {realm:RealmId;site?:string;territory?:string;account?:string;army?:Army;amount?:number}
export function authorityGrant(w:World,actor:string,capability:Capability,scope:AuthorityScope){
 const denied=(reason:string)=>({allowed:false,reason,source:'',account:null as string|null,available:0,expires:null as number|null});
 if(!w.realm||!isAlive(w,actor)||allegianceRealm(w,actor)!==scope.realm)return denied('人物不在世或不效忠该政权');
 if(capability!=='command'&&scope.site&&!civilCanAdmin(w,actor,scope.site))return denied('目标由内战对方控制');
 const central=governingExecutives(w,scope.realm).includes(actor),t=scope.territory??(scope.site?countyTerritory(scope.site):null),territories=t?[t,...localAncestors(t).slice().reverse().map(n=>n.id)]:[],held=territories.find(id=>localActive(w,id,scope.realm)&&localHolder(w,id,scope.realm)===actor),account=central?'central:'+scope.realm:held?territoryAccount(w,scope.realm,held):null,campaign=scope.army?armyCampaign(w,scope.army):undefined;
 const source=central?'朝廷实际执政':held?'地方职掌':campaign?.commander===actor?'战役委任':capability==='command'?'军务授权':'';
 let allowed=false;
 switch(capability){
 case 'appoint':allowed=!!t&&localCanAppoint(w,actor,t,scope.realm);break;
 case 'delegate':case 'levy':allowed=central||!!held;break;
 case 'spendPublic':allowed=!!account&&account===scope.account;break;
 case 'command':allowed=!!scope.army&&actorCommandsSide(w,actor,scope.army)&&(central||campaign?.commander===actor||armyCommander(w,scope.army)===actor||scope.army.owner===actor||!!scope.army.payer?.startsWith(scope.realm+'|')&&localHolder(w,scope.army.payer.split('|')[1],scope.realm)===actor&&localActive(w,scope.army.payer.split('|')[1],scope.realm));break;
 case 'declareWar':case 'negotiatePeace':allowed=central;break;
 case 'inspect':allowed=central||governmentOf(w,scope.realm)?.court?.ministries.censorate===actor||!!held&&held!==t;break;
 }
 if(!allowed)return denied('没有当前职掌或有效委任');
 if(scope.site&&(capability==='levy'||capability==='delegate')&&(w.realm.cities[scope.site]?.owner!==scope.realm||w.realm.cities[scope.site]?.controller!==scope.realm))return denied('须在本国法理和实际控制的辖区内');
 const available=capability==='command'&&campaign?.commander===actor?campaign.remaining:account?publicBalance(w,account):0;
 if(scope.amount!==undefined&&(!Number.isSafeInteger(scope.amount)||scope.amount<0||scope.amount>available))return denied('授权可用预算不足');
 return {allowed:true,reason:'',source,account,available,expires:campaign?.commander===actor?campaign.deadline:null};
}

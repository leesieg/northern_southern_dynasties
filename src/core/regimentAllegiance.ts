import type {World} from './types';
import type {Army} from './realm';
import type {Regiment} from './armyOrganization';
import {ensureArmyOrganization} from './armyOrganization';
import {returnArmyConvoy} from './armyLogistics';
export function regimentFollows(u:Regiment,a:Army,supporters:string[],localSupport:boolean){return !!a.owner&&supporters.includes(a.owner)||!!u.loyalTo&&supporters.includes(u.loyalTo)&&(u.commanderLoyalty??0)>=60&&(u.commanderLoyalty??0)>(u.institution??60)||localSupport&&(u.institution??60)<75&&!u.loyalTo;}
/** Only real regiments change camp. A resisting remainder keeps its personnel and share of stores/debts. */
export function splitRevoltArmies(w:World,supporters:string[],cities:string[],ids:number[]){ensureArmyOrganization(w);const result:number[]=[];for(const id of ids){const a=w.realm!.armies.find(a=>a.id===id);if(!a)continue;const local=cities.includes(a.location)&&(a.payer??'').startsWith(a.realm+'|'),following=a.regiments!.filter(u=>regimentFollows(u,a,supporters,local)),staying=a.regiments!.filter(u=>!following.includes(u));if(!following.length)continue;if(!staying.length){returnArmyConvoy(w,a);result.push(id);continue;}const troops=following.reduce((n,u)=>n+u.troops,0),rest=a.troops-troops;if(troops<100||rest<100||w.realm!.armies.length>=48||w.realm!.armies.filter(b=>b.realm===a.realm).length>=16)continue;returnArmyConvoy(w,a);
 const share=troops/a.troops,supply=Math.floor(a.supply*share),arrears=Math.floor((a.arrears??0)*share),foodRemainder=Math.floor((a.foodRemainder??0)*share),newId=w.realm!.nextArmyId!++;w.realm!.armies.push({...a,id:newId,troops:rest,regiments:staying,supply:a.supply-supply,arrears:(a.arrears??0)-arrears,foodRemainder:(a.foodRemainder??0)-foodRemainder});a.troops=troops;a.regiments=following;a.supply=supply;a.foodRemainder=foodRemainder;a.arrears=arrears;result.push(id);
 }return result;}

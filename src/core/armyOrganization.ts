import {civilWar,civilCanAdmin,playerCommandsArmy} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {enactPoliticalAction} from './politicalActions';
import type {World} from './types';
import type {Army} from './realm';
import {playerRealm,executive} from './realm';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {centralAccount,fiscalPath,publicBalance,ensureFiscal,fiscalRecord} from './treasury';
import {siteById} from '../data/scenario';
export const troopKinds={
 shield:{name:'刀盾兵',cost:30,pay:100,attack:100,defence:115},
 spear:{name:'长矛兵',cost:30,pay:100,attack:105,defence:110},
 archer:{name:'弓弩兵',cost:40,pay:115,attack:120,defence:80},
 lightHorse:{name:'轻骑兵',cost:60,pay:140,attack:125,defence:95},
 heavyHorse:{name:'甲骑',cost:90,pay:180,attack:150,defence:140},
 siege:{name:'攻城队',cost:70,pay:130,attack:50,defence:70},
} as const;
export type TroopKind=keyof typeof troopKinds;
export interface Regiment {id:string;kind:TroopKind;service:'levy'|'standing';origin:string;troops:number;experience:number}
export type ArmyCommand={type:'army';action:'raise';site:string;kind:TroopKind;service:Regiment['service']}|{type:'army';action:'split';army:number;regiment:string}|{type:'army';action:'merge';army:number;target:number};
export function ensureArmyOrganization(w:World){
 const s=w.realm;if(!s)return;
 s.nextArmyId=Math.max(s.nextArmyId??1,...s.armies.map(a=>(a.id??0)+1));
 for(const a of s.armies){a.id??=s.nextArmyId++;a.payer??=centralAccount(a.realm);a.arrears??=0;a.foodRemainder??=0;
  a.regiments??=[{id:a.id+':1',kind:'shield',service:'levy',origin:a.location,troops:a.troops,experience:0}];
  reconcileRegiments(a);
 }
}
/** Existing aggregate casualty producers reduce actual regiments; there is no second troop pool. */
export function reconcileRegiments(a:Army){
 if(!a.regiments?.length)return;const total=a.regiments.reduce((n,u)=>n+u.troops,0);
 if(total===a.troops)return;
 if(total<a.troops){a.regiments[0].troops+=a.troops-total;return;}
 let remaining=a.troops;
 a.regiments.forEach((u,i)=>{const n=i===a.regiments!.length-1?remaining:Math.floor(u.troops*a.troops/total);u.troops=n;remaining-=n;});
 a.regiments=a.regiments.filter(u=>u.troops>0);
}
export function armyPayFactor(a:Army){return !a.regiments?.length?1:a.regiments.reduce((n,u)=>n+u.troops*troopKinds[u.kind].pay*(u.service==='standing'?1.5:1),0)/Math.max(1,a.troops)/100;}
export function armyCombatFactor(a:Army,kind:'attack'|'defence',terrain:string){
 if(!a.regiments?.length)return 1;
 return a.regiments.reduce((n,u)=>{const cavalry=u.kind==='lightHorse'||u.kind==='heavyHorse',land=cavalry&&terrain!=='平原'?.75:u.kind==='archer'&&terrain==='丘陵'?1.1:1;return n+u.troops*troopKinds[u.kind][kind]/100*land*(1+u.experience/500);},0)/Math.max(1,a.troops);
}
export function consumeArmyFood(w:World,a:Army,dailyRate:number){
 // Rate is expressed in hundredths of a ration per 60 soldiers; preserve the fractional remainder.
 const total=(a.foodRemainder??0)+a.troops*dailyRate,need=Math.floor(total/6000);a.foodRemainder=total%6000;
 void w;return need;
}
export function payArmy(w:World,a:Army,want:number){
 const campaign=armyCampaign(w,a);
 const source=a.payer??centralAccount(a.realm),available=campaign?.remaining??publicBalance(w,source),due=want+(a.arrears??0),paid=Math.min(available,due);
 if(campaign){campaign.remaining-=paid;campaign.spent+=paid;}else if(source.startsWith('central:'))w.realm!.treasuries[a.realm].coins-=paid;else ensureFiscal(w)!.balances[source]=available-paid;
 a.arrears=due-paid;fiscalRecord(w,a.realm,campaign?'campaign:'+campaign.id:source,'expense',paid,'军饷与补发欠饷');
 if(a.arrears){a.morale=Math.max(0,a.morale-Math.min(20,Math.ceil(a.arrears/Math.max(1,want))*4));}
}
export function armyOrganizationReason(w:World,c:ArmyCommand){
 if('army'in c&&w.militaryCampaigns?.items.some(q=>q.status==='active'&&(q.army===c.army||c.action==='merge'&&q.army===c.target)))return '须先交接战役，才能调整编制';
 if(!w.realm||!w.characterId||w.campaign?.status!=='active'||!w.realm.mandate)return '须有军务授权';
 const s=w.realm,r=playerRealm(w);
 if(c.action==='raise'){
  const city=s.cities[c.site];if(!civilCanAdmin(w,w.characterId!,c.site))return '不能在内战对方控制地区征募';if(!city||city.owner!==r||city.controller!==r)return '须在本国法理和控制下征募';
  if(!executive(w)&&city.governor!==w.characterId)return '须有本县治理权或由朝廷动员';
  if(!Object.hasOwn(troopKinds,c.kind)||!['levy','standing'].includes(c.service))return '无效兵种或役制';
  if(s.armies.length>=48||s.armies.filter(a=>a.realm===r).length>=16)return '军队编制已满';
  if(city.population<300)return '须保留至少 100 名居民';
  const source=executive(w)?centralAccount(r):fiscalPath(w,c.site,r)[0],cost=troopKinds[c.kind].cost*(c.service==='standing'?2:1);
  return publicBalance(w,source)<cost?'拨付公库不足 '+cost+' 钱':city.grain<60?'驻地粮仓不足 60':governmentMusterReason(w,r);
 }
 const a=s.armies.find(a=>a.id===c.army&&a.realm===r);if(!a)return '军队不存在';if(!playerCommandsArmy(w,a))return '不能调整内战对方军队';if(civilWar(w,r))return '内战期间须保留各军编制';
 if(a.journey||s.cities[a.location].controller!==r)return '须在本国驻地停驻整编';
 if(c.action==='split'){
  const u=a.regiments?.find(u=>u.id===c.regiment);return !u||u.troops<100||a.troops-u.troops<100?'两支军队均须至少 100 人':a.convoy?'粮队抵达后再分军':s.armies.length>=48||s.armies.filter(x=>x.realm===r).length>=16?'军队编制已满':'';
 }
 const b=s.armies.find(b=>b.id===c.target&&b.realm===r);
 return !b||b===a||b.location!==a.location||b.journey?'须选择同城停驻的另一军队':a.convoy||b.convoy?'粮队抵达后再合军':a.payer!==b.payer?'须由同一公库供饷':a.troops+b.troops>6000||a.supply+b.supply>600?'合军超出兵额或随军粮容量':'';
}
export function actArmyOrganization(w:World,c:ArmyCommand){
 const reason=armyOrganizationReason(w,c);if(reason)throw new Error(reason);ensureArmyOrganization(w);const s=w.realm!,r=playerRealm(w);
 if(c.action==='raise'){
  const city=s.cities[c.site],payer=executive(w)?centralAccount(r):fiscalPath(w,c.site,r)[0],cost=troopKinds[c.kind].cost*(c.service==='standing'?2:1),id=s.nextArmyId!++;
  enactPoliticalAction(w,r,'military');spendGovernmentMuster(w,r);if(payer.startsWith('central:'))s.treasuries[r].coins-=cost;else ensureFiscal(w)!.balances[payer]=publicBalance(w,payer)-cost;
  fiscalRecord(w,r,payer,'expense',cost,'征募'+troopKinds[c.kind].name);city.population-=200;city.grain-=60;
  const revolt=civilWar(w,r);if(revolt?.civil?.supporters.includes(w.characterId!))revolt.civil.armies.push(id);
  s.armies.push({id,trainingStarted:w.day,trainingUntil:w.day+(c.service==='standing'?60:30),realm:r,location:c.site,troops:200,morale:60,supply:60,journey:null,siege:0,payer,arrears:0,foodRemainder:0,regiments:[{id:id+':1',kind:c.kind,service:c.service,origin:c.site,troops:200,experience:0}]});
 }else{
  const a=s.armies.find(a=>a.id===c.army)!;
  if(c.action==='split'){
   const u=a.regiments!.find(u=>u.id===c.regiment)!,share=u.troops/a.troops,supply=Math.floor(a.supply*share),arrears=Math.floor((a.arrears??0)*share);
   a.regiments=a.regiments!.filter(x=>x!==u);a.troops-=u.troops;a.supply-=supply;a.arrears!-=arrears;
   s.armies.push({...a,id:s.nextArmyId!++,troops:u.troops,regiments:[u],supply,arrears,foodRemainder:0});
  }else{
   const b=s.armies.find(b=>b.id===c.target)!;a.trainingStarted=Math.min(a.trainingStarted??w.day,b.trainingStarted??w.day);a.trainingUntil=Math.max(a.trainingUntil??0,b.trainingUntil??0);a.morale=Math.floor((a.morale*a.troops+b.morale*b.troops)/(a.troops+b.troops));a.troops+=b.troops;a.supply+=b.supply;a.arrears!+=b.arrears??0;a.foodRemainder!+=b.foodRemainder??0;a.regiments!.push(...b.regiments!);s.armies=s.armies.filter(x=>x!==b);
  }
 }
 w.chronicle.push({day:w.day,person:'player',text:c.action==='raise'?siteById[c.site].name+'征募 200 '+troopKinds[c.kind].name+'，人口与钱粮已划入军伍。':c.action==='split'?'已按兵团分军，兵员、随军粮与欠饷一并拆分。':'已合军，兵员、粮食与欠饷合并。'});w.chronicle=w.chronicle.slice(-100);
}

import {armyCommander} from './mobility';
import {authorityGrant} from './authority';
import {civilWar,civilCanAdmin,playerCommandsArmy} from './civilWars';
import {armyCampaign} from './militaryCampaigns';
import {enactPoliticalAction} from './politicalActions';
import type {World} from './types';
import type {Army} from './realm';
import {playerRealm} from './realm';
import {governmentMusterReason,spendGovernmentMuster} from './government';
import {centralAccount,publicBalance,ensureFiscal,fiscalRecord} from './treasury';
import {siteById} from '../data/scenario';
import {accountWallet} from './obligations';
import {armySupplyCapacity,mobilizedTransportLabor} from './armyLogistics';
export const troopKinds={
 shield:{name:'刀盾兵',cost:30,pay:100,attack:100,defence:115},
 spear:{name:'长矛兵',cost:30,pay:100,attack:105,defence:110},
 archer:{name:'弓弩兵',cost:40,pay:115,attack:120,defence:80},
 lightHorse:{name:'轻骑兵',cost:60,pay:140,attack:125,defence:95},
 heavyHorse:{name:'甲骑',cost:90,pay:180,attack:150,defence:140},
 siege:{name:'攻城队',cost:70,pay:130,attack:50,defence:70},
} as const;
export type TroopKind=keyof typeof troopKinds;
export interface Regiment {institution?:number;commanderLoyalty?:number;loyalTo?:string;cohesion?:number;id:string;kind:TroopKind;service:'levy'|'standing';origin:string;troops:number;experience:number;trainingStarted?:number;readyDay?:number}
export type ArmyCommand={type:'army';action:'raise';site:string;kind:TroopKind;service:Regiment['service'];target?:number}|{type:'army';action:'split';army:number;regiment:string}|{type:'army';action:'merge';army:number;target:number};
export function ensureArmyOrganization(w:World){
 const s=w.realm;if(!s)return;
 s.nextArmyId=Math.max(s.nextArmyId??1,...s.armies.map(a=>(a.id??0)+1));
 for(const a of s.armies){a.id??=s.nextArmyId++;a.payer??=centralAccount(a.realm);a.arrears??=0;a.foodRemainder??=0;
  a.regiments??=[{id:a.id+':1',kind:'shield',service:'levy',origin:a.location,troops:a.troops,experience:0}];
  for(const u of a.regiments){u.institution??=a.owner?30:60;u.commanderLoyalty??=a.owner?60:0;u.cohesion??=60;if(a.owner)u.loyalTo??=a.owner;}
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
export function readyTroops(a:Army,day:number){return a.regiments?.reduce((n,u)=>n+((u.readyDay??a.trainingUntil??0)<=day?u.troops:0),0)??((a.trainingUntil??0)<=day?a.troops:0);}
export function armyCombatFactor(a:Army,kind:'attack'|'defence',terrain:string,day=Infinity){
 if(!a.regiments?.length)return 1;
 return a.regiments.reduce((n,u)=>{const cavalry=u.kind==='lightHorse'||u.kind==='heavyHorse',land=cavalry&&terrain!=='平原'?.75:u.kind==='archer'&&terrain==='丘陵'?1.1:1,training=(u.readyDay??a.trainingUntil??0)>day?.45:1;return n+u.troops*troopKinds[u.kind][kind]/100*land*training*(1+u.experience/500)*(.7+(u.cohesion??60)/200);},0)/Math.max(1,a.troops);
}
/** A small, bounded matchup modifier derived from actual surviving regiments. */
export function armyMatchupFactor(ours:Army[],theirs:Army[],day:number){
 const mix=(armies:Army[])=>{const shares=new Map<TroopKind,number>();for(const a of armies)for(const u of a.regiments??[{kind:'shield' as const,troops:a.troops,readyDay:a.trainingUntil}])shares.set(u.kind,(shares.get(u.kind)??0)+u.troops*((u.readyDay??a.trainingUntil??0)>day?.45:1));const total=[...shares.values()].reduce((n,v)=>n+v,0);return new Map([...shares].map(([kind,n])=>[kind,n/Math.max(1,total)]));};
 const own=mix(ours),enemy=mix(theirs),share=(m:Map<TroopKind,number>,kind:TroopKind)=>(m.get(kind)??0);
 const edge=(a:Map<TroopKind,number>,b:Map<TroopKind,number>)=>.2*share(a,'spear')*(share(b,'lightHorse')+share(b,'heavyHorse'))+.15*(share(a,'lightHorse')+share(a,'heavyHorse'))*share(b,'archer')+.1*share(a,'archer')*(share(b,'shield')+share(b,'spear'))+.1*share(a,'shield')*share(b,'spear');
 return Math.min(1.2,Math.max(.85,1+edge(own,enemy)-edge(enemy,own)*.5));
}
export function consumeArmyFood(w:World,a:Army,dailyRate:number){
 // Rate is expressed in hundredths of a ration per 60 soldiers; preserve the fractional remainder.
 const total=(a.foodRemainder??0)+a.troops*dailyRate,need=Math.floor(total/6000);a.foodRemainder=total%6000;
 void w;return need;
}
export function payArmy(w:World,a:Army,want:number){
 const campaign=armyCampaign(w,a);
 const source=a.payer??centralAccount(a.realm),available=campaign?.remaining??accountWallet(w,source)?.read()??0,due=want+(a.arrears??0),paid=Math.min(available,due);
 if(campaign){campaign.remaining-=paid;campaign.spent+=paid;}else if(source.startsWith('person:'))accountWallet(w,source)!.write(available-paid);else if(source.startsWith('central:'))w.realm!.treasuries[a.realm].coins-=paid;else ensureFiscal(w)!.balances[source]=available-paid;
 a.arrears=due-paid;fiscalRecord(w,a.realm,campaign?'campaign:'+campaign.id:source,'expense',paid,'军饷与补发欠饷');
 if(a.arrears){a.morale=Math.max(0,a.morale-Math.min(20,Math.ceil(a.arrears/Math.max(1,want))*4));}
}
export function armyOrganizationReason(w:World,c:ArmyCommand){
 if('army'in c&&w.militaryCampaigns?.items.some(q=>q.status==='active'&&(q.army===c.army||c.action==='merge'&&q.army===c.target)))return '须先交接战役，才能调整编制';
 if(!w.realm||!w.characterId||w.campaign?.status!=='active')return '须有在世人物与有效政务身份';
 const s=w.realm,r=playerRealm(w);
 if(c.action==='raise'){
  const city=s.cities[c.site];if(!civilCanAdmin(w,w.characterId!,c.site))return '不能在内战对方控制地区征募';if(!city||city.owner!==r||city.controller!==r)return '须在本国法理和控制下征募';
  const grant=authorityGrant(w,w.characterId,'levy',{realm:r,site:c.site});if(!grant.allowed)return grant.reason;
  if(!Object.hasOwn(troopKinds,c.kind)||!['levy','standing'].includes(c.service))return '无效兵种或役制';
  if(c.target===undefined&&(s.armies.length>=48||s.armies.filter(a=>a.realm===r).length>=16))return '军队编制已满';
  if(c.target!==undefined){const a=s.armies.find(a=>a.id===c.target);if(!a||a.realm!==r||a.location!==c.site||a.journey||!playerCommandsArmy(w,a))return '须编入本城停驻且可统领的军队';const command=authorityGrant(w,w.characterId,'command',{realm:r,site:c.site,army:a});if(!command.allowed)return command.reason;if(a.convoy||armyCampaign(w,a)||civilWar(w,r))return '运粮、战役或内战期间不能扩编';if(a.payer!==grant.account)return '须由同一公库供饷';if(a.troops+200>6000||a.supply+60>armySupplyCapacity({...a,troops:a.troops+200}))return '超过兵额或随军粮容量';}
  if(city.population-mobilizedTransportLabor(w,c.site)<300)return '须保留至少 100 名居民';
  const source=authorityGrant(w,w.characterId!,'levy',{realm:r,site:c.site}).account!,cost=troopKinds[c.kind].cost*(c.service==='standing'?2:1);
  return publicBalance(w,source)<cost?'拨付公库不足 '+cost+' 钱':city.grain<60?'驻地粮仓不足 60':governmentMusterReason(w,r);
 }
 const a=s.armies.find(a=>a.id===c.army&&a.realm===r);if(!a)return '军队不存在';if(!playerCommandsArmy(w,a))return '不能调整内战对方军队';const grant=authorityGrant(w,w.characterId,'command',{realm:r,site:a.location,army:a});if(!grant.allowed)return grant.reason;if(civilWar(w,r))return '内战期间须保留各军编制';
 if(a.refusal)return '军队拒命期间须先安抚';
 if(a.journey||s.cities[a.location].controller!==r)return '须在本国驻地停驻整编';
 if(c.action==='split'){
  const u=a.regiments?.find(u=>u.id===c.regiment);return !u||u.troops<100||a.troops-u.troops<100?'两支军队均须至少 100 人':a.convoy?'粮队抵达后再分军':s.armies.length>=48||s.armies.filter(x=>x.realm===r).length>=16?'军队编制已满':'';
 }
 const b=s.armies.find(b=>b.id===c.target&&b.realm===r);
 if(b&&!authorityGrant(w,w.characterId,'command',{realm:r,site:b.location,army:b}).allowed)return '没有拟合入军队的指挥权';
 if(b&&b.owner!==a.owner)return '公军与私人部曲须先办理改编';
 if(b&&armyCommander(w,b))return '请先交接拟合入军队的将领';
 return !b||b===a||b.location!==a.location||b.journey?'须选择同城停驻的另一军队':a.convoy||b.convoy?'粮队抵达后再合军':a.payer!==b.payer?'须由同一公库供饷':a.troops+b.troops>6000||a.supply+b.supply>armySupplyCapacity({...a,troops:a.troops+b.troops})?'合军超出兵额或随军粮容量':'';
}
export function actArmyOrganization(w:World,c:ArmyCommand){
 const reason=armyOrganizationReason(w,c);if(reason)throw new Error(reason);ensureArmyOrganization(w);const s=w.realm!,r=playerRealm(w);
 if(c.action==='raise'){
  const city=s.cities[c.site],payer=authorityGrant(w,w.characterId!,'levy',{realm:r,site:c.site}).account!,cost=troopKinds[c.kind].cost*(c.service==='standing'?2:1),id=s.nextArmyId!++;
  enactPoliticalAction(w,r,'military',{source:'regiment:'+id,site:c.site,actor:w.characterId,authorizer:w.characterId,stage:'execution',scale:1,burden:c.service==='levy'?1:.5});spendGovernmentMuster(w,r);if(payer.startsWith('central:'))s.treasuries[r].coins-=cost;else ensureFiscal(w)!.balances[payer]=publicBalance(w,payer)-cost;
  fiscalRecord(w,r,payer,'expense',cost,'征募'+troopKinds[c.kind].name);city.population-=200;city.grain-=60;
  const revolt=civilWar(w,r);if(revolt?.civil?.supporters.includes(w.characterId!))revolt.civil.armies.push(id);
  const target=c.target===undefined?undefined:s.armies.find(a=>a.id===c.target);
  if(target){target.morale=Math.floor((target.morale*target.troops+60*200)/(target.troops+200));target.troops+=200;target.supply+=60;target.regiments!.push({id:id+':1',kind:c.kind,service:c.service,origin:c.site,troops:200,experience:0,trainingStarted:w.day,readyDay:w.day+(c.service==='standing'?60:30)});}
  else s.armies.push({id,trainingStarted:w.day,trainingUntil:w.day+(c.service==='standing'?60:30),realm:r,location:c.site,troops:200,morale:60,supply:60,journey:null,siege:0,payer,arrears:0,foodRemainder:0,regiments:[{id:id+':1',kind:c.kind,service:c.service,origin:c.site,troops:200,experience:0}]});
 }else{
  const a=s.armies.find(a=>a.id===c.army)!;
  if(c.action==='split'){
   const u=a.regiments!.find(u=>u.id===c.regiment)!,share=u.troops/a.troops,supply=Math.floor(a.supply*share),arrears=Math.floor((a.arrears??0)*share);
   a.regiments=a.regiments!.filter(x=>x!==u);a.troops-=u.troops;a.supply-=supply;a.arrears!-=arrears;
   s.armies.push({...a,id:s.nextArmyId!++,troops:u.troops,regiments:[u],supply,arrears,foodRemainder:0,trainingUntil:u.readyDay??a.trainingUntil});
  }else{
   const b=s.armies.find(b=>b.id===c.target)!;for(const u of b.regiments!)u.readyDay??=b.trainingUntil;a.morale=Math.floor((a.morale*a.troops+b.morale*b.troops)/(a.troops+b.troops));a.troops+=b.troops;a.supply+=b.supply;a.arrears!+=b.arrears??0;a.foodRemainder!+=b.foodRemainder??0;a.regiments!.push(...b.regiments!);delete w.mobility?.pendingCommanders?.[b.id!];s.armies=s.armies.filter(x=>x!==b);
  }
 }
 w.chronicle.push({day:w.day,person:'player',text:c.action==='raise'?siteById[c.site].name+'征募 200 '+troopKinds[c.kind].name+'，人口与钱粮已划入军伍。':c.action==='split'?'已按兵团分军，兵员、随军粮与欠饷一并拆分。':'已合军，兵员、粮食与欠饷合并。'});w.chronicle=w.chronicle.slice(-100);
}

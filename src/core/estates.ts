import {buildQuote,beginConstruction} from './construction';
import type {World} from './types';
import type {Project,EstateBuilding} from './construction';
import type {RegistrationPolicy} from '../data/governancePolicies';
import {regionalEconomy} from '../data/regionalEconomy';
import {siteById} from '../data/scenario';
import {historicalCharacters} from '../data/characters';
import {getPerson,allPeople,parentLinksOf} from './personRegistry';
import {isAlive,ageAt} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {accountWallet} from './obligations';
import {changeRelationOpinion} from './relationships';
import {governanceRules} from './governanceRules';
import {cityYield} from './realm';
import {sourceOccupied} from './manpower';

export type EstateRent='lenient'|'normal'|'heavy';
export interface Estate {
 id:string;owner:string;family:string;location:string;population:number;grain:number;rent:EstateRent;rentChanged:number;lastDecision:number;
 levels:Record<EstateBuilding,number>;project:Project|null;
 disposed?:number;
}
// Balance settings, not historical census or land measurements.
export const estatePolicies:Record<RegistrationPolicy,{name:string;tax:number;publicShare:number}>={
 compact:{name:'地方约定',tax:.4,publicShare:.25},survey:{name:'分步核籍',tax:.7,publicShare:.5},equalized:{name:'统一赋役',tax:1,publicShare:.75},
};
export const estateRents:Record<EstateRent,{name:string;share:number;description:string}>={
 lenient:{name:'宽缓',share:.25,description:'租入较低，安定时吸纳少量编户；粮荒时更易留人'},
 normal:{name:'常额',share:.4,description:'安定有粮时保持现有人口，收益与留存居中'},
 heavy:{name:'加重',share:.55,description:'当期租入较高；缺粮或秩序不足时庄户更易离开'},
};
export const estateCapacity=(e:Estate)=>e.disposed!==undefined?0:e.levels.fields*2000;
export const estateCommittedCapacity=(e:Estate)=>estateCapacity(e)+(e.disposed===undefined&&e.project?.building==='fields'?2000:0);
export const estateGrainCapacity=(e:Estate)=>e.disposed!==undefined?0:100+e.levels.storehouse*400;
export const allEstates=(w:World):Estate[]=>[w.holdings.estate,...Object.values(w.holdings.estates??{})];
export const estateById=(w:World,id:string)=>allEstates(w).find(e=>e.id===id);
export const estatesAt=(w:World,site:string)=>allEstates(w).filter(e=>e.location===site&&e.disposed===undefined);
export const ownedEstates=(w:World,id=w.characterId??'fictional')=>allEstates(w).filter(e=>e.owner===id&&e.disposed===undefined);
export const estatePopulation=(w:World,site:string)=>estatesAt(w,site).reduce((n,e)=>n+e.population,0);
export const ordinaryPopulation=(w:World,site:string)=>Math.max(0,(w.realm?.cities[site]?.population??0)-estatePopulation(w,site));
export const actualEstatePolicy=(w:World,site:string):RegistrationPolicy=>w.realm?.cities[site]?.estatePolicy??'compact';
export function estateAccessReason(w:World,e:Estate,owner=e.owner){
 if(e.disposed!==undefined)return '庄园已处置，庄户归入普通编户';
 if(owner!==e.owner)return '仅庄主可以支配这处家产';
 if(!isAlive(w,owner))return '庄主已故，等待家产交接';
 const c=w.realm?.cities[e.location],r=allegianceRealm(w,owner);
 if(c&&(c.owner!==c.controller||r&&c.controller!==r))return '所在县失守或处于敌境，暂停提租、支粮与征募';
 return '';
}
function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
export function initializeEstates(w:World,seed=false){
 if(!w.realm||w.holdings.estateVersion===1)return;
 const h=w.holdings,e=h.estate;
 Object.assign(e,{id:e.id??'estate:legacy',owner:e.owner??w.characterId??'fictional',population:e.population??0,grain:e.grain??0,rent:e.rent??'normal',rentChanged:e.rentChanged??0,lastDecision:e.lastDecision??w.day});
 h.estates??={};h.estateVersion=1;
 for(const [site,c] of Object.entries(w.realm.cities))c.estatePolicy??=c.controller!=='frontier'&&w.realm.governments?governanceRules(w,c.controller).reports?.[site]?.applied?governanceRules(w,c.controller).reports![site].registration:'compact':'compact';
 if(!seed)return; // Old saves gain metadata only: never money, grain, civilians or presumed soldier ancestry.
 e.owner=w.characterId??'fictional';e.id='estate:'+e.owner;
 e.levels={hall:2,fields:1,workshop:0,storehouse:0};
 e.population=Math.min(1200,Math.floor(w.realm.cities[e.location].population*.08));
 const families=new Set([e.family+'|'+e.location]);
 for(const p of historicalCharacters.filter(p=>p.role!=='scholar')){
  if(p.id===e.owner||!isAlive(w,p.id)||families.has(p.family+'|'+p.home)||Object.keys(h.estates).length>=96)continue;
  const c=w.realm.cities[p.home];if(!c||c.controller!==allegianceRealm(w,p.id))continue;
  const population=Math.min(1200,Math.floor(ordinaryPopulation(w,p.home)*.06));if(population<100)continue;
  const id='estate:'+p.id;h.estates[id]={id,owner:p.id,family:p.family,location:p.home,population,grain:0,rent:'normal',rentChanged:0,lastDecision:w.day,levels:{hall:2,fields:1,workshop:0,storehouse:0},project:null};families.add(p.family+'|'+p.home);
 }
}

/** One county harvest and one currency tax base. Civilian meals are deducted only by settleLocalGrain. */
export function estateEconomy(w:World,site:string,grossGrain:number,agriculturalBase:number){
 const c=w.realm!.cities[site],policy=estatePolicies[actualEstatePolicy(w,site)],population=Math.max(1,c.population),food=Math.ceil(c.population/150),surplus=Math.max(0,grossGrain-food);
 const rows=estatesAt(w,site).map(e=>{
  const employed=Math.min(e.population,estateCapacity(e)),share=employed/population,rent=estateRents[e.rent].share;
  // Cash rents are from agricultural cash output; grain rents never get sold and credited a second time.
  const coins=Math.floor(agriculturalBase*share*(2-policy.tax)*rent+employed/200*e.levels.workshop*rent);
  const grain=Math.floor(surplus*share*(1-policy.tax*.5)*rent);
  return {id:e.id,coins,grain};
 });
 const agriculturalTax=Math.floor(agriculturalBase*(ordinaryPopulation(w,site)+estatePopulation(w,site)*policy.tax)/population);
 return {rows,agriculturalTax,privateGrain:rows.reduce((n,e)=>n+e.grain,0)};
}
export function estateForecast(w:World,e:Estate){
 if(!w.realm)return {coins:4+e.levels.workshop*6,grain:e.levels.fields*6+e.levels.storehouse*3,loss:0};
 const row=cityYield(w,e.location).estates.find(v=>v.id===e.id),before=e.grain+(row?.grain??0),loss=Math.floor(before*(e.levels.storehouse?Math.max(.005,.03-e.levels.storehouse*.008):.03));
 return {coins:estateAccessReason(w,e)?0:row?.coins??0,grain:row?.grain??0,loss:loss+Math.max(0,before-loss-estateGrainCapacity(e))};
}
export function settleEstateIncome(w:World,rows:ReturnType<typeof estateEconomy>['rows']){
 for(const row of rows){const e=estateById(w,row.id)!;if(e.disposed!==undefined)continue;const wallet=accountWallet(w,'person:'+e.owner),coins=estateAccessReason(w,e)||!wallet?0:Math.min(row.coins,wallet.capacity-wallet.read());if(wallet&&coins)wallet.write(wallet.read()+coins);
  const before=e.grain+row.grain,loss=Math.floor(before*Math.max(.005,.03-e.levels.storehouse*.008));e.grain=Math.min(estateGrainCapacity(e),before-loss);
  if(e.owner===w.characterId||loss||before-loss>e.grain)log(w,`${getPerson(w,e.owner)?.name??'庄主'}庄园月结：租入 ${coins} 钱、粮租 ${row.grain}，庄粮 ${e.grain}，保管及溢出损耗 ${before-e.grain}。`);
 }
}
/** A proportional reduction keeps tenants a subset after starvation, raids, migration or capture losses. */
export function removeCountyPopulation(w:World,site:string,amount:number){
 const c=w.realm!.cities[site],removed=Math.min(c.population,Math.max(0,Math.floor(amount))),before=c.population;
 for(const e of estatesAt(w,site))e.population-=Math.min(e.population,Math.floor(e.population*removed/Math.max(1,before)));
 c.population-=removed;return removed;
}
export function restoreEstatePopulation(w:World,id:string|undefined,site:string,amount:number){const e=id?estateById(w,id):undefined;if(e&&e.location===site&&e.disposed===undefined)e.population+=Math.min(amount,Math.max(0,estateCapacity(e)-e.population-sourceOccupied(w,site,id).total));}

export type EstateCommand={type:'estate';action:'found';site:string}|{type:'estate';action:'tenants'|'relief'|'withdraw';estate:string;amount:number}|{type:'estate';action:'rent';estate:string;rent:EstateRent};
export function estateQuote(w:World,c:EstateCommand,actor=w.characterId??'fictional'){
 const e='estate'in c?estateById(w,c.estate):undefined,wallet=accountWallet(w,'person:'+actor),amount='amount'in c?c.amount:0,coins=c.action==='found'?120:c.action==='tenants'?Math.ceil(amount/10):0,grain=c.action==='tenants'?Math.ceil(amount/100):c.action==='relief'||c.action==='withdraw'?amount:0;
 let reason=!['found','tenants','rent','relief','withdraw'].includes(c.action)?'无效庄园行动':!w.realm?'完整庄园经营仅在沙盒中开放':!isAlive(w,actor)||(ageAt(w,actor)??0)<16?'须由在世成年庄主决定':!wallet?'没有可用私人钱包':'';
 if(!reason&&c.action==='found'){
  const city=w.realm!.cities[c.site];reason=!siteById[c.site]||!city?'无效地点':city.owner!==city.controller||city.controller!==allegianceRealm(w,actor)?'仅可在本国实际控制的县域置业':allEstates(w).length>=128?'庄园登记已满':estatesAt(w,c.site).reduce((n,e)=>n+estateCommittedCapacity(e),0)+2000>regionalEconomy(c.site).capacity?'本县经营容量不足':ownedEstates(w,actor).some(e=>e.location===c.site)?'本县已有本人庄园，请扩建田庄':'';
 }else if(!reason){
  reason=!e?'庄园不存在':estateAccessReason(w,e,actor);
  if(!reason&&'amount'in c){reason=!Number.isSafeInteger(amount)||amount<1||amount>2000?'数量须为 1 至 2000 的整数':c.action==='tenants'&&amount>Math.min(ordinaryPopulation(w,e!.location),estateCapacity(e!)-e!.population-sourceOccupied(w,e!.location,e!.id).total)?'编户或空余承载不足；同源现役与返乡兵员仍占安置规模':e!.grain<grain?'庄粮不足':'';}
  if(!reason&&c.action==='rent')reason=!Object.hasOwn(estateRents,c.rent)?'无效租额':c.rent===e!.rent?'已采用此租额':w.day-e!.rentChanged<90?'调整租额须间隔 90 日':'';
  if(!reason&&c.action==='withdraw')reason=w.people[0].journey||w.people[0].location!==e!.location?'提取行粮须本人抵达庄园':w.people[0].food+grain>1_000_000?'随身行粮容量不足':'';
  if(!reason&&c.action==='relief'&&w.realm!.cities[e!.location].grain+grain>1_000_000)reason='本县公仓无法接收全部赈粮';
 }
 if(!reason&&wallet!.read()<coins)reason='私人钱不足';
 const policy=e?estatePolicies[actualEstatePolicy(w,e.location)]:null;
 return {reason,coins,grain,publicChange:c.action==='tenants'?Math.floor(amount*.04*(1-(policy?.publicShare??0))):0};
}
export function actEstate(w:World,c:EstateCommand,actor=w.characterId??'fictional'){
 const q=estateQuote(w,c,actor);if(q.reason)throw new Error(q.reason);const wallet=accountWallet(w,'person:'+actor)!;wallet.write(wallet.read()-q.coins);
 if(c.action==='found'){const p=getPerson(w,actor)!,id='estate:'+actor+':'+c.site;w.holdings.estates??={};w.holdings.estates[id]={id,owner:actor,family:p.family,location:c.site,population:0,grain:0,rent:'normal',rentChanged:w.day,lastDecision:w.day,levels:{hall:1,fields:0,workshop:0,storehouse:0},project:{building:'fields',level:1,started:w.day,due:w.day+10,cost:40}};log(w,`${p.name}在${siteById[c.site].name}置业，民间置业 80 钱、田庄营建 40 钱，需十日，尚无庄户。`);return;}
 const e=estateById(w,c.estate)!;
 if(c.action==='rent'){e.rent=c.rent;e.rentChanged=w.day;}
 else {e.grain-=q.grain;if(c.action==='tenants')e.population+=c.amount;else if(c.action==='relief')w.realm!.cities[e.location].grain+=c.amount;else w.people[0].food+=c.amount;}
 log(w,`${getPerson(w,actor)?.name??'庄主'}：${c.action==='tenants'?'安置 '+c.amount+' 名本县编户，县域人口未增加':c.action==='rent'?'租额改为'+estateRents[c.rent].name:c.action==='relief'?'庄粮 '+c.amount+' 转入本县民食公仓':'本人提取 '+c.amount+' 行粮'}。`);
}
export function inheritEstates(w:World,owner:string,successor?:string){
 const heir=successor&&isAlive(w,successor)?getPerson(w,successor):allPeople(w).filter(p=>isAlive(w,p.id)&&p.id!==owner&&p.family===getPerson(w,owner)?.family&&parentLinksOf(w).some(v=>v.parent===owner&&v.child===p.id)).sort((a,b)=>(ageAt(w,b.id)??0)-(ageAt(w,a.id)??0))[0];
 for(const e of ownedEstates(w,owner)){if(heir){e.owner=heir.id;e.family=heir.family;log(w,`${heir.name}承继${siteById[e.location].name}庄园，原庄户、庄粮及工程保留。`);}else{e.disposed=w.day;const c=w.realm?.cities[e.location];if(c){const kept=Math.min(e.grain,1_000_000-c.grain);c.grain+=kept;log(w,`无继任人：${siteById[e.location].name}庄园归当地经营，${e.population} 庄户回归普通编户；庄粮入公仓 ${kept}，处置损失 ${e.grain-kept}${e.project?'，未完工程支出 '+e.project.cost+' 不再退款':''}。`);}e.population=0;e.grain=0;e.project=null;}}
}
/** Simultaneous monthly attachment changes: common tenants remain stable; no first-estate advantage. */
export function advanceEstateTenants(w:World){
 if(!w.realm)return;
 for(const site of Object.keys(w.realm.cities)){const c=w.realm.cities[site],estates=estatesAt(w,site).filter(e=>!estateAccessReason(w,e)),cap=Math.floor(c.population*.01);let left=cap;
  const losses=estates.map(e=>({e,want:c.order<45||c.grain+e.grain<Math.ceil(c.population/150)?Math.min(e.population,Math.ceil(e.population*(e.rent==='heavy'?.03:e.rent==='normal'?.01:.003))):0})),totalLoss=losses.reduce((n,v)=>n+v.want,0);
  for(const {e,want} of losses){const lost=totalLoss?Math.floor(Math.min(cap,totalLoss)*want/totalLoss):0;e.population-=lost;left-=lost;}
  const wants=estates.map(e=>({e,want:e.rent==='lenient'&&c.order>=60&&c.grain>0?Math.max(0,Math.min(20,estateCapacity(e)-e.population-sourceOccupied(w,site,e.id).total)):0})),total=wants.reduce((n,v)=>n+v.want,0),pool=Math.min(left,ordinaryPopulation(w,site),total);
  for(const {e,want} of wants)if(total)e.population+=Math.floor(pool*want/total);
 }
}
export function advanceEstateAI(w:World){
 for(const e of allEstates(w)){if(e.owner===w.characterId||e.disposed!==undefined||w.day-e.lastDecision<90||estateAccessReason(w,e))continue;e.lastDecision=w.day;const wallet=accountWallet(w,'person:'+e.owner);if(!wallet||wallet.read()<100)continue;
  if(w.realm!.cities[e.location].order<45&&e.rent!=='lenient'){const c:EstateCommand={type:'estate',action:'rent',estate:e.id,rent:'lenient'};if(!estateQuote(w,c,e.owner).reason)actEstate(w,c,e.owner);continue;}
  const building:EstateBuilding|null=e.grain>=80&&e.levels.storehouse===0?'storehouse':e.population>=estateCapacity(e)*.8&&e.levels.fields<3?'fields':null;if(building&&wallet.read()>=300){const cmd={type:'build',scope:'estate',site:e.location,estate:e.id,building} as const;if(!buildQuote(w,cmd,e.owner).reason){beginConstruction(w,cmd,e.owner);continue;}}
  const amount=Math.min(100,ordinaryPopulation(w,e.location),estateCapacity(e)-e.population-sourceOccupied(w,e.location,e.id).total);const c:EstateCommand={type:'estate',action:'tenants',estate:e.id,amount};if(amount>0&&!estateQuote(w,c,e.owner).reason)actEstate(w,c,e.owner);
 }
}

export function applyEstatePolicy(w:World,site:string,policy:RegistrationPolicy,issuer:string){
 const city=w.realm!.cities[site],old=actualEstatePolicy(w,site);if(old===policy)return;
 const delta=Math.round((estatePolicies[old].tax-estatePolicies[policy].tax)*20);city.estatePolicy=policy;
 for(const owner of new Set(estatesAt(w,site).filter(e=>e.population&&e.owner!==issuer).map(e=>e.owner)))changeRelationOpinion(w,owner,issuer,delta);
 log(w,siteById[site].name+'实际赋役改为'+estatePolicies[policy].name+'，当地庄主关系反馈 '+delta+'；现役不删除，原兵源继续占额。');
}

export function validEstates(w:World){
 if(w.holdings.estateVersion===undefined)return !w.holdings.estates;
 if(w.holdings.estateVersion!==1||!w.realm||!w.holdings.estates||typeof w.holdings.estates!=='object'||Array.isArray(w.holdings.estates))return false;
 const estates=allEstates(w),seen=new Set<string>(),int=(v:unknown,max:number)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
 if(estates.length>128)return false;
 for(const e of estates){if(!e||!e.levels||typeof e.levels!=='object'||Array.isArray(e.levels)||typeof e.id!=='string'||e.id.length>120||seen.has(e.id)||!getPerson(w,e.owner)||!siteById[e.location]||!int(e.population,1_000_000)||!int(e.grain,estateGrainCapacity(e))||!Object.hasOwn(estateRents,e.rent)||!int(e.rentChanged,w.day)||!int(e.lastDecision,w.day)||e.disposed!==undefined&&(!int(e.disposed,w.day)||e.population!==0||e.grain!==0||e.project!==null)||e.population>estateCapacity(e))return false;seen.add(e.id);}
 for(const [id,e] of Object.entries(w.holdings.estates))if(id!==e.id)return false;
 for(const [site,c] of Object.entries(w.realm.cities))if(!Object.hasOwn(estatePolicies,c.estatePolicy??'')||estatePopulation(w,site)>c.population||estatesAt(w,site).reduce((n,e)=>n+estateCommittedCapacity(e),0)>regionalEconomy(site).capacity)return false;
 return true;
}

/** Strict validation still checks all existing fields; this fills only missing legacy metadata. */
export function migrateEstates(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return;
 const w=value as World,h=w.holdings;
 if(!h||!h.estate||typeof h.estate!=='object'||!h.estate.levels)return;
 const e=h.estate;
 if(h.estateVersion===undefined){e.id??='estate:legacy';e.owner??=w.characterId??'fictional';e.population??=0;e.grain??=0;e.rent??='normal';e.rentChanged??=0;e.lastDecision??=w.day;}
 if(w.realm&&w.realm.cities&&w.realm.governments)initializeEstates(w);
}

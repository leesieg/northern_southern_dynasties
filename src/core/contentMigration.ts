import {countyOfficials,officeReserves} from '../data/localOfficials';
import {CONTENT_VERSION,siteById} from '../data/scenario';
import {expandedSeats} from '../data/expandedGeography';
import {expandedPeople} from '../data/expandedPeople';
import {relationshipPeople} from '../data/relationships';
import {newCourt} from './court';
import {prestigeMembers} from './family';
import {regionalEconomy} from '../data/regionalEconomy';
import {healthCapacity,ageAt} from './lifeState';
import type {World} from './types';
import {monthStart,nextMonthStart} from './calendar';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** One-shot upgrade before normal validation. Balances and historical values are
 * preserved; scheduling metadata changes only after legacy date validation. */
export function upgradeContent(value:unknown){
 if(!object(value)||value.version!==2)return;
 if(['546-map-0.1','546-map-0.2','546-map-0.3','546-map-0.4','546-map-0.5'].includes(String(value.contentVersion)))upgradeCalendar(value);
 if(value.contentVersion==='546-map-0.5'){value.contentVersion=CONTENT_VERSION;return;}
 if(value.contentVersion==='546-map-0.2'||value.contentVersion==='546-map-0.3'||value.contentVersion==='546-map-0.4'){upgradeOfficials(value);return;}
 if(value.contentVersion!=='546-map-0.1')return;
 if(!Number.isSafeInteger(value.day)||Number(value.day)<0||Number(value.day)>365000)return;
 const day=Number(value.day),w=value as unknown as World;
 if(object(value.realm)&&object(value.realm.cities))for(const [id] of expandedSeats){
  if(Object.hasOwn(value.realm.cities,id))throw new Error('旧版存档包含新版地点，无法安全升级。');
  const s=siteById[id];value.realm.cities[id]={owner:s.polity,controller:s.polity,governor:null,population:regionalEconomy(id).initialPopulation,grain:0,irrigation:0,order:70,prosperity:50,tax:'normal'};
 }
 for(const p of expandedPeople){
  if(object(value.life)&&object(value.life.people)&&!Object.hasOwn(value.life.people,p.id))value.life.people[p.id]={health:healthCapacity(ageAt(w,p.id)??18),illness:null,careUntil:0,death:null};
  if(object(value.relationships)){
   if(object(value.relationships.reserves)&&!Object.hasOwn(value.relationships.reserves,p.id))value.relationships.reserves[p.id]=0;
   if(object(value.relationships.maritalBasis)&&!Object.hasOwn(value.relationships.maritalBasis,p.id))value.relationships.maritalBasis[p.id]='free';
  }
  if(object(value.mobility)&&object(value.mobility.residences)&&!Object.hasOwn(value.mobility.residences,p.id))value.mobility.residences[p.id]={site:p.home,journey:null};
 }
 // Only previously untracked members gain zero-valued prestige accounts.
 if(object(value.families)&&object(value.families.prestige))for(const p of prestigeMembers){
  if(p.id==='fictional'||relationshipPeople.find(r=>r.id===p.id)?.status==='roster')continue;
  if(!Object.hasOwn(value.families.prestige,p.id))value.families.prestige[p.id]=0;
 }
 if(w.realm?.governments)for(const r of ['liang','east','west'] as const){const court=w.realm.governments.realms[r].court;if(court?.members&&object(court.members)){const fresh=newCourt(w,r);for(const p of expandedPeople.filter(p=>p.realm===r))if(!Object.hasOwn(court.members,p.id))court.members[p.id]=fresh.members[p.id];}}
 upgradeOfficials(value);
 value.contentVersion=CONTENT_VERSION;
 if(Array.isArray(value.chronicle)){value.chronicle.push({day,person:'player',text:'州郡与人物名录已增补。既有地点人口、钱粮及进行中事项保留；新增县域人口为剧本估计，未追溯结算收入。'});if(value.chronicle.length>100)value.chronicle.shift();}
}

/** Change scheduling metadata only; keep balances, claims and dated historical entries. */
function upgradeCalendar(value:Record<string,unknown>){
 if(!Number.isSafeInteger(value.day)||Number(value.day)<0||Number(value.day)>365000)return;
 const w=value as unknown as World,day=w.day,current=monthStart(day,w.scriptId);
 const align=(owner:unknown,key:string,required=false)=>{
  if(!object(owner))return;
  const date=owner[key],since=owner.since;
  if((required||date!==undefined)&&(!Number.isSafeInteger(date)||Number(date)<0||Number(date)>day||Number(date)%30||since!==undefined&&(!Number.isSafeInteger(since)||Number(since)<0||Number(since)>day||Number(date)<Math.floor(Number(since)/30)*30)))throw new Error('旧版存档的月结日期不合法，无法升级。');
  owner[key]=current;
 };
 for(const owner of [w.life,w.families,w.relationships,w.realm?.governments])align(owner,'lastMonthly',true);
 for(const owner of [w.retinue,w.diplomacy])align(owner,'lastMonth',true);
 for(const g of Object.values(w.realm?.governments?.realms??{}))align(g?.court,'lastMonthly',true);
 for(const owner of [w.holdings,w.social,w.realm])align(owner,'lastMonthly');
 align(w.realm,'lastInfluenceIncome');align(w.realm?.local,'lastNPCRecruitment');
 for(const b of Object.values(w.economy?.budgets??{}))align(b,'lastMonth',true);
 for(const d of [...(w.obligations?.items??[]),...(w.realm?.reparations??[])]){
  if(!object(d)||!Number.isSafeInteger(d.next)||Number(d.next)<0||Number(d.next)>day+30)throw new Error('旧版存档的偿付日期不合法，无法升级。');
  d.next=nextMonthStart(day,w.scriptId);
 }
 for(const t of w.householdPlans?.tuition??[]){
  if(!object(t)||!Number.isSafeInteger(t.next)||Number(t.next)<0||Number(t.next)>day+30)throw new Error('旧版存档的学资日期不合法，无法升级。');
  t.next=nextMonthStart(day,w.scriptId);t.billingWork=t.completed*30+t.progress;
 }
 value.calendarSince=day;
}

function upgradeOfficials(value:Record<string,unknown>){
 if(!Number.isSafeInteger(value.day)||Number(value.day)<0)return;const w=value as unknown as World;
 for(const p of [...countyOfficials,...officeReserves]){
 if(w.life?.people&&!Object.hasOwn(w.life.people,p.id))w.life.people[p.id]={health:healthCapacity(ageAt(w,p.id)??30),illness:null,careUntil:0,death:null};
 if(w.relationships?.reserves&&!Object.hasOwn(w.relationships.reserves,p.id))w.relationships.reserves[p.id]=0;
 if(w.relationships?.maritalBasis&&!Object.hasOwn(w.relationships.maritalBasis,p.id))w.relationships.maritalBasis[p.id]='free';
 if(w.mobility?.residences&&!Object.hasOwn(w.mobility.residences,p.id))w.mobility.residences[p.id]={site:p.home,journey:null};
 if(w.families?.prestige&&!Object.hasOwn(w.families.prestige,p.id))w.families.prestige[p.id]=0;
 if(w.realm?.personalInfluence&&!Object.hasOwn(w.realm.personalInfluence,p.id))w.realm.personalInfluence[p.id]=0;
 }
 if(w.realm?.governments)for(const r of ['liang','east','west'] as const){const g=w.realm.governments.realms[r],court=g.court;for(const p of officeReserves.filter(p=>p.realm===r))g.merit[p.id]??=p.initialMerit;if(court?.members){const fresh=newCourt(w,r);for(const p of [...countyOfficials,...officeReserves].filter(p=>p.realm===r))court.members[p.id]??=fresh.members[p.id];}}
 value.contentVersion=CONTENT_VERSION;
}

import {relationshipPersonById} from '../data/relationships';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {clanStanding} from './clans';
import {recommendationBonus} from './retinue';
import {isAlive} from './lifeState';
import { syncRelationships } from './relationships';
import { historicalCharacters } from '../data/characters';
import { movements,movementIds,ministries,ministryIds,type MovementId,type MinistryId,type CourtPhase,type CourtPolicy } from '../data/court';
import { governmentOf,governingExecutives,currentRealm,governmentExecutive,politicalName,regimeName } from './government';
import { realms,type RealmId } from './realm';
import { familyStanding } from './family';
import { traitsFor,acceptance } from './social';
import type { World } from './types';
export interface CourtState {
 version:1;since:number;lastMonthly:number;regimeId:string;tenure:string;phase:CourtPhase;policy:CourtPolicy;tension:number;corruption:number;
 ministries:Record<MinistryId,string|null>;members:Record<string,MovementId>;favored:MovementId|null;
 boosts:Record<string,{until:number;power:number}>;cooldowns:Record<string,number>;
 petition:{group:MovementId;sponsor:string;due:number}|null;
 founding:{name:string;mode:'usurp'|'unify';sponsor:string;started:number;progress:number;required:120}|null;
 history:{day:number;text:string}[];
}
export type CourtCommand={type:'court';action:'seek-office';ministry:MinistryId}|{type:'court';action:'join';group:MovementId}|{type:'court';action:'convince';target:string}|{type:'court';action:'debate'|'petition'|'audit'|'cancel'}|{type:'court';action:'favor';group:MovementId}|{type:'court';action:'appoint';ministry:MinistryId;candidate:string|null}|{type:'court';action:'resolve';accept:boolean}|{type:'court';action:'found';name:string;mode:'usurp'|'unify'};
const cap=(v:number,max=100)=>Math.max(0,Math.min(max,Math.round(v)));
const capitals:Record<RealmId,string>={liang:'jiankang',east:'ye',west:'changan'};
const roster=(r:RealmId)=>historicalCharacters.filter(p=>p.polity===r);
export const courtOf=(w:World,r=currentRealm(w))=>governmentOf(w,r)?.court;
export const courtEnabled=(w:World,r:RealmId)=>['celestial','meritocratic','khanate'].includes(governmentOf(w,r)?.type??'');
export function newCourt(w:World,r:RealmId):CourtState{
 const g=governmentOf(w,r)!;
 return {version:1,since:w.day,lastMonthly:Math.floor(w.day/30)*30,regimeId:g.regimeId,tenure:g.ruler+'|'+governingExecutives(w,r).join('|'),phase:'stable',policy:'consolidation',tension:15,corruption:0,ministries:Object.fromEntries(ministryIds.map(k=>[k,null])) as CourtState['ministries'],members:Object.fromEntries(roster(r).map(p=>[p.id,p.id===g.ruler?'unaligned':p.role==='prince'?'dynastic':p.role==='commander'?'expansion':p.role==='regent'?'reform':'conservative'])),favored:null,boosts:{},cooldowns:{},petition:null,founding:null,history:[]};
}
export function ensureCourts(w:World){if(!w.realm?.governments)return;for(const r of realms)governmentOf(w,r)!.court??=newCourt(w,r);}
function log(w:World,r:RealmId,text:string){const c=courtOf(w,r)!;c.history.push({day:w.day,text});c.history=c.history.slice(-60);}
export function ministryCompetent(w:World,r:RealmId,m:MinistryId){const holder=courtOf(w,r)?.ministries[m];return !!holder&&(governmentOf(w,r)!.merit[holder]??0)>=40;}
export function movementPowerParts(w:World,r:RealmId,id:string){
 if(!isAlive(w,id)||governmentOf(w,r)?.ruler===id||allegianceRealm(w,id)!==r)return [];
 const c=courtOf(w,r)!,g=governmentOf(w,r)!,cities=Object.values(w.realm!.cities).filter(p=>p.owner===r&&p.controller===r&&p.governor===id),group=c.members[id],traits=traitsFor(w,id);
 return [{label:'政治资历',value:10+Math.floor((g.merit[id]??0)/5)},{label:'中央职掌',value:Object.values(c.ministries).filter(p=>p===id).length*20},{label:'地方人口与税基',value:Math.min(60,cities.reduce((n,c)=>n+Math.floor(c.population/1000)+Math.floor(c.population*c.prosperity/50000),0))},{label:'统领军队',value:w.mobility?.commanders[r]===id?Math.floor((w.realm!.armies.find(a=>a.realm===r)?.troops??0)/20):0},{label:'家族声望',value:familyStanding(w,id).tier*3},{label:'政治倾向',value:(group==='reform'&&traits.includes('diligent')||group==='conservative'&&traits.includes('frugal')||group==='dynastic'&&traits.includes('gregarious')||group==='expansion'&&traits.includes('steadfast'))?5:0},{label:'清议动员',value:c.boosts[id]?.until>w.day?c.boosts[id].power:0},{label:'实际执政',value:governingExecutives(w,r).includes(id)?10:0}];
}
export function movementPower(w:World,r:RealmId,id:string){return movementPowerParts(w,r,id).reduce((n,p)=>n+p.value,0);}
export function movementSummary(w:World,r:RealmId,group:MovementId){const c=courtOf(w,r)!;const members=Object.keys(c.members).filter(id=>isAlive(w,id)&&id!==governmentOf(w,r)!.ruler&&allegianceRealm(w,id)===r&&c.members[id]===group).sort((a,b)=>movementPower(w,r,b)-movementPower(w,r,a)||a.localeCompare(b));const power=members.reduce((n,id)=>n+movementPower(w,r,id),0),total=Object.keys(c.members).reduce((n,id)=>n+movementPower(w,r,id),0);return {members,power,share:total?Math.floor(power*100/total):0,leader:group==='unaligned'?null:members[0]??null};}
/** Derived from live political conditions; no second membership or satisfaction ledger. */
export function movementMood(w:World,r:RealmId,group:MovementId){
 const c=courtOf(w,r)!,g=governmentOf(w,r)!,m=movementSummary(w,r,group),factors:{label:string;value:number}[]=[];
 const add=(label:string,value:number)=>factors.push({label,value});
 if(group==='unaligned'||!m.members.length)return {...m,satisfaction:50,factors,tension:0,support:0};
 add('基本认同',50);
 if(c.favored===group)add('朝廷眷顾',20);else if(c.favored)add('他派受眷顾',-10);
 const aligned=group==='reform'?c.policy==='reform':group==='expansion'?c.policy==='expansion':group==='conservative'?c.policy==='consolidation':null;
 if(aligned!==null)add(aligned?'国策符合诉求':'国策背离诉求',aligned?20:-15);
 const occupied=Object.values(c.ministries).filter((id):id is string=>!!id&&isAlive(w,id));
 if(occupied.length){const seats=occupied.filter(id=>c.members[id]===group).length;add('中央任职份额',Math.max(-15,Math.min(15,Math.round((seats/occupied.length-m.share/100)*30))));}
 if(group==='dynastic')add('君主合法性',Math.round((g.legitimacy-50)/3));
 if(group==='reform'||group==='conservative')add('官场积弊',-Math.floor(c.corruption/5));
 if(w.realm!.war&&[w.realm!.war.attacker,w.realm!.war.defender].includes(r))add('战争立场',group==='expansion'?10:group==='conservative'?-15:-5);
 const satisfaction=cap(factors.reduce((n,v)=>n+v.value,0));
 const tension=satisfaction<40?Math.ceil(m.share*(40-satisfaction)/200):satisfaction>=70?-Math.floor(m.share*(satisfaction-60)/500):0;
 const support=satisfaction<30?-Math.ceil(m.share/25):satisfaction>=70?Math.floor(m.share/25):0;
 return {...m,satisfaction,factors,tension,support};
}
export function courtBonus(w:World,r:RealmId){
 const c=courtOf(w,r);if(!c||!courtEnabled(w,r))return {tax:0,pay:0,attack:0};
 return {tax:(c.phase==='strained'?-10:c.phase==='chaos'?-25:0)+(ministryCompetent(w,r,'finance')?8:0)+(c.phase==='stable'&&c.policy==='reform'?8:0),pay:(ministryCompetent(w,r,'military')?-8:0)+(c.phase==='chaos'?15:c.phase==='stable'&&c.policy==='expansion'?5:0),attack:c.phase==='stable'?(c.policy==='expansion'?10:c.policy==='reform'?-5:0):0};
}
export function controlledShare(w:World,r:RealmId){const cities=Object.values(w.realm!.cities).filter(c=>c.owner!=='frontier');return cities.length?Math.floor(cities.filter(c=>c.owner===r&&c.controller===r).length*100/cities.length):0;}
export function foundingPause(w:World,r:RealmId){const c=courtOf(w,r),f=c?.founding;if(!f)return '';const g=governmentOf(w,r)!;const capital=w.realm!.cities[capitals[r]];
 if(!courtEnabled(w,r))return '当前政体不支持朝廷拥立';if(w.realm!.war&&[w.realm!.war.attacker,w.realm!.war.defender].includes(r))return '战争中暂停';if(capital.owner!==r||capital.controller!==r)return '都城失守，暂停';if(g.support<60)return '朝野支持低于 60';
 if(f.mode==='unify')return controlledShare(w,r)<75||g.legitimacy<80?'重建天朝需实控 75% 已录非边疆城市、天命 80':'';
 const group=c!.members[f.sponsor];return group==='unaligned'||movementSummary(w,r,group).leader!==f.sponsor||movementSummary(w,r,group).share<50?'拥立集团需由发起人领衔、势力至少 50%':'';
}
export function courtReason(w:World,cmd:CourtCommand):string{
 if(!w.realm||!w.characterId||w.campaign?.status!=='active')return '仅历史沙盒可用';const r=currentRealm(w),g=governmentOf(w)!,c=courtOf(w);if(!c)return '请重新读取以初始化朝廷';if(!courtEnabled(w,r))return '需贤能、天朝或宫帐政体';if(w.realm.event)return '先处理待决事务';
 if(cmd.action==='convince'&&!isAlive(w,cmd.target))return '人物已经去世';
 const id=w.characterId,t=w.realm.treasuries[r],group=c.members[id],key=cmd.action==='join'?'join|'+id:cmd.action==='debate'?'debate|'+id:cmd.action==='convince'?'convince|'+id:cmd.action==='appoint'||cmd.action==='seek-office'?'appoint|'+cmd.ministry:cmd.action;
 if((c.cooldowns[key]??0)>w.day)return '行动冷却中，余 '+(c.cooldowns[key]-w.day)+' 日';
 if(['join','convince','debate','petition'].includes(cmd.action)&&g.ruler===id)return '君主通过眷顾和裁决协调集团，不以普通成员结党';
 if(cmd.action==='join')return !movementIds.includes(cmd.group)?'未知集团':cmd.group===group?'已在此集团':w.realm.influence<10?'需影响力 10':'';
 if(cmd.action==='convince')return !Object.hasOwn(c.members,cmd.target)||cmd.target===id?'需本国其他已录人物':group==='unaligned'?'先加入政治集团':c.members[cmd.target]===group?'已是同道':w.people[0].coins<30||w.realm.influence<10?'需个人钱 30、影响力 10':acceptance(w,cmd.target).reduce((s,v)=>s+v.value,0)+(c.favored===group?15:0)<50?'游说接受度需达到 50（受眷顾集团 +15）':'';
 if(cmd.action==='debate')return group==='unaligned'?'未结党不能清议':w.people[0].coins<30?'清议需个人钱 30':'';
 if(cmd.action==='petition')return c.petition?'已有集团奏议待决':group==='unaligned'||movementSummary(w,r,group).leader!==id?'需担任集团领袖':w.realm.influence<15?'奏议需影响力 15':'';
 if(cmd.action==='seek-office')return !ministryIds.includes(cmd.ministry)?'未知中央职位':c.ministries[cmd.ministry]!==null?'此职位已有任官':Object.values(c.ministries).includes(id)?'你已有中央职掌':(g.merit[id]??0)<40?'请任需功绩 40':(g.merit[id]??0)<60&&acceptance(w,governingExecutives(w,r)[0]).reduce((n,v)=>n+v.value,0)+(clanStanding(w,id)?.petition??0)+recommendationBonus(w,id)<60?'需功绩 60 或执政者接受度 60（含门第与荐举）':w.realm.influence<25?'请任需影响力 25':'';
 if(cmd.action==='cancel')return !c.founding?'没有拥立议程':c.founding.sponsor!==id&&!governmentExecutive(w)?'仅发起人或执政者可撤回':'';
 if(cmd.action==='found'){
  if(typeof cmd.name!=='string'||!/^\p{Script=Han}{1,6}$/u.test(cmd.name.trim()))return '国号须为 1—6 个汉字';if(!['usurp','unify'].includes(cmd.mode))return '未知建朝方式';
  if(realms.some(other=>regimeName(w,other)===cmd.name.trim()))return '国号与现存政权重复';
  if(c.founding||g.task)return '已有改革或拥立议程';if(w.realm.governments!.regimes.filter(v=>v.realm===r).length>=12)return '本局已达 12 个政权版本上限';
  if(g.support<70||(g.merit[id]??0)<60)return '需朝野支持 70、本人功绩 60';
  if(cmd.mode==='usurp'&&(g.ruler===id||g.legitimacy>40&&c.phase!=='chaos'))return '拥立需当前君主失德（合法性 ≤40 或危局），且你不是在位君主';
  if(cmd.mode==='usurp'&&(!Object.values(c.ministries).includes(id)&&!Object.values(w.realm.cities).some(city=>city.owner===r&&city.controller===r&&city.governor===id)&&!governingExecutives(w,r).includes(id)))return '需中央任官、在任辖地或实际执政基础';
  if(cmd.mode==='usurp'&&(group==='unaligned'||movementSummary(w,r,group).leader!==id||movementSummary(w,r,group).share<50))return '需领衔势力至少 50% 的政治集团';
  if(cmd.mode==='unify'&&(!governmentExecutive(w)||controlledShare(w,r)<75||g.legitimacy<80))return '重建天朝需实际执政、实控 75% 已录非边疆城市、天命 80';
  if(w.realm.war&&[w.realm.war.attacker,w.realm.war.defender].includes(r))return '战争期间不能建朝';const capital=w.realm.cities[capitals[r]];if(capital.owner!==r||capital.controller!==r)return '需控制本国都城';
  return t.coins<300||w.realm.influence<80?'建朝需公款 300、影响力 80':'';
 }
 if(!governmentExecutive(w))return '需要实际执政权';
 if(cmd.action==='appoint'){
  if(cmd.candidate&&!isAlive(w,cmd.candidate))return '不能任命已故人物';if(!ministryIds.includes(cmd.ministry))return '未知中央职位';if(cmd.candidate!==null&&(allegianceRealm(w,cmd.candidate)!==r))return '需当前效忠本国的人物';if(cmd.candidate&&publicOfficeReason(w,cmd.candidate))return publicOfficeReason(w,cmd.candidate);
  if(cmd.candidate&&Object.values(c.ministries).includes(cmd.candidate))return '一人只可担任一个中央职掌，请先免职';if(c.ministries[cmd.ministry]===cmd.candidate)return '职位未变化';return w.realm.influence<15?'任免需影响力 15':'';
 }
 if(cmd.action==='favor')return !movementIds.includes(cmd.group)||cmd.group==='unaligned'?'请选择政治集团':!movementSummary(w,r,cmd.group).members.length?'该集团无人':w.realm.influence<20?'眷顾需影响力 20':'';
 if(cmd.action==='resolve')return !c.petition?'没有待决奏议':typeof cmd.accept!=='boolean'?'无效决断':cmd.accept&&(t.coins<80||w.realm.influence<20)?'批准需公款 80、影响力 20':'';
 if(cmd.action==='audit')return t.coins<60||w.realm.influence<15?'整饬需公款 60、影响力 15':'';
 return '未知朝廷行动';
}
function resolvePetition(w:World,r:RealmId,accept:boolean){const c=courtOf(w,r)!,g=governmentOf(w,r)!,p=c.petition!;if(accept){w.realm!.treasuries[r].coins-=80;if(r===currentRealm(w))w.realm!.influence-=20;c.favored=p.group;if(p.group==='reform'||p.group==='expansion')c.policy=p.group;else if(p.group==='conservative')c.policy='consolidation';else g.legitimacy=cap(g.legitimacy+8);g.support=cap(g.support+5);c.tension=cap(c.tension-8);}else {g.support=cap(g.support-5);c.tension=cap(c.tension+8);}log(w,r,movements[p.group].name+'奏议'+(accept?'获准，国策／天命已调整。':'遭否决，朝野支持 −5、紧张 +8。'));c.petition=null;}
export function actCourt(w:World,cmd:CourtCommand){const reason=courtReason(w,cmd);if(reason)throw new Error(reason);const r=currentRealm(w),g=governmentOf(w)!,c=courtOf(w)!,id=w.characterId!,s=w.realm!,t=s.treasuries[r];
 switch(cmd.action){
 case 'seek-office':s.influence-=25;c.ministries[cmd.ministry]=id;c.cooldowns['appoint|'+cmd.ministry]=w.day+30;log(w,r,politicalName(id)+'通过功绩／接受度考核，获准请任'+ministries[cmd.ministry].name+'。');break;
 case 'join':s.influence-=10;c.members[id]=cmd.group;c.cooldowns['join|'+id]=w.day+90;log(w,r,politicalName(id)+'加入'+movements[cmd.group].name+'。');break;
 case 'convince':w.people[0].coins-=30;s.influence-=10;c.members[cmd.target]=c.members[id];c.cooldowns['convince|'+id]=w.day+30;log(w,r,politicalName(cmd.target)+'经游说加入'+movements[c.members[id]].name+'。');break;
 case 'debate':w.people[0].coins-=30;c.boosts[id]={until:w.day+180,power:25};c.cooldowns['debate|'+id]=w.day+180;log(w,r,politicalName(id)+'主持清议，180 日内集团个人势力 +25。');break;
 case 'petition':s.influence-=15;c.petition={group:c.members[id],sponsor:id,due:w.day+15};c.cooldowns.petition=w.day+90;log(w,r,'集团奏议已呈送，15 日内等待朝廷裁决。');break;
 case 'resolve':resolvePetition(w,r,cmd.accept);break;
 case 'favor':s.influence-=20;c.favored=cmd.group;c.cooldowns.favor=w.day+90;log(w,r,'朝廷眷顾'+movements[cmd.group].name+'。');break;
 case 'appoint':if(cmd.candidate){c.members[cmd.candidate]??='unaligned';g.merit[cmd.candidate]??=0;for(const city of Object.values(s.cities))if(city.governor===cmd.candidate)city.governor=null;w.holdings.governedCities=Object.keys(s.cities).filter(site=>s.cities[site].governor===id&&s.cities[site].controller===r);}s.influence-=15;c.ministries[cmd.ministry]=cmd.candidate;c.cooldowns['appoint|'+cmd.ministry]=w.day+30;if(cmd.candidate&&(g.merit[cmd.candidate]??0)<40){c.corruption=cap(c.corruption+8);c.tension=cap(c.tension+6);}log(w,r,ministries[cmd.ministry].name+'：'+(cmd.candidate?'任命'+politicalName(cmd.candidate)+'；功绩不足 40 不产生履职增益。':'免职，增益即时撤销。'));break;
 case 'audit':t.coins-=60;s.influence-=15;c.corruption=cap(c.corruption-20);c.tension=cap(c.tension-10);g.support=cap(g.support-3);c.cooldowns.audit=w.day+90;log(w,r,'整饬吏治：积弊 −20、紧张 −10、朝野支持 −3。');break;
 case 'found':t.coins-=300;s.influence-=80;c.founding={name:cmd.name.trim(),mode:cmd.mode,sponsor:id,started:w.day,progress:0,required:120};log(w,r,'提议建立国号「'+cmd.name.trim()+'」，须推进 120 个有效日。');break;
 case 'cancel':c.founding=null;log(w,r,'撤回拥立议程，已付成本不退。');break;
 }
}
export function syncCourt(w:World,r:RealmId){const c=courtOf(w,r),g=governmentOf(w,r)!;if(!c)return; c.members[g.ruler]='unaligned'; for(const city of Object.values(w.realm!.cities))if(city.owner===r&&city.governor&&relationshipPersonById[city.governor]){c.members[city.governor]??='unaligned';g.merit[city.governor]??=0;} const tenure=g.ruler+'|'+governingExecutives(w,r).join('|');if(c.regimeId===g.regimeId&&c.tenure===tenure)return;
 c.regimeId=g.regimeId;c.tenure=tenure;c.ministries=Object.fromEntries(ministryIds.map(k=>[k,null])) as CourtState['ministries'];c.founding=null;c.petition=null;c.favored=null;c.boosts={};c.tension=cap(c.tension+20);log(w,r,'朝廷更替：中央任职、奏议、眷顾与拥立议程清理，个人政治倾向保留。');
}
function foundDynasty(w:World,r:RealmId){const g=governmentOf(w,r)!,c=courtOf(w,r)!,f=c.founding!,s=w.realm!,state=s.governments!,old=state.regimes.find(v=>v.id===g.regimeId)!;old.until=w.day;
 const id=`${r}-sandbox-${w.day}`;delete g.heirs;g.dynasty=id;g.regimeId=id;g.ruler=f.sponsor;g.executives=[f.sponsor];g.task=null;
 state.regimes.push({id,realm:r,dynasty:id,name:f.name,kind:'sandbox',ruler:f.sponsor,from:w.day,until:null,predecessor:old.id,source:null,cities:Object.keys(s.cities).filter(site=>s.cities[site].owner===r&&s.cities[site].controller===r)});
 g.legitimacy=f.mode==='unify'?85:55;g.support=65;if(f.mode==='unify')g.type='celestial';
 s.offices=s.offices.filter(o=>allegianceRealm(w,o.candidate)!==r);for(const city of Object.values(s.cities))if(city.owner===r){city.governor=null;city.order=cap(city.order-10);}
 s.treasuries[r].coins=Math.floor(s.treasuries[r].coins*.85);const army=s.armies.find(a=>a.realm===r);if(army)army.morale=cap(army.morale-20);
 if(r===currentRealm(w)){s.mandate=governmentExecutive(w);w.holdings.governedCities=[];}
 syncRelationships(w);syncCourt(w,r);c.phase='stable';c.tension=20;c.corruption=cap(c.corruption-20);log(w,r,'「'+f.name+'」建朝：'+politicalName(f.sponsor)+'即位，承接本局实控辖地；旧官重新任命。');w.chronicle.push({day:w.day,person:'player',text:'新朝「'+f.name+'」建立。'});w.chronicle=w.chronicle.slice(-100);
}
export function courtCatalysts(w:World,r:RealmId){const c=courtOf(w,r)!,g=governmentOf(w,r)!,s=w.realm!,t=s.treasuries[r],cities=Object.values(s.cities).filter(c=>c.owner===r),order=cities.length?cities.reduce((n,c)=>n+c.order,0)/cities.length:0;const capital=s.cities[capitals[r]];
 const rows:{label:string;value:number}[]=[];const add=(label:string,value:number)=>rows.push({label,value});
 if(!t.coins||!t.grain)add('公库或公粮见底',10);if(capital.owner!==r||capital.controller!==r)add('都城失守',15);if(s.war&&[s.war.attacker,s.war.defender].includes(r))add('持续战争',5);if(order<45)add('地方失序',8);if(g.legitimacy<40)add('天命受疑',8);if(g.support<40)add('朝野离心',6);if(c.corruption>=50)add('积弊深重',6);
 for(const group of movementIds){const m=movementMood(w,r,group);if(m.tension)add(movements[group].name+(m.tension>0?'施压':'支持'),m.tension);}
 if(!rows.length)add('府库、秩序与天命平稳',-4);if(ministryCompetent(w,r,'censorate'))add('监察履职',-2);
 return rows;
}
export function advanceCourts(w:World){if(!w.realm?.governments)return;for(const r of realms){syncCourt(w,r);const c=courtOf(w,r);if(!c)continue;const g=governmentOf(w,r)!;
 if(c.petition&&c.petition.due<=w.day){const mayPay=w.realm.treasuries[r].coins>=80&&(r!==currentRealm(w)||w.realm.influence>=20);const approve=courtEnabled(w,r)&&!governingExecutives(w,r).includes(w.characterId!)&&movementSummary(w,r,c.petition.group).share>=30&&mayPay;resolvePetition(w,r,approve);}
 if(!courtEnabled(w,r))continue;
 if(c.founding&&!foundingPause(w,r)){c.founding.progress++;if(c.founding.progress>=c.founding.required)foundDynasty(w,r);}
 if(w.day%30!==0||c.lastMonthly>=w.day)continue;c.lastMonthly=w.day;
 for(const [id,b] of Object.entries(c.boosts))if(b.until<=w.day)delete c.boosts[id];
 const employed=Object.values(c.ministries).filter((id):id is string=>id!==null);
 if(ministryCompetent(w,r,'secretariat'))g.support=cap(g.support+2);
 if(ministryCompetent(w,r,'personnel'))for(const id of Object.keys(g.merit))g.merit[id]=cap(g.merit[id]+1);
 c.corruption=cap(c.corruption+employed.filter(id=>(g.merit[id]??0)<40).length*3-(ministryCompetent(w,r,'censorate')?5:0)-(c.phase==='stable'&&c.policy==='consolidation'?1:0));
 const moods=movementIds.map(group=>({group,...movementMood(w,r,group)}));
 const supportDelta=moods.reduce((n,m)=>n+m.support,0);g.support=cap(g.support+supportDelta);
 if(supportDelta)log(w,r,'集团态度：朝野支持 '+(supportDelta>0?'+':'')+supportDelta+'。');
 if(!c.petition&&(c.cooldowns.petition??0)<=w.day){const opposition=moods.filter(m=>m.leader&&m.leader!==w.characterId&&m.satisfaction<40&&m.share>=25).sort((a,b)=>b.share-a.share)[0];if(opposition){c.petition={group:opposition.group,sponsor:opposition.leader!,due:w.day+15};c.cooldowns.petition=w.day+90;log(w,r,movements[opposition.group].name+'因诉求未获满足呈递奏议，15 日内等待裁决。');}}
 const catalysts=courtCatalysts(w,r);c.tension=cap(c.tension+catalysts.reduce((n,v)=>n+v.value,0));const previous=c.phase;
 c.phase=c.tension>=80||g.legitimacy<15?'chaos':c.tension>=40?'strained':'stable';
 log(w,r,`月度局势：${catalysts.map(v=>v.label+(v.value>0?'+':'')+v.value).join('；')}。紧张 ${c.tension}。`);
 if(previous!==c.phase)log(w,r,'局势转入'+({stable:'安定',strained:'动荡',chaos:'危局'})[c.phase]+'。');
 }}

export function courtSalary(w:World,r:RealmId){return courtEnabled(w,r)?Object.values(courtOf(w,r)?.ministries??{}).filter(Boolean).length*4:0;}
export function payCourtSalary(w:World,r:RealmId,paid:number){const c=courtOf(w,r);if(!c||!courtEnabled(w,r))return;const holders=Object.values(c.ministries).filter(Boolean);if(paid<holders.length*4){c.tension=cap(c.tension+5);log(w,r,'中央俸给不足：紧张 +5。');}if(r===currentRealm(w)&&holders.includes(w.characterId!))w.people[0].coins=cap(w.people[0].coins+Math.floor(paid/holders.length),1_000_000);}

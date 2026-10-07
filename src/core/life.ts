import {accountWallet} from './obligations';
import {personResidence} from './residence';
import {worldRealms} from './polityRuntime';
import {isMonthStart} from './calendar';
import {getPerson} from './personRegistry';
import {finishCampaign} from './militaryCampaigns';
import {characterById} from '../data/characters';
import {relationshipPersonById} from '../data/relationships';
import {publicSuccessor} from './publicSuccession';
import {dynasticKin} from './claims';
import {ensureRulerHistory,syncRulerHistory,announceSuccession} from './rulerHistory';
import {heirs,applySocial} from './social';
import {expressGenome} from './genetics';
import {syncCourt} from './court';
import {syncRelationships,changeRelationOpinion} from './relationships';
import {syncDiplomacy} from './diplomacy';
import {handoverOffice,syncGovernance} from './realm';
import {ageAt,healthCapacity,isAlive,lifeOf,newLifeState,illnessNames,illnessCourse,monthlyIllnessRisk,illnessKind,type LifeCommand} from './lifeState';
import type {World} from './types';

function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
const staticPersonName=(id:string)=>characterById[id]?.name??relationshipPersonById[id]?.name??({fictional:'沈行舟',merchant:'陆商',messenger:'北地驿使',traveler:'江左行旅'} as Record<string,string>)[id]??id;
const personName=(w:World,id:string)=>getPerson(w,id)?.name??staticPersonName(id);
export function ensureLife(w:World){return w.life??=newLifeState(w);}
function roll(w:World){const s=ensureLife(w);s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function careReason(w:World,id:string,actor=w.characterId??'fictional'){
 const p=lifeOf(w,id);if(!p||p.death)return '无法照料已故或未录人物';
 if(w.campaign&&w.campaign.status!=='active')return '本局已结束';
 if(!isAlive(w,actor))return '须由在世人物延医';
 if(actor===(w.characterId??'fictional')?w.people[0].journey:personResidence(w,actor).traveling)return '抵达后才能延医';
 const marriage=w.relationships?.marriages.some(m=>m.until===null&&(m.a===actor&&m.b===id||m.b===actor&&m.a===id));
 const family=getPerson(w,actor)?.family;
 if(id!==actor&&!marriage&&(!family||getPerson(w,id)?.family!==family))return '仅可为自己、配偶或同族延医';
 if(p.careUntil>w.day)return `医者正在照料，余 ${p.careUntil-w.day} 日`;
 if(!p.illness&&(p.injuryUntil??0)<=w.day&&p.health>=healthCapacity(ageAt(w,id)!))return '当前无需延医';
 return (accountWallet(w,'person:'+actor)?.read()??0)<30?'延医需 30 钱':'';
}
export function autoCareReason(w:World,id:string){
 if(id!==(w.characterId??'fictional'))return '自动延医仅由本人授权私财';
 if(!lifeOf(w,id)||!isAlive(w,id))return '须为在世人物';
 if(w.campaign&&w.campaign.status!=='active')return '本局已结束';
 return '';
}
export function actLife(w:World,c:LifeCommand,actor=w.characterId??'fictional'){
 const s=ensureLife(w);
 if(c.action==='auto-care'||c.action==='stop-auto-care'){
  if(actor!==(w.characterId??'fictional'))throw new Error('自动延医额度仅由玩家本人授权');
  const reason=autoCareReason(w,c.target);if(reason)throw new Error(reason);
  if(c.action==='stop-auto-care'){delete s.autoCare;log(w,'停止自动延医；未用额度未扣款。');return;}
  if(s.autoCare?.payer===c.target&&s.autoCare.remaining>0)throw new Error('已有自动延医额度');
  s.autoCare={payer:c.target,remaining:90};log(w,'授权本人自动延医，最多支出 90 私钱；每次 30 钱，按需扣款。');return;
 }
 if(c.action!=='care')throw new Error('未知养护行动');const reason=careReason(w,c.target,actor);if(reason)throw new Error(reason);const wallet=accountWallet(w,'person:'+actor)!;wallet.write(wallet.read()-30);s.people[c.target].careUntil=w.day+90;if(c.target!==actor)changeRelationOpinion(w,actor,c.target,5);if(actor===(w.characterId??'fictional'))log(w,'为'+personName(w,c.target)+'延医照料九十日，支出 30 钱。');
}
/** One-way transition. All live appointments are reconciled before control can pass. */
export function die(w:World,id:string,cause:'illness'|'age'|'battle'|'execution'|'murder'){
 const s=ensureLife(w),p=s.people[id];if(!p||p.death)return;
 const wasPlayer=id===(w.characterId??'fictional'),next=wasPlayer?heirs(w).find(c=>c.id===w.social?.heir)??heirs(w)[0]:undefined;
 if(w.realm?.governments)ensureRulerHistory(w);
 if(w.custody){delete w.custody.records[id];for(const q of w.custody.warrants)if(q.person===id&&q.status==='pending')q.status='cancelled';}if(id===w.characterId&&w.mobility)w.mobility.captivity=null;
 p.health=0;p.death={day:w.day,cause};p.careUntil=0;delete p.injuryUntil;
 for(const title of w.nobility?.titles??[])if(title.person===id&&title.until===null)title.until=w.day;
 for(const claim of w.claims?.records??[])if(claim.person===id&&claim.until===null)claim.until=w.day;
 if(s.autoCare?.payer===id)delete s.autoCare;
 for(const t of w.householdPlans?.tuition??[])if(t.status==='active'&&[t.payer,t.student,t.teacher].includes(id)){t.status='cancelled';t.reason='师生或出资人离世，停止后续扣费；已付学资不退';}
 if(w.mobility){for(const r of worldRealms(w))if(w.mobility.commanders[r]===id)delete w.mobility.commanders[r];for(const [key,leader] of Object.entries(w.mobility.armyCommanders??{}))if(leader===id)delete w.mobility.armyCommanders![Number(key)];for(const [key,q] of Object.entries(w.mobility.pendingCommanders??{}))if(q.person===id)delete w.mobility.pendingCommanders![Number(key)];if(w.mobility.residences[id])w.mobility.residences[id].journey=null;}
 for(const q of w.militaryCampaigns?.items??[])if(q.status==='active'&&q.commander===id)finishCampaign(w,q,'failed','统帅离世，战役委任结束');
 log(w,`${personName(w,id)}${{illness:'病逝',age:'寿终',battle:'战死',execution:'被处决',murder:'遇害'}[cause]}，享年 ${ageAt(w,id)} 岁。`);
 if(w.social){if(w.social.heir===id)w.social.heir=null;if(w.social.advisor===id)w.social.advisor=null;if(w.social.scheme?.target===id||wasPlayer)w.social.scheme=null;}
 const rs=w.relationships;
 if(rs){
  for(const m of rs.marriages)if(m.until===null&&(m.a===id||m.b===id)){m.until=w.day;rs.maritalBasis[m.a===id?m.b:m.a]='widowed';}
  for(const [f,o] of Object.entries(rs.oaths))if(f===id||o.lord===id)delete rs.oaths[f];
  for(const r of worldRealms(w)){const c=rs.regencies[r];if(c&&(c.controller===id||c.ruler===id))delete rs.regencies[r];}
  if(rs.scheme&&(rs.scheme.actor===id||rs.scheme.target===id))rs.scheme=null;
 }
 const worldPerson=w.people.find(a=>a.id===id);if(worldPerson){worldPerson.journey=null;worldPerson.itinerary=[];worldPerson.itineraryIndex=0;}
 if(w.realm){
  for(const city of Object.values(w.realm.cities))if(city.governor===id)city.governor=null;
  w.realm.offices=w.realm.offices.filter(o=>o.candidate!==id);
  for(const r of worldRealms(w)){const g=w.realm.governments?.realms[r];if(!g||w.realm.annexed?.[r])continue;
   if(g.heirs?.ruler===id){g.heirs.ruler=null;g.heirs.dynasty=null;}if(g.heirs?.executive===id)g.heirs.executive=null;
   if(g.task?.sponsor===id)g.task=null;
   if(g.court){for(const m of Object.keys(g.court.ministries) as (keyof typeof g.court.ministries)[])if(g.court.ministries[m]===id)g.court.ministries[m]=null;if(g.court.founding?.sponsor===id)g.court.founding=null;if(g.court.petition?.sponsor===id)g.court.petition=null;}
   if(g.ruler===id||g.executives.includes(id)){
    const wasRuler=g.ruler===id,rulerHeir=wasRuler?publicSuccessor(w,r,'ruler',id):null,executiveHeir=g.executives[0]===id?publicSuccessor(w,r,'executive',id):null,designated=!!rulerHeir&&g.heirs?.ruler===rulerHeir;
    if(wasRuler&&rulerHeir){
     const name=g.heirs?.dynasty,changedHouse=!dynasticKin(w,id,rulerHeir);
     if(changedHouse&&name&&w.realm.governments!.regimes.filter(v=>v.realm===r).length<12){
      const state=w.realm.governments!,old=state.regimes.find(v=>v.id===g.regimeId)!;
      old.until=w.day;g.regimeId=`${r}-inheritance-${w.day}-${state.regimes.filter(v=>v.realm===r).length}`;g.dynasty=g.regimeId;
      state.regimes.push({id:g.regimeId,realm:r,dynasty:g.dynasty,name,kind:'inheritance',ruler:rulerHeir,from:w.day,until:null,predecessor:old.id,source:null,cities:Object.keys(w.realm.cities).filter(site=>w.realm!.cities[site].owner===r&&w.realm!.cities[site].controller===r)});
      log(w,`${personName(w,rulerHeir)}承统，国号改为「${name}」。`);
     }
     g.ruler=rulerHeir;if(g.heirs){g.heirs.ruler=null;g.heirs.dynasty=null;}
    }
    g.executives=g.executives.filter(c=>isAlive(w,c)&&(ageAt(w,c)??0)>=16);
    if(executiveHeir&&g.heirs?.executive===executiveHeir){g.executives=[executiveHeir,...g.executives.filter(c=>c!==executiveHeir)].slice(0,2);g.heirs.executive=null;}
    else if(!g.executives.length&&executiveHeir)g.executives=[executiveHeir];
    g.task=null;g.legitimacy=Math.max(0,g.legitimacy-10);g.support=Math.max(0,g.support-5);
    delete g.resignedExecutives;
    syncRulerHistory(w,designated?'designation':'succession');if(wasRuler)announceSuccession(w,r,id);
    s.successions.push({realm:r,regimeId:g.regimeId,stage:g.stages.at(-1)??null,day:w.day,deceased:id,ruler:g.ruler,executives:[...g.executives]});
    log(w,`${personName(w,id)}身后，${isAlive(w,g.ruler)?personName(w,g.ruler)+'居君位':'君位虚悬'}${g.executives.length?'，'+g.executives.map(id=>personName(w,id)).join('、')+'主持朝政':'，朝廷无人主持'}。`);
   }
  }
 }
 if(wasPlayer){
  w.people[0].journey=null;
  if(next&&w.social){w.social.heir=next.id;applySocial(w,{type:'handover'});if(!w.mobility)w.people[0].location=next.home;log(w,'家业由'+next.name+'承继，继续这一族的故事。');}
  else if(w.campaign){w.campaign.status='lost';w.campaign.finishedDay=w.day;log(w,'没有在世且合格的家业继任者，本局结束。');}
 }
 if(w.realm){syncRelationships(w);for(const r of worldRealms(w))syncCourt(w,r);if(wasPlayer)handoverOffice(w);syncGovernance(w);syncDiplomacy(w);syncRulerHistory(w,'succession');}
}
export function advanceLife(w:World){
 const s=ensureLife(w);if(!isMonthStart(w.day,w.scriptId)||s.lastMonthly>=w.day)return;s.lastMonthly=w.day;
 const automatic=s.autoCare;
 if(automatic){if(automatic.payer!==(w.characterId??'fictional')||!isAlive(w,automatic.payer))delete s.autoCare;
 else if(automatic.remaining>=30&&!careReason(w,automatic.payer)){actLife(w,{type:'health',action:'care',target:automatic.payer});automatic.remaining-=30;if(!automatic.remaining)delete s.autoCare;}}
 for(const id of Object.keys(s.people)){
  const p=s.people[id];if(p.death)continue;
  const age=ageAt(w,id)!,self=id===(w.characterId??'fictional'),stress=self?w.social?.stress??0:0,care=p.careUntil>=w.day&&p.careUntil>0;
  const genome=w.identities?.people[id]?.genome,vigorous=genome?expressGenome(genome).congenital.includes('vitality'):false;
  if(p.injuryUntil!==undefined&&(p.injuryUntil<=w.day||care&&(p.injuryUntil-=15)<=w.day))delete p.injuryUntil;
  const max=healthCapacity(age),risk=monthlyIllnessRisk(age,stress,vigorous);
  if(p.illness){
   const ill=p.illness,course=illnessCourse[ill.kind],elapsed=w.day-ill.since,healing=Math.min(.98,course.recovery+(care?.25:0)+(vigorous?.08:0)+Math.floor(elapsed/60)*.08-(ill.severity-1)*.08);
   if(elapsed>=course.duration||roll(w)<healing){p.illness=null;p.health=Math.min(max,p.health+(care?18:10));log(w,personName(w,id)+'病势消退，逐渐康复。');}
   else {if(roll(w)<course.worsening*(care?.3:1)&&ill.severity<3)ill.severity=(ill.severity+1) as 2|3;p.health=Math.max(0,p.health-Math.ceil(ill.severity*course.damage*(care?.5:1)));}
  }else{
   p.health=Math.min(max,p.health+(care?12:4));
   if(roll(w)<risk){p.illness={kind:illnessKind(age,roll(w)),since:w.day,severity:1};p.health=Math.max(0,p.health-8);log(w,personName(w,id)+'患上'+illnessNames[p.illness.kind]+'。');}
  }
  // Simulation hazard, not a prediction or an enforced historical death date.
  const mortality=Math.max(0,age-55)**2/250000+(p.illness?.severity===3?.012:0)+(p.health<25?(25-p.health)*.003:0);
  if(p.health===0||roll(w)<mortality*(care?.6:1)*(vigorous?.8:1))die(w,id,p.illness?'illness':'age');
  if(w.campaign&&w.campaign.status!=='active')break;
 }
}

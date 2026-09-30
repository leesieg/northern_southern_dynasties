import {isMonthStart} from './calendar';
import {birthRecords} from '../data/lifespans';
import {characterById} from '../data/characters';
import {relationshipPersonById} from '../data/relationships';
import {publicSuccessor,publicFamily} from './publicSuccession';
import {heirs,applySocial} from './social';
import {expressGenome} from './genetics';
import {syncCourt} from './court';
import {syncRelationships} from './relationships';
import {syncDiplomacy} from './diplomacy';
import {handoverOffice,syncGovernance,realms} from './realm';
import {ageAt,healthCapacity,isAlive,lifeOf,newLifeState,illnessNames,illnessCourse,monthlyIllnessRisk,illnessKind,type LifeCommand} from './lifeState';
import type {World} from './types';

function log(w:World,text:string){w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);}
const personName=(id:string)=>characterById[id]?.name??relationshipPersonById[id]?.name??({fictional:'沈行舟',merchant:'陆商',messenger:'北地驿使',traveler:'江左行旅'} as Record<string,string>)[id]??id;
export function ensureLife(w:World){return w.life??=newLifeState(w);}
function roll(w:World){const s=ensureLife(w);s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function careReason(w:World,id:string){
 const p=lifeOf(w,id);if(!p||p.death)return '无法照料已故或未录人物';
 if(w.campaign&&w.campaign.status!=='active')return '本局已结束';
 if(w.people[0].journey)return '抵达后才能延医';
 const actor=w.characterId??'fictional';
 const marriage=w.relationships?.marriages.some(m=>m.until===null&&(m.a===actor&&m.b===id||m.b===actor&&m.a===id));
 const family=relationshipPersonById[actor]?.family;
 if(id!==actor&&!marriage&&(!family||relationshipPersonById[id]?.family!==family))return '仅可为自己、配偶或同族延医';
 if(p.careUntil>w.day)return `医者正在照料，余 ${p.careUntil-w.day} 日`;
 if(!p.illness&&p.health>=healthCapacity(ageAt(w,id)!))return '当前无需延医';
 return w.people[0].coins<30?'延医需 30 钱':'';
}
export function actLife(w:World,c:LifeCommand){ensureLife(w);if(c.action!=='care')throw new Error('未知养护行动');const reason=careReason(w,c.target);if(reason)throw new Error(reason);w.people[0].coins-=30;w.life!.people[c.target].careUntil=w.day+90;log(w,'为'+personName(c.target)+'延医照料九十日，支出 30 钱。');}
/** One-way transition. All live appointments are reconciled before control can pass. */
export function die(w:World,id:string,cause:'illness'|'age'|'battle'|'execution'){
 const s=ensureLife(w),p=s.people[id];if(!p||p.death)return;
 const wasPlayer=id===(w.characterId??'fictional'),next=wasPlayer?heirs(w).find(c=>c.id===w.social?.heir)??heirs(w)[0]:undefined;
 if(w.custody){delete w.custody.records[id];for(const q of w.custody.warrants)if(q.person===id&&q.status==='pending')q.status='cancelled';}if(id===w.characterId&&w.mobility)w.mobility.captivity=null;
 p.health=0;p.death={day:w.day,cause};p.careUntil=0;
 log(w,`${personName(id)}${{illness:'病逝',age:'寿终',battle:'战死',execution:'被处决'}[cause]}，享年 ${ageAt(w,id)} 岁。`);
 if(w.social){if(w.social.heir===id)w.social.heir=null;if(w.social.advisor===id)w.social.advisor=null;if(w.social.scheme?.target===id||wasPlayer)w.social.scheme=null;}
 const rs=w.relationships;
 if(rs){
  for(const m of rs.marriages)if(m.until===null&&(m.a===id||m.b===id)){m.until=w.day;rs.maritalBasis[m.a===id?m.b:m.a]='widowed';}
  for(const [f,o] of Object.entries(rs.oaths))if(f===id||o.lord===id)delete rs.oaths[f];
  for(const r of realms){const c=rs.regencies[r];if(c&&(c.controller===id||c.ruler===id))delete rs.regencies[r];}
  if(rs.scheme&&(rs.scheme.actor===id||rs.scheme.target===id))rs.scheme=null;
 }
 const worldPerson=w.people.find(a=>a.id===id);if(worldPerson){worldPerson.journey=null;worldPerson.itinerary=[];worldPerson.itineraryIndex=0;}
 if(w.realm){
  for(const city of Object.values(w.realm.cities))if(city.governor===id)city.governor=wasPlayer&&next&&w.realm.governments?.realms[characterById[id].polity].type==='feudal'?next.id:null;
  w.realm.offices=w.realm.offices.filter(o=>o.candidate!==id);
  for(const r of realms){const g=w.realm.governments?.realms[r];if(!g||w.realm.annexed?.[r])continue;
   if(g.heirs?.ruler===id){g.heirs.ruler=null;g.heirs.dynasty=null;}if(g.heirs?.executive===id)g.heirs.executive=null;
   if(g.task?.sponsor===id)g.task=null;
   if(g.court){for(const m of Object.keys(g.court.ministries) as (keyof typeof g.court.ministries)[])if(g.court.ministries[m]===id)g.court.ministries[m]=null;if(g.court.founding?.sponsor===id)g.court.founding=null;if(g.court.petition?.sponsor===id)g.court.petition=null;}
   if(g.ruler===id||g.executives.includes(id)){
    const wasRuler=g.ruler===id,rulerHeir=wasRuler?publicSuccessor(w,r,'ruler',id):null,executiveHeir=g.executives[0]===id?publicSuccessor(w,r,'executive',id):null;
    if(wasRuler&&rulerHeir){
     const name=g.heirs?.dynasty,changedHouse=publicFamily(id)!==publicFamily(rulerHeir);
     if(changedHouse&&name&&w.realm.governments!.regimes.filter(v=>v.realm===r).length<12){
      const state=w.realm.governments!,old=state.regimes.find(v=>v.id===g.regimeId)!;
      old.until=w.day;g.regimeId=`${r}-inheritance-${w.day}-${state.regimes.filter(v=>v.realm===r).length}`;g.dynasty=g.regimeId;
      state.regimes.push({id:g.regimeId,realm:r,dynasty:g.dynasty,name,kind:'inheritance',ruler:rulerHeir,from:w.day,until:null,predecessor:old.id,source:null,cities:Object.keys(w.realm.cities).filter(site=>w.realm!.cities[site].owner===r&&w.realm!.cities[site].controller===r)});
      log(w,`${personName(rulerHeir)}承统，国号改为「${name}」。`);
     }
     g.ruler=rulerHeir;if(g.heirs){g.heirs.ruler=null;g.heirs.dynasty=null;}
    }
    g.executives=g.executives.filter(c=>isAlive(w,c));
    if(executiveHeir&&g.heirs?.executive===executiveHeir){g.executives=[executiveHeir,...g.executives.filter(c=>c!==executiveHeir)].slice(0,2);g.heirs.executive=null;}
    else if(!g.executives.length&&executiveHeir)g.executives=[executiveHeir];
    g.task=null;g.legitimacy=Math.max(0,g.legitimacy-10);g.support=Math.max(0,g.support-5);
    delete g.resignedExecutives;
    s.successions.push({realm:r,regimeId:g.regimeId,stage:g.stages.at(-1)??null,day:w.day,deceased:id,ruler:g.ruler,executives:[...g.executives]});
    log(w,`${personName(id)}身后，${isAlive(w,g.ruler)?personName(g.ruler)+'居君位':'君位虚悬'}${g.executives.length?'，'+g.executives.map(personName).join('、')+'主持朝政':'，朝廷无人主持'}。`);
   }
  }
 }
 if(wasPlayer){
  w.people[0].journey=null;
  if(next&&w.social){w.social.heir=next.id;applySocial(w,{type:'handover'});if(!w.mobility)w.people[0].location=next.home;log(w,'家业由'+next.name+'承继，继续这一族的故事。');}
  else if(w.campaign){w.campaign.status='lost';w.campaign.finishedDay=w.day;log(w,'没有在世且合格的家业继任者，本局结束。');}
 }
 if(w.realm){syncRelationships(w);for(const r of realms)syncCourt(w,r);if(wasPlayer)handoverOffice(w);syncGovernance(w);syncDiplomacy(w);}
}
export function advanceLife(w:World){
 const s=ensureLife(w);if(!isMonthStart(w.day,w.scriptId)||s.lastMonthly>=w.day)return;s.lastMonthly=w.day;
 for(const id of Object.keys(birthRecords)){
  const p=s.people[id];if(p.death)continue;
  const age=ageAt(w,id)!,self=id===(w.characterId??'fictional'),stress=self?w.social?.stress??0:0,care=p.careUntil>=w.day&&p.careUntil>0;
  const genome=w.identities?.people[id]?.genome,vigorous=genome?expressGenome(genome).congenital.includes('vitality'):false;
  const max=healthCapacity(age),risk=monthlyIllnessRisk(age,stress,vigorous);
  if(p.illness){
   const ill=p.illness,course=illnessCourse[ill.kind],elapsed=w.day-ill.since,healing=Math.min(.98,course.recovery+(care?.25:0)+(vigorous?.08:0)+Math.floor(elapsed/60)*.08-(ill.severity-1)*.08);
   if(elapsed>=course.duration||roll(w)<healing){p.illness=null;p.health=Math.min(max,p.health+(care?18:10));log(w,personName(id)+'病势消退，逐渐康复。');}
   else {if(roll(w)<course.worsening*(care?.3:1)&&ill.severity<3)ill.severity=(ill.severity+1) as 2|3;p.health=Math.max(0,p.health-Math.ceil(ill.severity*course.damage*(care?.5:1)));}
  }else{
   p.health=Math.min(max,p.health+(care?12:4));
   if(roll(w)<risk){p.illness={kind:illnessKind(age,roll(w)),since:w.day,severity:1};p.health=Math.max(0,p.health-8);log(w,personName(id)+'患上'+illnessNames[p.illness.kind]+'。');}
  }
  // Simulation hazard, not a prediction or an enforced historical death date.
  const mortality=Math.max(0,age-55)**2/250000+(p.illness?.severity===3?.012:0)+(p.health<25?(25-p.health)*.003:0);
  if(p.health===0||roll(w)<mortality*(care?.6:1)*(vigorous?.8:1))die(w,id,p.illness?'illness':'age');
  if(w.campaign&&w.campaign.status!=='active')break;
 }
}

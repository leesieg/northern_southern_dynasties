import {lifestyleBonuses} from './lifestyle';
import type {World} from './types';
import {allPeople,getPerson,parentLinksOf} from './personRegistry';
import {ageAt,isAlive,lifeOf} from './lifeState';
import {activeMarriage,closeKin,friendship,relationOpinion,changeRelationOpinion} from './relationships';
import {attributes,pair} from './social';
import {marriageClanBonus} from './clans';
import {marriagePrestige} from './family';
import {allegianceRealm} from './officeEligibility';
import {personResidence,together} from './residence';
import {accountWallet,transferAccount} from './obligations';
import {detained} from './custodyState';
import {serviceBusy} from './assignments';
import {ensureHouseholdLife} from './householdLife';
export type FamilyMarriageCommand={type:'familyMarriage';subject:string;target:string;coins:50|100|200;residence:string;family:string};
export function marriageSubjects(w:World,actor=w.characterId){return actor?[actor,...parentLinksOf(w).filter(p=>p.parent===actor).map(p=>p.child)].filter((id,i,ids)=>ids.indexOf(id)===i&&isAlive(w,id)&&(ageAt(w,id)??0)>=18):[];}
/** Acceptance is a current derived score, not a probability; dowry is a private transfer, not a bonus. */
export function marriageAcceptance(w:World,person:string,partner:string){const parts=[{label:'基础',value:10},{label:'对对方好感',value:relationOpinion(w,partner,person)},{label:'对方外交',value:attributes(w,partner).diplomacy*2},{label:'政权关系',value:allegianceRealm(w,person)===allegianceRealm(w,partner)?15:-40},{label:'家族联姻',value:marriageClanBonus(w,person,partner)},{label:'生活重心与技能',value:lifestyleBonuses(w,partner).acceptance}];return {score:parts.reduce((n,p)=>n+p.value,0),parts};}
export function quoteFamilyMarriage(w:World,c:FamilyMarriageCommand,actor=w.characterId){
 const a=getPerson(w,c.subject),b=getPerson(w,c.target),left=marriageAcceptance(w,c.subject,c.target),right=marriageAcceptance(w,c.target,c.subject);
 const reason=()=>{
  if(!actor||!w.relationships||!w.social||w.campaign?.status!=='active')return '当前无法议婚';
  if(!isAlive(w,actor)||(ageAt(w,actor)??0)<18||detained(w,actor))return '须由成年在世且自由的人物议婚';
  if(!marriageSubjects(w,actor).includes(c.subject))return '只能为本人或在世成年直系子女议婚';
  if(!a||!b||a.id===b.id||!isAlive(w,b.id))return '请选择另一位在世人物';
  if((ageAt(w,a.id)??0)<18||(ageAt(w,b.id)??0)<18)return '双方须成年';
  if(a.sex===b.sex)return '当前婚姻规则需成年异性';
  if(closeKin(a.id,b.id,w))return '不得与已录近亲或同族结婚';
  if(activeMarriage(w,a.id)||activeMarriage(w,b.id))return '一方已有主要配偶，请先解除婚姻';
  if(!w.relationships.maritalBasis[a.id]||!w.relationships.maritalBasis[b.id])return '人物婚姻状态缺失';
  if(w.relationships.marriages.length>=300)return '本局婚姻记录已达 300 条上限';
  if(w.social.lineage.slice(0,-1).some(p=>[a.id,b.id].includes(p.id)))return '退居人物不再参与议婚';
  if([a.id,b.id].some(id=>detained(w,id)))return '双方须未被拘押';
  if(w.realm?.event)return '先处理待决事务';
  if(personResidence(w,actor).traveling||!together(w,a.id,b.id)||personResidence(w,a.id).site!==c.residence)return '双方须实际同城驻留；居所选择不会使人物瞬移';
  if([pair(a.id,b.id),pair(b.id,a.id)].some(k=>(w.relationships!.cooldowns[k+'|marry']??0)>w.day))return '双方议婚仍在冷却中';
  if(['rival','nemesis'].includes(friendship(w,a.id,b.id)??''))return '仇怨未解';
  if(![a.family,b.family].includes(c.family))return '子女家支须选双亲之一';
  if(![50,100,200].includes(c.coins))return '婚资须为 50、100 或 200 钱';
  const from=accountWallet(w,'person:'+actor),to=accountWallet(w,'person:'+b.id);
  if(!from||!to||from.key===to.key||from.read()<c.coins||to.read()+c.coins>to.capacity)return '议婚者私财余额或配偶收款容量不足';
  if((c.subject!==actor||actor!==w.characterId)&&left.score<70||right.score<70)return '双方婚姻接受度须达到 70；本人意愿由确认表达';
  return '';
 };
 return {left,right,cost:c.coins,payer:actor,recipient:c.target,reason:reason()};
}
export function actFamilyMarriage(w:World,c:FamilyMarriageCommand,actor=w.characterId!){
 const q=quoteFamilyMarriage(w,c,actor);if(q.reason)throw new Error(q.reason);
 const s=w.relationships!,a=c.subject,b=c.target;
 transferAccount(w,'person:'+actor,'person:'+b,c.coins,'议婚婚资');
 if(!s.marriages.some(m=>m.a===a&&m.b===b||m.a===b&&m.b===a))marriagePrestige(w,a,b);
 const id='marriage:simulation:'+a+':'+w.day+':'+s.marriages.length;
 s.marriages.push({id,a,b,from:w.day,until:null,origin:'simulation'});s.maritalBasis[a]='simulation';s.maritalBasis[b]='simulation';
 ensureHouseholdLife(w).plans[id]={trying:a!==w.characterId&&b!==w.characterId,family:c.family};changeRelationOpinion(w,a,b,20);changeRelationOpinion(w,b,a,20);
 const text=getPerson(w,a)!.name+'与'+getPerson(w,b)!.name+'成婚；'+getPerson(w,actor)!.name+'支付婚资 '+c.coins+' 钱予配偶，仍居原驻地。'+(a===w.characterId||b===w.characterId?'暂缓添丁。':'婚后自主筹划家庭。');
 s.history.push({day:w.day,actor,target:b,text});s.history=s.history.slice(-100);w.chronicle.push({day:w.day,person:'player',text});w.chronicle=w.chronicle.slice(-100);
}

/** Monthly NPC decisions share marriage checks and real private transfers with the player. */
export function advanceNPCMarriages(w:World){
 if(!w.relationships||!w.social||!w.realm||w.mode!=='sandbox'||w.campaign?.status!=='active'||w.realm.event||w.relationships.marriages.length>=300)return;
 const retired=new Set(w.social.lineage.slice(0,-1).map(p=>p.id));
 const candidates=allPeople(w).filter(p=>p.id!==w.characterId&&!retired.has(p.id)&&isAlive(w,p.id)&&(ageAt(w,p.id)??0)>=18&&!activeMarriage(w,p.id)&&!detained(w,p.id)&&!personResidence(w,p.id).traveling&&!serviceBusy(w,p.id)&&(lifeOf(w,p.id)?.health??0)>=50&&!lifeOf(w,p.id)?.illness);
 const matched=new Set<string>();
 for(const a of candidates){
  if(matched.has(a.id)||activeMarriage(w,a.id))continue;
  const residence=personResidence(w,a.id).site,realm=allegianceRealm(w,a.id);
  const options=candidates.filter(b=>b.id!==a.id&&b.sex!==a.sex&&!matched.has(b.id)&&!activeMarriage(w,b.id)&&allegianceRealm(w,b.id)===realm&&personResidence(w,b.id).site===residence&&!closeKin(a.id,b.id,w)&&!['rival','nemesis'].includes(friendship(w,a.id,b.id)??'')&&relationOpinion(w,a.id,b.id)>=0&&relationOpinion(w,b.id,a.id)>=0).map(b=>{
   const command:FamilyMarriageCommand={type:'familyMarriage',subject:a.id,target:b.id,coins:50,residence,family:a.family},quote=quoteFamilyMarriage(w,command,a.id);
   return {b,command,quote,score:Math.min(quote.left.score,quote.right.score)-Math.abs((ageAt(w,a.id)??18)-(ageAt(w,b.id)??18))};
  }).filter(o=>!o.quote.reason||o.quote.reason.startsWith('双方婚姻接受度')).sort((a,b)=>b.score-a.score||a.b.id.localeCompare(b.b.id));
  const choice=options[0];if(!choice)continue;
  matched.add(a.id);matched.add(choice.b.id);
  if(choice.quote.reason){changeRelationOpinion(w,a.id,choice.b.id,6);changeRelationOpinion(w,choice.b.id,a.id,6);const text=getPerson(w,a.id)!.name+'与'+choice.b.name+'同城交往，双方好感各 +6，暂未达成婚意愿。';w.relationships.history.push({day:w.day,actor:a.id,target:choice.b.id,text});w.relationships.history=w.relationships.history.slice(-100);continue;}
  actFamilyMarriage(w,choice.command,a.id);
 }
}

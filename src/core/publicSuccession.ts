import {allegianceRealm} from './officeEligibility';
import {relationshipPersonById} from '../data/relationships';
import {allPeople,getPerson,parentLinksOf} from './personRegistry';
import {ageAt,isAlive} from './lifeState';
import type {World} from './types';
import type {RealmId} from './realm';
import {dynasticKin,rulerEligibility} from './claims';
export type PublicOffice='ruler'|'executive';
export interface PublicHeirs {ruler:string|null;executive:string|null;dynasty:string|null}
export type NominateCommand={type:'government';action:'nominate';office:PublicOffice;candidate:string|null;name?:string};
export function publicFamily(id:string,w?:World):string|undefined {return (w?getPerson(w,id):relationshipPersonById[id])?.family;}
export function successionCandidates(w:World,r:RealmId,office:PublicOffice='executive'){return allPeople(w).filter(p=>allegianceRealm(w,p.id)===r&&isAlive(w,p.id)&&(office==='ruler'?!rulerEligibility(w,r,p.id):(ageAt(w,p.id)??0)>=16)).map(p=>p.id);}
/** Recorded children precede collateral kin; stable age ordering is a game succession rule. */
export function publicSuccessor(w:World,r:RealmId,office:PublicOffice,former?:string):string|null {
 const g=w.realm!.governments!.realms[r],holder=former??(office==='ruler'?g.ruler:g.executives[0]),eligible=successionCandidates(w,r,office).filter(id=>id!==holder);
 const designated=g.heirs?.[office];if(designated&&isAlive(w,designated)&&allegianceRealm(w,designated)===r&&(eligible.includes(designated)||office==='ruler'&&!!g.heirs?.dynasty&&!rulerEligibility(w,r,designated,{allowFounder:true})))return designated;
 if(office==='executive'){const continuing=g.executives.find(id=>eligible.includes(id));if(continuing)return continuing;}
 const kin=eligible.filter(id=>dynasticKin(w,holder,id)),children=new Set(parentLinksOf(w).filter(l=>l.parent===holder).map(l=>l.child));
 kin.sort((a,b)=>Number(children.has(b))-Number(children.has(a))||(ageAt(w,b)??0)-(ageAt(w,a)??0)||a.localeCompare(b));
 if(kin[0])return kin[0];if(office==='executive'){const ministers=Object.values(g.court?.ministries??{});return eligible.sort((a,b)=>Number(ministers.includes(b))-Number(ministers.includes(a))-(g.merit[a]??0)+(g.merit[b]??0)||(ageAt(w,b)??0)-(ageAt(w,a)??0)||a.localeCompare(b))[0]??null;}return null;
}
export function nominationReason(w:World,c:NominateCommand,authority:string|undefined):string {
 if(!w.realm?.governments||!w.characterId||w.campaign?.status!=='active')return '此局无法议定继承';
 const r=allegianceRealm(w,w.characterId)!,g=w.realm.governments.realms[r];
 if(!isAlive(w,w.characterId)||(ageAt(w,w.characterId)??0)<16)return '须成年后议定继承';
 if(!['ruler','executive'].includes(c.office))return '未知继承职位';
 if(c.office==='ruler'?w.characterId!==g.ruler&&w.characterId!==authority:w.characterId!==authority)return '仅君主或掌政者可议定相应继承';
 if(g.task||g.court?.founding)return '请先完成或撤回现有议程';
 if(c.candidate===null)return g.heirs?.[c.office]?'':'尚未指定继承人';
 const incumbent=c.office==='ruler'?g.ruler:g.executives[0];if(!incumbent||!isAlive(w,incumbent))return '此职位虚悬，无法议定身后继承';
 if(c.office==='ruler'?!!rulerEligibility(w,r,c.candidate,{allowFounder:!!c.name?.trim()}):!successionCandidates(w,r,c.office).includes(c.candidate))return c.office==='ruler'?'君位继承人须为本国在世自由人物并有承统来源，异族须明确另立国统':'执政继任人须为本国在世成年人物';
 if(c.candidate===(c.office==='ruler'?g.ruler:g.executives[0]))return '在位者不能继承自己';
 if(g.heirs?.[c.office]===c.candidate&&(c.office==='executive'||g.heirs.dynasty===(c.name?.trim()||null)))return '继承安排未变化';
 if(c.office==='ruler'&&!dynasticKin(w,c.candidate,g.ruler)){
  if(g.support<70||g.legitimacy<40)return '异姓承统需朝野支持 70、合法性 40';
  if(!/^[\u3400-\u9fff]{1,6}$/.test(c.name?.trim()??''))return '异姓承统须议定 1—6 个汉字的新国号';
  if(w.realm.governments.regimes.filter(v=>v.realm===r).length>=12)return '本局政权沿革已达上限';
 }else if(c.name?.trim())return '同族继承或执政交接不更改国号';
 return w.realm.influence<20?'议定继承需 20 影响力':'';
}

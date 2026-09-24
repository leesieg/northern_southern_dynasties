import {relationshipPeople,relationshipPersonById} from '../data/relationships';
import {parentLinks} from '../data/families';
import {characterById} from '../data/characters';
import {ageAt,isAlive} from './lifeState';
import type {World} from './types';
import type {RealmId} from './realm';
export type PublicOffice='ruler'|'executive';
export interface PublicHeirs {ruler:string|null;executive:string|null;dynasty:string|null}
export type NominateCommand={type:'government';action:'nominate';office:PublicOffice;candidate:string|null;name?:string};
export function publicFamily(id:string):string|undefined {return relationshipPersonById[id]?.family;}
export function successionCandidates(w:World,r:RealmId){return relationshipPeople.filter(p=>p.realm===r&&isAlive(w,p.id)&&(ageAt(w,p.id)??0)>=16).map(p=>p.id);}
/** Recorded children precede collateral kin; stable age ordering is a game succession rule. */
export function publicSuccessor(w:World,r:RealmId,office:PublicOffice,former?:string):string|null {
 const g=w.realm!.governments!.realms[r],holder=former??(office==='ruler'?g.ruler:g.executives[0]),eligible=successionCandidates(w,r).filter(id=>id!==holder);
 const designated=g.heirs?.[office];if(designated&&eligible.includes(designated))return designated;
 if(office==='executive'){const continuing=g.executives.find(id=>eligible.includes(id));if(continuing)return continuing;}
 const kin=eligible.filter(id=>publicFamily(holder)===publicFamily(id));
 kin.sort((a,b)=>Number(parentLinks.some(l=>l.parent===holder&&l.child===b))-Number(parentLinks.some(l=>l.parent===holder&&l.child===a))||(ageAt(w,b)??0)-(ageAt(w,a)??0)||a.localeCompare(b));
 return kin[0]??null;
}
export function nominationReason(w:World,c:NominateCommand,authority:string|undefined):string {
 if(!w.realm?.governments||!w.characterId||w.campaign?.status!=='active')return '此局无法议定继承';
 const r=characterById[w.characterId].polity,g=w.realm.governments.realms[r];
 if(!['ruler','executive'].includes(c.office))return '未知继承职位';
 if(c.office==='ruler'?w.characterId!==g.ruler&&w.characterId!==authority:w.characterId!==authority)return '仅君主或掌政者可议定相应继承';
 if(g.task||g.court?.founding)return '请先完成或撤回现有议程';
 if(c.candidate===null)return g.heirs?.[c.office]?'':'尚未指定继承人';
 const incumbent=c.office==='ruler'?g.ruler:g.executives[0];if(!incumbent||!isAlive(w,incumbent))return '此职位虚悬，无法议定身后继承';
 if(!successionCandidates(w,r).includes(c.candidate))return '继承人须为本国在世成年人物';
 if(c.candidate===(c.office==='ruler'?g.ruler:g.executives[0]))return '在位者不能继承自己';
 if(g.heirs?.[c.office]===c.candidate&&(c.office==='executive'||g.heirs.dynasty===(c.name?.trim()||null)))return '继承安排未变化';
 if(c.office==='ruler'&&publicFamily(c.candidate)!==publicFamily(g.ruler)){
  if(g.support<70||g.legitimacy<40)return '异姓承统需朝野支持 70、合法性 40';
  if(!/^[\u3400-\u9fff]{1,6}$/.test(c.name?.trim()??''))return '异姓承统须议定 1—6 个汉字的新国号';
  if(w.realm.governments.regimes.filter(v=>v.realm===r).length>=12)return '本局政权沿革已达上限';
 }else if(c.name?.trim())return '同族继承或执政交接不更改国号';
 return w.realm.influence<20?'议定继承需 20 影响力':'';
}

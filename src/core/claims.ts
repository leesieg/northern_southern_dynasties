import {allPeople,getPerson,parentLinksOf} from './personRegistry';
import {relationshipParents} from '../data/relationships';
import {isAlive} from './lifeState';
import {detained} from './custodyState';
import {allegianceRealm} from './officeEligibility';
import type {World} from './types';
import type {RealmId} from './realm';

export interface ClaimRecord {realm:RealmId;dynasty:string;person:string;royal:string;patron:string;since:number;kind:'support'|'deposed'|'designated';until:number|null}
export interface ClaimsState {version:1;records:ClaimRecord[]}
export type ClaimsCommand={type:'claim';action:'support'|'renounce';realm:RealmId;person:string};
export function ensureClaims(w:World){return w.claims??={version:1,records:[]};}
/** Only recorded parentage establishes kinship; a surname or clan label is insufficient. */
export function dynasticKin(w:World,a:string,b:string){
 if(a===b)return !!getPerson(w,a);const links=[...parentLinksOf(w),...relationshipParents];
 const ancestors=(id:string)=>{const seen=new Set([id]),queue=[id];for(let i=0;i<queue.length;i++)for(const link of links)if(link.child===queue[i]&&!seen.has(link.parent)){seen.add(link.parent);queue.push(link.parent);}return seen;};
 const x=ancestors(a),y=ancestors(b);return [...x].some(id=>y.has(id));
}
export function claimantProvenance(w:World,r:RealmId,person:string){
 if(!getPerson(w,person))return null;const g=w.realm?.governments?.realms[r];if(!g)return null;
 const royal=[{person:g.ruler,dynasty:g.dynasty},...(w.rulerHistory?.tenures??[]).filter(t=>t.realm===r&&t.office==='ruler').map(t=>({person:t.person,dynasty:t.dynasty})),...(w.realm?.governments?.regimes??[]).filter(v=>v.realm===r).map(v=>({person:v.ruler,dynasty:v.dynasty}))];
 return royal.find(v=>dynasticKin(w,person,v.person))??null;
}
export function activeClaim(w:World,r:RealmId,person:string){return (w.claims?.records??[]).find(c=>c.realm===r&&c.person===person&&c.until===null&&isAlive(w,person)&&!!claimantProvenance(w,r,person));}
export function rulerEligibility(w:World,r:RealmId,person:string,options:{allowForeign?:boolean;allowFounder?:boolean}={}){
 if(!getPerson(w,person)||!isAlive(w,person)||detained(w,person))return '君位候选人须为在世且自由的实际人物';
 if(!options.allowForeign&&allegianceRealm(w,person)!==r)return '君位候选人须在本国';
 if(options.allowFounder)return '';
 const g=w.realm?.governments?.realms[r];return g&&dynasticKin(w,person,g.ruler)||claimantProvenance(w,r,person)?'':'须有本国王族亲缘或前朝承统来源；异族请明确另立国统';
}
export function supportClaim(w:World,r:RealmId,person:string,patron:string,kind:ClaimRecord['kind']='support'){
 const provenance=claimantProvenance(w,r,person);if(!provenance||!isAlive(w,person)||!getPerson(w,patron)||!isAlive(w,patron))throw new Error('拥立对象缺少实际承统来源或支持者');
 const s=ensureClaims(w),existing=s.records.find(c=>c.realm===r&&c.person===person&&c.patron===patron&&(c.until===null||c.since===w.day));if(existing){existing.until=null;return existing;}
 const record:ClaimRecord={realm:r,dynasty:provenance.dynasty,person,royal:provenance.person,patron,since:w.day,kind,until:null};s.records.push(record);return record;
}
export function claimReason(w:World,c:ClaimsCommand,actor=w.characterId!){if(!getPerson(w,actor)||!isAlive(w,actor)||detained(w,actor)||w.campaign?.status!=='active')return '当前不能支持拥立';if(!w.realm?.governments?.realms[c.realm]||w.realm.annexed?.[c.realm])return '目标政权已不存在';if(c.action==='renounce')return w.claims?.records.some(q=>q.realm===c.realm&&q.person===c.person&&q.patron===actor&&q.until===null)?'':'没有本人提出的支持';if(c.action!=='support')return '未知拥立行动';if(rulerEligibility(w,c.realm,c.person,{allowForeign:true}))return rulerEligibility(w,c.realm,c.person,{allowForeign:true});if(w.realm.governments.realms[c.realm].ruler===c.person)return '此人已在君位';return w.claims?.records.some(q=>q.realm===c.realm&&q.person===c.person&&q.patron===actor&&q.until===null)?'已明确支持此人':'';}
export function actClaim(w:World,c:ClaimsCommand,actor=w.characterId!){const why=claimReason(w,c,actor);if(why)throw new Error(why);if(c.action==='support')supportClaim(w,c.realm,c.person,actor);else for(const q of ensureClaims(w).records)if(q.realm===c.realm&&q.person===c.person&&q.patron===actor&&q.until===null)q.until=w.day;}
export function royalCandidates(w:World,r:RealmId){return allPeople(w).filter(p=>!rulerEligibility(w,r,p.id));}
export function validClaims(value:unknown,w:World){
 if(!value||typeof value!=='object')return false;const s=value as ClaimsState;if(s.version!==1||!Array.isArray(s.records)||s.records.length>300)return false;
 const keys=new Set<string>();return s.records.every(c=>{if(!c||!w.realm?.governments?.realms[c.realm]||!getPerson(w,c.person)||!getPerson(w,c.royal)||!getPerson(w,c.patron)||!['support','deposed','designated'].includes(c.kind)||!Number.isSafeInteger(c.since)||c.since<0||c.since>w.day||c.until!==null&&(!Number.isSafeInteger(c.until)||c.until<c.since||c.until>w.day)||!dynasticKin(w,c.person,c.royal))return false;
 const source=w.realm.governments.regimes.some(v=>v.realm===c.realm&&v.dynasty===c.dynasty&&v.ruler===c.royal)||(w.rulerHistory?.tenures??[]).some(t=>t.realm===c.realm&&t.office==='ruler'&&t.dynasty===c.dynasty&&t.person===c.royal);if(!source)return false;const key=[c.realm,c.person,c.patron,c.since].join('|');if(keys.has(key))return false;keys.add(key);return true;});
}

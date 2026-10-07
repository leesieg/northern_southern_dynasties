import {getPerson} from './personRegistry';
import {governmentOf} from './government';
import {allegianceRealm} from './officeEligibility';
import {isAlive,ageAt,lifeOf} from './lifeState';
import {detained} from './custodyState';
import {personInfluence,awardInfluence} from './personalInfluence';
import {changeRelationOpinion} from './relationships';
import type {World} from './types';
import type {RealmId} from './realm';

/** Honor status; no land, administrative seat, treasury, or salary is created. */
export const nobleRanks={countyMarquis:{name:'县侯',cost:60,influence:20,merit:10,weight:1,standing:20},commanderyDuke:{name:'郡公',cost:120,influence:35,merit:25,weight:2,standing:50},stateDuke:{name:'国公',cost:200,influence:50,merit:40,weight:3,standing:80},king:{name:'王',cost:320,influence:70,merit:60,weight:4,standing:120}};
export type NobleRank=keyof typeof nobleRanks;
export interface NobleTitle {id:number;realm:RealmId;person:string;rank:NobleRank;name:string;rites:boolean;grantor:string;since:number;until:number|null;revoker?:string}
export interface NobilityState {version:1;nextId:number;titles:NobleTitle[]}
export type NobilityCommand={type:'nobility';action:'grant';person:string;rank:NobleRank;name:string;rites?:boolean}|{type:'nobility';action:'revoke';id:number};
export function ensureNobility(w:World){return w.nobility??={version:1,nextId:1,titles:[]};}
export function nobleTitle(w:World,person:string,r?:RealmId){return w.nobility?.titles.find(t=>t.person===person&&t.until===null&&(r===undefined||t.realm===r));}
export function nobilityStanding(w:World,person:string){const t=nobleTitle(w,person);return t&&isAlive(w,person)?nobleRanks[t.rank].standing:0;}
export function nobilityPoliticalWeight(w:World,person:string,r:RealmId){const t=nobleTitle(w,person,r);return t&&isAlive(w,person)?nobleRanks[t.rank].weight+(t.rites?1:0):0;}
export function nobilityReason(w:World,c:NobilityCommand,actor=w.characterId!){
 const r=allegianceRealm(w,actor),g=r&&governmentOf(w,r);if(!r||!g||!isAlive(w,actor)||detained(w,actor)||(ageAt(w,actor)??0)<16||w.campaign?.status!=='active')return '须本国在世成年且自由的君主';
 if(actor!==g.ruler)return '册封与夺爵须由现任君主办理';
 if(c.action==='revoke'){const t=w.nobility?.titles.find(t=>t.id===c.id);return !t||t.until!==null?'爵位已撤销':t.realm!==r?'只能撤销本朝所授爵位':'';}
 if(c.action!=='grant'||!Object.hasOwn(nobleRanks,c.rank))return '未知爵位';if(!getPerson(w,c.person)||!isAlive(w,c.person)||detained(w,c.person)||allegianceRealm(w,c.person)!==r)return '封爵须授予本国在世且自由的人物';if(c.person===g.ruler)return '君主不能给自己册封臣爵';
 const existing=nobleTitle(w,c.person);if(existing&&(existing.realm!==r||nobleRanks[c.rank].weight<nobleRanks[existing.rank].weight||c.rank===existing.rank&&(!c.rites||existing.rites)))return '已有爵位；晋爵或加殊礼须高于当前待遇';if(!/^[\u3400-\u9fff]{1,4}$/u.test(c.name.trim()))return '封号须为一至四个汉字的真实择号';if(w.nobility?.titles.some(t=>t.person!==c.person&&t.realm===r&&t.until===null&&t.name===c.name.trim()))return '此封号已有在世持有者';
 const rank=nobleRanks[c.rank];if((g.merit[c.person]??0)<rank.merit||personInfluence(w,c.person)<rank.influence)return rank.name+'须本人功绩 '+rank.merit+'、影响力 '+rank.influence;
 if(c.rites&&(!(c.rank==='king'||c.rank==='stateDuke')||(g.merit[c.person]??0)<80||personInfluence(w,c.person)<80))return '殊礼仅授国公或王，须功绩与个人影响力各 80';
 if(personInfluence(w,actor)<20)return '册封须君主影响力 20';return w.realm!.treasuries[r].coins<rank.cost+(c.rites?160:0)?'中央公库不足以支付册封礼仪':'';
}
export function actNobility(w:World,c:NobilityCommand,actor=w.characterId!){const why=nobilityReason(w,c,actor);if(why)throw new Error(why);const s=ensureNobility(w),r=allegianceRealm(w,actor)!;
 if(c.action==='revoke'){const t=s.titles.find(t=>t.id===c.id)!;t.until=w.day;t.revoker=actor;changeRelationOpinion(w,actor,t.person,-20);return;}
 const old=nobleTitle(w,c.person);if(old){old.until=w.day;old.revoker=actor;}w.realm!.treasuries[r].coins-=nobleRanks[c.rank].cost+(c.rites?160:0);awardInfluence(w,actor,-20);s.titles.push({id:s.nextId++,realm:r,person:c.person,rank:c.rank,name:c.name.trim(),rites:!!c.rites,grantor:actor,since:w.day,until:null});changeRelationOpinion(w,actor,c.person,15);
}
export function validNobility(value:unknown,w:World){if(!value||typeof value!=='object')return false;const s=value as NobilityState;if(s.version!==1||!Number.isSafeInteger(s.nextId)||s.nextId<1||!Array.isArray(s.titles)||s.titles.length>300)return false;
 const ids=new Set<number>(),live=new Set<string>();return s.titles.every(t=>{if(!t||!Number.isSafeInteger(t.id)||t.id<1||t.id>=s.nextId||ids.has(t.id)||!w.realm?.governments?.realms[t.realm]||!getPerson(w,t.person)||!getPerson(w,t.grantor)||!Object.hasOwn(nobleRanks,t.rank)||!/^[\u3400-\u9fff]{1,4}$/u.test(t.name)||typeof t.rites!=='boolean'||t.rites&&!['king','stateDuke'].includes(t.rank)||!Number.isSafeInteger(t.since)||t.since<0||t.since>w.day||t.until!==null&&(!Number.isSafeInteger(t.until)||t.until<t.since||t.until>w.day||!getPerson(w,t.revoker??'')&&lifeOf(w,t.person)?.death?.day!==t.until))return false;if(w.rulerHistory&&!w.rulerHistory.tenures.some(q=>q.realm===t.realm&&q.office==='ruler'&&q.person===t.grantor&&q.from<=t.since&&(q.until===null||q.until>=t.since)))return false;ids.add(t.id);if(t.until===null){if(live.has(t.person)||live.has(t.realm+'|'+t.name))return false;live.add(t.person);live.add(t.realm+'|'+t.name);}return true;});}

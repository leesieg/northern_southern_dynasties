import {ensureArmyOrganization} from './armyOrganization';
import {syncCourt} from './court';
import type {World} from './types';
import type {RealmId} from './realm';
import {realms} from './realm';
import {ensureFiscal,fiscalRecord} from './treasury';
import {returnArmyConvoy} from './armyLogistics';
import {siteById} from '../data/scenario';
export interface Annexation {into:RealmId;day:number;sites:string[];coins:number;grain:number;debt:number}
export function survivingRealm(w:World,r:RealmId):RealmId{const seen=new Set<RealmId>();while(w.realm?.annexed?.[r]&&!seen.has(r)){seen.add(r);r=w.realm.annexed[r]!.into;}return r;}
export function annexationReason(w:World,winner:RealmId,loser:RealmId){const s=w.realm;if(!s||winner===loser||s.annexed?.[winner]||s.annexed?.[loser])return '政权已失效';
 const cities=Object.entries(s.cities).filter(([,c])=>c.owner===loser),victor=s.armies.filter(a=>a.realm===winner).reduce((n,a)=>n+a.troops,0),enemy=s.armies.filter(a=>a.realm===loser);
 return !cities.length?'对方已无可接管领土':cities.some(([,c])=>c.controller!==winner)?'必须实际控制对方全部县域，第三国占领不能代算':enemy.some(a=>a.journey||a.morale>30||s.cities[a.location].controller!==winner)||enemy.reduce((n,a)=>n+a.troops,0)>victor/4?'对方尚有有效抵抗，须控制残军驻地并瓦解其士气':s.wars?.some(v=>v.civil&&v.attacker===loser)?'须先结束对方内战并确定接管范围':'';
}
/** Preserve retired polities as historical identities; their live assets have a single successor. */
export function annexPolity(w:World,winner:RealmId,loser:RealmId){const why=annexationReason(w,winner,loser);if(why)throw new Error(why);const s=w.realm!,f=ensureFiscal(w)!;
 const sites=Object.keys(s.cities).filter(id=>s.cities[id].owner===loser),record:Annexation={into:winner,day:w.day,sites,coins:0,grain:0,debt:0};(s.annexed??={})[loser]=record;
 for(const id of sites){const c=s.cities[id];c.owner=winner;c.controller=winner;c.governor=null;delete c.occupiedSince;if(c.fortification?.due!=null){c.fortification.due=null;w.chronicle.push({day:w.day,person:'player',text:siteById[id].name+'原城防工程因吞并停建，既有支出不退。'});}c.integration={since:w.day,progress:0,funded:false};c.order=Math.max(0,c.order-25);c.prosperity=Math.max(0,c.prosperity-10);}w.chronicle=w.chronicle.slice(-100);
 // Local balances retain their territorial destination, not an unearned central windfall.
 for(const [key,n] of Object.entries(f.balances)){if(!key.startsWith(loser+'|'))continue;const to=winner+key.slice(loser.length),amount=Math.min(n,1_000_000-(f.balances[to]??0));f.balances[key]-=amount;f.balances[to]=(f.balances[to]??0)+amount;fiscalRecord(w,winner,key,to,amount,'吞并接管地方公库');}
 for(const a of s.armies.filter(a=>a.realm===loser)){const leader=w.mobility?.armyCommanders?.[a.id!];if(leader&&w.mobility){delete w.mobility.armyCommanders![a.id!];if(leader===w.characterId)w.people[0].journey=null;else if(w.mobility.residences[leader])w.mobility.residences[leader].journey=null;}a.realm=winner;returnArmyConvoy(w,a);a.realm=loser;const c=s.cities[a.location];let people=Math.min(a.troops,1_000_000-c.population);if(a.troops-people>0&&a.troops-people<100)people=Math.max(0,a.troops-100);c.population+=people;a.troops-=people;if(a.arrears){(s.armyDebts??=[]).push({realm:winner,account:'central:'+winner,coins:a.arrears});record.debt+=a.arrears;a.arrears=0;}c.grain=Math.min(1_000_000,c.grain+a.supply);a.supply=0;}
 s.armies=s.armies.filter(a=>a.realm!==loser||a.troops>0);for(const a of s.armies.filter(a=>a.realm===loser)){a.realm=winner;a.payer='central:'+winner;a.morale=20;a.trainingStarted=w.day;a.trainingUntil=w.day+60;}
 for(const d of s.armyDebts??[])if(d.realm===loser){record.debt+=d.coins;d.realm=winner;d.account='central:'+winner;}
 for(const d of w.obligations?.items??[]){if(!d.remaining)continue;const successor=(key:string)=>key==='central:'+loser?'central:'+winner:key.startsWith(loser+'|')?winner+key.slice(loser.length):key;if(d.from==='central:'+loser||d.from.startsWith(loser+'|'))record.debt+=d.remaining;d.from=successor(d.from);d.to=successor(d.to);if(d.from===d.to){d.offset+=d.remaining;d.remaining=0;}}
 for(const debt of s.reparations??[]){if(debt.from===loser)debt.from=winner;if(debt.to===loser)debt.to=winner;}s.reparations=s.reparations?.filter(d=>d.from!==d.to);
 if(s.local?.cycle?.rounds[loser]?.status==='pending'){s.local.cycle.rounds[loser]!.status='cancelled';s.local.cycle.rounds[loser]!.reason='原政权终止，铨选取消';}
 for(const t of s.population?.transfers??[])if(t.realm===loser&&t.status==='traveling')t.realm=winner;
 s.offices=s.offices.filter(o=>o.realm!==loser&&!sites.includes(o.site));
 for(const [key,seat] of Object.entries(s.local?.seats??{}))if(key.startsWith(loser+'|')){seat.holder=null;seat.delegated=false;seat.actingUntil=null;}
 for(const q of s.local?.requests??[])if(q.realm===loser&&q.status==='pending'){q.status='cancelled';q.changed=w.day;q.reply='原政权已被吞并，须向接管朝廷重新请任';}
 for(const q of f.requests)if(q.realm===loser&&q.status==='pending'){q.status='cancelled';q.changed=w.day;q.reply='原政权终止，未支出公款由接管朝廷统筹';}
 const g=s.governments?.realms[loser];if(g){g.task=null;if(g.court){for(const k of Object.keys(g.court.ministries) as (keyof typeof g.court.ministries)[])g.court.ministries[k]=null;g.court.petition=null;}}
 if(w.mobility){delete w.mobility.commanders[loser];for(const key of Object.keys(w.mobility.armyCommanders??{}))if(!w.realm!.armies.some(a=>a.id===Number(key)))delete w.mobility.armyCommanders![Number(key)];if(w.mobility.captivity?.captor===loser)w.mobility.captivity=null;}
 if(w.diplomacy){for(const p of Object.values(w.diplomacy.pairs))if([p.a,p.b].includes(loser))p.treaties=[];w.diplomacy.missions=w.diplomacy.missions.filter(m=>m.from!==loser&&m.to!==loser);delete w.diplomacy.subjects[loser];for(const r of realms)if(w.diplomacy.subjects[r]===loser)delete w.diplomacy.subjects[r];}
 // A third state's war ends without granting its objectives or transferring its occupations.
 s.wars=s.wars?.filter(v=>![v.attacker,v.defender].includes(loser));for(const v of s.wars??[])if(v.allies)delete v.allies[loser];s.war=s.wars?.[0]??null;for(const c of Object.values(s.cities))if(c.controller===loser)c.controller=c.owner;
 syncCourt(w,loser);ensureArmyOrganization(w);advanceAnnexations(w);
}
export function advanceAnnexations(w:World){const s=w.realm;if(!s)return;for(const [old,value] of Object.entries(s.annexed??{})){const a=value!,r=old as RealmId,to=survivingRealm(w,a.into),from=s.treasuries[r],dest=s.treasuries[to];for(const resource of ['coins','grain'] as const){const n=Math.min(from[resource],1_000_000-dest[resource]);from[resource]-=n;dest[resource]+=n;a[resource]+=n;}const f=s.fiscal;if(f)for(const [key,n] of Object.entries(f.balances))if(key.startsWith(r+'|')&&n){const target=to+key.slice(r.length),paid=Math.min(n,1_000_000-(f.balances[target]??0));f.balances[key]-=paid;f.balances[target]=(f.balances[target]??0)+paid;}}}
export function validAnnexations(w:World){const s=w.realm?.annexed;if(s===undefined)return true;return !!s&&typeof s==='object'&&!Array.isArray(s)&&Object.entries(s).every(([r,a])=>realms.includes(r as RealmId)&&a&&realms.includes(a.into)&&r!==a.into&&survivingRealm(w,a.into)!==r&&Number.isInteger(a.day)&&a.day>=0&&a.day<=w.day&&Array.isArray(a.sites)&&a.sites.length>0&&new Set(a.sites).size===a.sites.length&&a.sites.every(id=>!!w.realm?.cities[id])&&['coins','grain','debt'].every(k=>Number.isSafeInteger(a[k as 'coins'])&&a[k as 'coins']>=0)&&!Object.values(w.realm!.cities).some(c=>c.owner===r||c.controller===r));}

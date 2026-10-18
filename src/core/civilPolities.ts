import {applyPowerArrangement} from './powerPolitics';
import {syncRulerHistory} from './rulerHistory';
import type {World} from './types';
import type {RealmId,Province} from './realm';
import type {War} from './wars';
import {activeWars,warRealmSide} from './wars';
import {worldRealms,realmOrigin,administrativeRealm} from './polityRuntime';
import {governmentOf} from './government';
import {getPerson,allPeople} from './personRegistry';
import {allegianceRealm,reconcileOfficeAllegiance} from './officeEligibility';
import {retainPersonalFollowers,detachRetainer} from './allegianceTransition';
import {armyCommander} from './mobility';
import {ensureFiscal,fiscalRecord,fiscalPath} from './treasury';
import {descendantSites} from '../data/territorialHierarchy';
import {newCourt,syncCourt} from './court';
import {syncRelationships} from './relationships';
import {ensureService,reconcileServiceAllegiance} from './assignments';
import {advanceAnnexations,survivingRealm} from './polityLifecycle';
import {stopEnvoy} from './envoyTravel';
import {finishCampaign} from './militaryCampaigns';
import {returnArmyConvoy} from './armyLogistics';
import {roads} from '../data/scenario';

export const civilOrigin=(war:War)=>war.defender;
export const independentCivil=(war:War)=>!!war.civil&&war.attacker!==war.defender;

/** An existing invasion cannot become harmless merely because the county's defenders raised a new flag. */
export function inheritCivilFronts(w:World,war:War){
 if(!independentCivil(war))return;
 const s=w.realm!,r=war.attacker,origin=civilOrigin(war),cities=Object.keys(s.cities).filter(id=>s.cities[id].controller===r);
 for(const other of activeWars(w)){
  const side=warRealmSide(other,origin);if(other.civil||!side||warRealmSide(other,r))continue;
  const enemies=worldRealms(w).filter(id=>warRealmSide(other,id)&&warRealmSide(other,id)!==side);
  const protectedByTreaty=enemies.some(id=>w.diplomacy?.pairs[[r,id].sort().join('|')]?.treaties.some(t=>t.until>w.day&&['alliance','pact'].includes(t.kind)));
  if(protectedByTreaty)continue;
  const touches=(site:string)=>cities.includes(site)||roads.some(e=>!e.legacyOnly&&(e.from===site&&cities.includes(e.to)||e.to===site&&cities.includes(e.from)));
  if(cities.includes(other.target)||Object.entries(s.cities).some(([id,c])=>enemies.includes(c.controller as RealmId)&&touches(id))||s.armies.some(a=>enemies.includes(a.realm)&&(touches(a.location)||a.journey?.route.some(id=>cities.includes(id)))))(other.allies??={})[r]=side;
 }
}

/** Turn the responding camp into an actual government, without transferring legal title or creating resources. */
export function establishCivilPolity(w:World,war:War){
 if(!war.civil||independentCivil(war))return;
 const s=w.realm!,c=war.civil,origin=war.attacker,r:RealmId=`rebel-${war.id!}`,old=governmentOf(w,origin)!;
 if(s.governments!.realms[r])throw new Error('起兵军府标识重复');
 const cities=c.cities.filter(id=>s.cities[id].owner===origin&&s.cities[id].controller===origin);
 const people=[...new Set([c.claimant,...c.supporters])].filter(id=>allegianceRealm(w,id)===origin);
 const armies=s.armies.filter(a=>a.realm===origin&&c.armies.includes(a.id!));
 const commanders=new Map(armies.map(a=>[a.id!,armyCommander(w,a)]));
 for(const id of people)retainPersonalFollowers(w,id,origin,people);
 for(const id of people){
  if(w.relationships!.oaths[id]&&!people.includes(w.relationships!.oaths[id].lord))delete w.relationships!.oaths[id];
  if(w.retinue?.members[id]&&!people.includes(w.retinue.members[id].host))detachRetainer(w,id);
  (w.relationships!.allegiances??={})[id]={realm:r,from:origin,since:w.day,army:armies.find(a=>a.owner===id)?.id??0,source:'civil'};
 }
 const name=(getPerson(w,c.claimant)?.name??'起兵')+'军府',g=structuredClone(old);
 Object.assign(g,{ruler:c.claimant,executives:[c.claimant],dynasty:r,regimeId:r+'-0',support:50,legitimacy:40,herd:0,camp:c.base,lastCamp:w.day,heirs:{ruler:null,executive:null,dynasty:null},task:null,stages:[],cooldowns:{},arrangement:{goal:'executive',sponsor:c.claimant,beneficiary:c.claimant,executive:c.claimant,name:'',since:w.day}});
 delete g.court;delete g.resignedExecutives;
 s.governments!.realms[r]=g;s.treasuries[r]={coins:0,grain:0,lastIncome:0,lastExpense:0,lastFood:0};
 (s.identities??={})[r]={origin:realmOrigin(w,origin) as 'liang'|'east'|'west',capital:c.base,created:w.day,predecessor:origin,civilWar:war.id!};
 s.governments!.regimes.push({id:r+'-0',realm:r,dynasty:r,ruler:c.claimant,executives:[c.claimant],name,kind:'political',from:w.day,until:null,predecessor:null,source:null,cities});
 const f=ensureFiscal(w)!;f.net[r]=0;
 // Split shared district accounts by actual population, keeping every remainder in its source account.
 for(const [key,balance] of Object.entries(f.balances)){
  if(!key.startsWith(origin+'|'))continue;
  const territory=key.slice(origin.length+1),nodes=descendantSites(territory),total=nodes.filter(id=>s.cities[id]?.owner===origin).reduce((n,id)=>n+s.cities[id].population,0),part=nodes.filter(id=>cities.includes(id)).reduce((n,id)=>n+s.cities[id].population,0),amount=total?Math.floor(balance*part/total):0;
  if(amount){const to=r+'|'+territory;f.balances[key]-=amount;f.balances[to]=(f.balances[to]??0)+amount;fiscalRecord(w,r,key,to,amount,'起兵地区实际公库转入军府');}
 }
 for(const site of cities){const city=s.cities[site];city.controller=r;city.occupiedSince??=w.day;city.occupiedByWar=war.id;if(city.governor&&!people.includes(city.governor))city.governor=null;}
 c.cities=cities;c.supporters=people;
 const baseAccount=fiscalPath(w,c.base,r)[0],budget=f.balances[baseAccount]??0;
 if(budget){f.balances[baseAccount]=0;s.treasuries[r].coins=budget;fiscalRecord(w,r,baseAccount,'central:'+r,budget,'根据地公款归军府统筹');}
 for(const [key,seat] of Object.entries(s.local?.seats??{}))if(key.startsWith(origin+'|')&&seat.holder&&people.includes(seat.holder)&&descendantSites(key.slice(origin.length+1)).some(id=>cities.includes(id))){s.local!.seats[r+'|'+key.slice(origin.length+1)]={...seat,regime:r+'-0'};seat.holder=null;seat.delegated=false;}
 for(const a of armies){returnArmyConvoy(w,a);const campaign=w.militaryCampaigns?.items.find(q=>q.status==='active'&&q.army===a.id);if(campaign)finishCampaign(w,campaign,'failed','军队起兵，原委任结案退款');a.realm=r;a.payer=a.owner?'person:'+a.owner:'central:'+r;const commander=commanders.get(a.id!);if(commander&&people.includes(commander)){w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]=commander;}}
 war.attacker=r;
 // Existing enemies contesting a responding county remain enemies there. No alliance or treaty is inherited.
 inheritCivilFronts(w,war);
 if(w.diplomacy){w.diplomacy.credit[r]=40;w.diplomacy.bases[r]=g.regimeId;for(const other of worldRealms(w).filter(id=>id!==r))w.diplomacy.pairs[[r,other].sort().join('|')]={a:r,b:other,opinion:other===origin?-30:0,recognized:false,treaties:[],cooldowns:{}};}
 for(const q of w.militaryCampaigns?.items??[])if(q.status==='active'&&q.realm===origin&&people.includes(q.commander))finishCampaign(w,q,'failed','统帅起兵，原朝廷委任结案退款');
 if(w.mobility?.commanders[origin]&&people.includes(w.mobility.commanders[origin]!))delete w.mobility.commanders[origin];
 for(const [id,pending] of Object.entries(w.mobility?.pendingCommanders??{})){const army=s.armies.find(a=>a.id===Number(id));if(!army||allegianceRealm(w,pending.person)!==army.realm)delete w.mobility!.pendingCommanders![Number(id)];}
 ensureService(w);reconcileServiceAllegiance(w);g.court=newCourt(w,r);reconcileOfficeAllegiance(w);syncRelationships(w);syncCourt(w,origin);syncRulerHistory(w);
}

/** Reunification keeps private property, regiments, debts and foreign occupations. Retired balances drain as capacity permits. */
export function reuniteCivilPolity(w:World,war:War){
 if(!independentCivil(war))return;
 const s=w.realm!,r=war.attacker,origin=civilOrigin(war),sites=Object.keys(s.cities).filter(id=>administrativeRealm(w,id)===r);
 // Cancel commissions before moving their real funding accounts.
 for(const q of w.militaryCampaigns?.items??[])if(q.status==='active'&&q.realm===r)finishCampaign(w,q,'failed','内战结束，军府委任结案退款');
 for(const p of allPeople(w))if(allegianceRealm(w,p.id)===r){if(w.relationships!.oaths[p.id]&&allegianceRealm(w,w.relationships!.oaths[p.id].lord)!==r)delete w.relationships!.oaths[p.id];(w.relationships!.allegiances??={})[p.id]={realm:origin,from:r,since:w.day,army:0,source:'civil'};}
 const successor=(key:string)=>key==='central:'+r?'central:'+origin:key.startsWith(r+'|')?origin+key.slice(r.length):key;
 for(const a of s.armies)if(a.realm===r){a.realm=origin;a.payer=successor(a.payer??'central:'+r);}
 for(const d of s.armyDebts??[])if(d.realm===r){d.realm=origin;d.account=successor(d.account);}
 for(const d of w.obligations?.items??[]){d.from=successor(d.from);d.to=successor(d.to);if(d.from===d.to){d.offset+=d.remaining;d.remaining=0;}}
 for(const d of s.reparations??[]){if(d.from===r)d.from=origin;if(d.to===r)d.to=origin;}s.reparations=s.reparations?.filter(d=>d.from!==d.to);
 for(const t of s.population?.transfers??[])if(t.realm===r&&t.status==='traveling')t.realm=origin;
 for(const city of Object.values(s.cities))if(city.controller===r){city.controller=origin;if(city.owner===origin){delete city.occupiedSince;delete city.occupiedByWar;delete city.occupiedFrom;}}
 for(const [key,seat] of Object.entries(s.local?.seats??{}))if(key.startsWith(r+'|')){seat.holder=null;seat.delegated=false;seat.actingUntil=null;}
 s.offices=s.offices.filter(o=>o.realm!==r);
 for(const q of s.local?.requests??[])if(q.realm===r&&q.status==='pending'){q.status='cancelled';q.changed=w.day;q.reply='军府已撤并，须向朝廷重新请任';}
 for(const q of s.fiscal?.requests??[])if(q.realm===r&&q.status==='pending'){q.status='cancelled';q.changed=w.day;q.reply='军府已撤并，公款继续留存结算';}
 const round=s.local?.cycle?.rounds[r];if(round?.status==='pending'){round.status='cancelled';round.reason='军府撤并';}
 if(w.diplomacy){for(const pair of Object.values(w.diplomacy.pairs))if([pair.a,pair.b].includes(r))pair.treaties=[];for(const m of w.diplomacy.missions)if(m.from===r||m.to===r)stopEnvoy(w,m);w.diplomacy.missions=w.diplomacy.missions.filter(m=>m.from!==r&&m.to!==r);delete w.diplomacy.subjects[r];for(const other of worldRealms(w))if(w.diplomacy.subjects[other]===r)delete w.diplomacy.subjects[other];}
 // Substitute the successor only in actual foreign wars; never remove a third country's occupation.
 for(const other of activeWars(w))if(other!==war){if(other.attacker===r||other.defender===r)other.inheritedFrom=r;if(other.attacker===r)other.attacker=origin;if(other.defender===r)other.defender=origin;if(other.allies?.[r]){if(!warRealmSide(other,origin))(other.allies??={})[origin]=other.allies[r];delete other.allies[r];}if(other.peaceOffer&&[other.peaceOffer.from,other.peaceOffer.to].includes(r))delete other.peaceOffer;}
 s.wars=s.wars?.filter(v=>v===war||v.attacker!==v.defender);s.war=s.wars?.[0]??null;s.sieges=s.sieges?.filter(q=>s.wars?.some(v=>v.id===q.war));
 const g=governmentOf(w,r)!;g.task=null;if(g.court){for(const key of Object.keys(g.court.ministries) as (keyof typeof g.court.ministries)[])g.court.ministries[key]=null;g.court.petition=null;}
 if(w.relationships)delete w.relationships.regencies[r];if(w.mobility)delete w.mobility.commanders[r];
 (s.annexed??={})[r]={into:origin,day:w.day,sites,coins:0,grain:0,debt:0};advanceAnnexations(w);reconcileServiceAllegiance(w);reconcileOfficeAllegiance(w);syncCourt(w,r);syncRulerHistory(w);
}

export function migrateCivilPolities(w:World){for(const war of activeWars(w))if(war.civil&&!independentCivil(war))establishCivilPolity(w,war);}

/** The same wartime entity becomes a recognized polity; no second treasury, army or population is created. */
export function recognizeCivilPolity(w:World,war:War,name:string){
 const s=w.realm!,r=war.attacker,origin=civilOrigin(war),c=war.civil!,g=governmentOf(w,r)!;
 const sites=Object.keys(s.cities).filter(id=>s.cities[id].owner===origin&&s.cities[id].controller===r);
 for(const id of sites){const city=s.cities[id];city.owner=r;delete city.occupiedByWar;delete city.occupiedFrom;delete city.occupiedSince;}
 delete s.identities![r]!.civilWar;
 applyPowerArrangement(w,r,{goal:'dynasty',sponsor:c.claimant,beneficiary:g.ruler,executive:g.executives[0],name});
 s.wars=s.wars!.filter(v=>v!==war);s.war=s.wars[0]??null;s.sieges=s.sieges?.filter(q=>q.war!==war.id);
 s.truces[[origin,r].sort().join('|')]=w.day+360;
 for(const other of activeWars(w))if(!other.civil&&other.defender===origin&&sites.includes(other.target)){other.defender=r;(other.allies??={})[origin]='defend';delete other.allies[r];}
 for(const city of Object.values(s.cities))if(city.owner===origin&&city.controller!==origin&&city.occupiedByWar===war.id){city.controller=origin;delete city.occupiedSince;delete city.occupiedByWar;delete city.occupiedFrom;}
 reconcileOfficeAllegiance(w);syncRelationships(w);syncCourt(w,origin);syncCourt(w,r);syncRulerHistory(w);
}

export function closeCivilOccupations(w:World,war:War){
 for(const [site,city] of Object.entries(w.realm!.cities)){
  if(city.occupiedByWar!==war.id)continue;
  const remaining=activeWars(w).find(v=>city.owner!=='frontier'&&city.controller!=='frontier'&&warRealmSide(v,city.owner)&&warRealmSide(v,city.controller)&&warRealmSide(v,city.owner)!==warRealmSide(v,city.controller));
  if(remaining){city.occupiedByWar=remaining.id;continue;}
  city.controller=city.owner;delete city.occupiedSince;delete city.occupiedByWar;delete city.occupiedFrom;
  if(city.governor&&allegianceRealm(w,city.governor)!==administrativeRealm(w,site))city.governor=null;
 }
}

/** A foreign occupier's peace restores military control only while that camp's own civil war continues. */
export function restoreMilitaryOccupation(w:World,city:Province,ending:War){
 if(!city.occupiedFrom)return false;
 const to=survivingRealm(w,city.occupiedFrom);city.controller=to;delete city.occupiedFrom;
 const civil=activeWars(w).find(v=>v!==ending&&v.civil&&v.attacker===to&&v.defender===city.owner);
 if(civil){city.occupiedByWar=civil.id;city.occupiedSince=civil.started;}
 else{city.controller=city.owner;delete city.occupiedSince;delete city.occupiedByWar;}
 return true;
}

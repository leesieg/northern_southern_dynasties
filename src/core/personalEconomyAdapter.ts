import {dispatchNPC} from './mobility';
import {planRoute} from './world';
import {canEnter} from './diplomacy';
import {localSeatSite} from './localAdministration';
/** Adapter: operates on existing public/private accounts; no second wallet store. */
import {relationshipPeople, relationshipPersonById} from '../data/relationships';
import {territoryNodes} from '../data/territorialHierarchy';
import {siteById} from '../data/scenario';
import {isAlive, ageAt, lifeOf} from './lifeState';
import {allegianceRealm} from './officeEligibility';
import {governmentOf, governingExecutives} from './government';
import {localActive, localHolder, localHasJurisdiction, countyTerritory} from './localAdministration';
import {centralAccount, territoryAccount, publicBalance, fiscalRecord, ensureFiscal} from './treasury';
import {traitsFor, attributes} from './social';
import {changeRelationOpinion} from './relationships';
import {personResidence} from './residence';
import type {RealmId} from './realm';
import type {World} from './types';
import {
  actEconomy, advanceEconomy, newPersonalEconomy, economyReason,
  personalEconomyView, type EconomyHost, type WalletRef, type PublicAccountRef,
  type EconomyActor, type EconomyCommand,
} from './personalEconomyRules';

export function ensureEconomy(w: World): void {
  if (w.mode === 'sandbox' && w.realm && !w.economy) {
    w.economy = newPersonalEconomy(w.day);
    // The playable wallet is authoritative; the legacy NPC mirror is not another asset.
    if(w.characterId&&w.relationships)w.relationships.reserves[w.characterId]=0;
  }
}
function available(w: World, id: string): boolean {
  return !w.militaryCampaigns?.items.some(q=>q.status==='active'&&q.commander===id)&&!personResidence(w, id).traveling && lifeOf(w, id)?.illness?.severity !== 3
    && !w.diplomacy?.missions.some(m=>m.envoy===id)
    && !Object.values(w.mobility?.commanders ?? {}).includes(id)
    && !Object.values(w.mobility?.armyCommanders ?? {}).includes(id)
    && !w.mobility?.activities.some(a => !['done', 'cancelled'].includes(a.phase) && (a.actor === id || a.delegate === id))
    && !w.service?.tasks.some(t => t.phase !== 'closed' && (t.officer === id || t.helper === id))
    && !(w.duties?.task?.phase !== 'closed' && w.duties?.task?.officer === id)
    && !w.mobility?.appointments[id] && !w.retinue?.members[id]
    && !w.social?.lineage.slice(0, -1).some(p => p.id === id)
    && !(id === w.characterId && w.mobility?.captivity);
}
export function economyHost(w: World, snapshot=false): EconomyHost {
  const routes=new Map<string,ReturnType<typeof planRoute>>();
  const realmCache=new Map<RealmId,PublicAccountRef[]>();
  const managedCache=new Map<string,PublicAccountRef[]>(),auditCache=new Map<string,PublicAccountRef[]>();
  const privateWallet = (id: string): WalletRef | undefined => {
    if (!Object.hasOwn(relationshipPersonById, id)) return undefined;
    if (id === w.characterId) return {key: 'person:' + id, capacity: 1_000_000,
      read: () => w.people[0].coins, write: n => {w.people[0].coins = n;}};
    if (!w.relationships || !Object.hasOwn(w.relationships.reserves, id)) return undefined;
    // NPC and player accounts share the same safe-integer capacity.
    return {key: 'person:' + id, capacity: 1_000_000, read: () => w.relationships!.reserves[id],
      write: n => {w.relationships!.reserves[id] = n;}};
  };
  const actor = (id: string): EconomyActor | undefined => {
    if (!Object.hasOwn(relationshipPersonById, id)) return undefined;
    let skills:ReturnType<typeof attributes>|undefined;
    return {id, alive: isAlive(w, id), adult: (ageAt(w, id) ?? 0) >= 16,
      player: id === w.characterId, realm: allegianceRealm(w, id) ?? null,
      get available(){return available(w,id);}, get traits(){return traitsFor(w,id);},
      get stewardship(){return (skills??=attributes(w,id)).stewardship;}, get intrigue(){return (skills??=attributes(w,id)).intrigue;}};
  };
  const actors = (): EconomyActor[] => relationshipPeople.filter(p=>isAlive(w,p.id)).map(p=>actor(p.id)!);
  const account = (key: string): PublicAccountRef | undefined => {
    if (!w.realm) return undefined;
    if (key.startsWith('central:')) {
      const r = key.slice(8) as RealmId;
      if (!Object.hasOwn(w.realm.treasuries, r)) return undefined;
      return {id: key, realm: r, name: '中央国库', site: ({liang:'jiankang',east:'ye',west:'changan'})[r],
        holder: governingExecutives(w, r)[0] ?? null,
        wallet: {key, capacity: 1_000_000, read: () => w.realm!.treasuries[r].coins,
          write: n => {w.realm!.treasuries[r].coins = n;}}};
    }
    const [r, territory, ...extra] = key.split('|');
    if (extra.length || !Object.hasOwn(w.realm.treasuries, r) || !territoryNodes[territory]) return undefined;
    const realm = r as RealmId, node = territoryNodes[territory];
    const t = node.level === 'city' ? countyTerritory(territory.slice(5)) : territory;
    if (!['city', 'county', 'province', 'prefecture'].includes(node.level)
      || !localActive(w, t, realm) || territoryAccount(w, realm, t) !== key) return undefined;
    return {id: key, realm, name: node.name + '公库', site: localSeatSite(w,t,realm)??null,
      holder: localHolder(w, t, realm), wallet: {key, capacity: 1_000_000,
        read: () => publicBalance(w, key), write: n => {ensureFiscal(w)!.balances[key] = n;}}};
  };
  const realmAccounts = (r: RealmId): PublicAccountRef[] => {
    if (!w.realm) return [];
    if(snapshot&&realmCache.has(r))return realmCache.get(r)!;
    const keys = new Set<string>([centralAccount(r)]);
    for (const n of Object.values(territoryNodes)) {
      if (!['city', 'province', 'prefecture'].includes(n.level) || !localActive(w, n.id, r)) continue;
      keys.add(territoryAccount(w, r, n.id));
    }
    const list=[...keys].map(account).filter((a): a is PublicAccountRef => !!a && a.realm === r);if(snapshot)realmCache.set(r,list);return list;
  };
  const managedAccounts = (id: string): PublicAccountRef[] => {
    const r = allegianceRealm(w, id); if (!r || !isAlive(w, id)) return [];
    if(snapshot&&managedCache.has(id))return managedCache.get(id)!;
    const list=realmAccounts(r).filter(a => a.holder === id);if(snapshot)managedCache.set(id,list);return list;
  };
  const auditableAccounts = (id: string): PublicAccountRef[] => {
    const r = allegianceRealm(w, id); if (!r || !isAlive(w, id)) return [];
    const g = governmentOf(w, r), central = governingExecutives(w, r).includes(id)
      || g?.court?.ministries.censorate === id;
    if(snapshot&&auditCache.has(id))return auditCache.get(id)!;
    const upper=Object.entries(w.realm?.local?.seats??{}).some(([key,seat])=>seat.holder===id&&key.startsWith(r+'|')&&['province','prefecture'].includes(territoryNodes[key.split('|')[1]]?.level));
    const list=!central&&!upper?[]:realmAccounts(r).filter(a=>central||!a.id.startsWith('central:')&&a.holder!==id&&localHasJurisdiction(w,id,a.id.split('|')[1],r));if(snapshot)auditCache.set(id,list);return list;
  };
  return {
    canAudit:(id,key)=>{
      const r=allegianceRealm(w,id),a=account(key);if(!r||!a||a.realm!==r||!isAlive(w,id))return false;
      if(governingExecutives(w,r).includes(id)||governmentOf(w,r)?.court?.ministries.censorate===id)return true;
      return !key.startsWith('central:')&&a.holder!==id&&localHasJurisdiction(w,id,key.split('|')[1],r);
    },
    inspectionReason:(id,a)=>{
      if(!a.site)return '公库所在地不明';const r=allegianceRealm(w,id),at=personResidence(w,id);
      if(id===w.characterId&&at.site!==a.site)return '亲自查核须先抵达公库所在地';
      if(at.site===a.site)return '';if(!r)return '监察者无法抵达公库';
      const key=id+'|'+at.site+'|'+a.site;if(!routes.has(key))routes.set(key,planRoute(at.site,a.site,site=>canEnter(w,r,w.realm!.cities[site].controller,id)));
      return routes.get(key)?'':'监察者无法抵达公库';
    },
    inspectAt:(id,a)=>!!a.site&&!personResidence(w,id).traveling&&personResidence(w,id).site===a.site,
    dispatchInspector:(id,a)=>{if(a.site&&id!==w.characterId)dispatchNPC(w,id,a.site,routes.get(id+'|'+personResidence(w,id).site+'|'+a.site));},
    day: w.day, actors, actor, personal: privateWallet, account, managedAccounts, auditableAccounts,
    inspectors: id => {
      const r = allegianceRealm(w, id);
      return relationshipPeople.filter(p => allegianceRealm(w, p.id) === r && isAlive(w, p.id)
        && (ageAt(w, p.id) ?? 0) >= 16 && available(w, p.id)).map(p => p.id);
    },
    canMeet: (a, b) => available(w, a) && available(w, b)
      && personResidence(w, a).site === personResidence(w, b).site,
    stress: (id, delta) => {
      if (id === w.characterId && w.social) w.social.stress = Math.min(100, Math.max(0, w.social.stress + delta));
    },
    relationship: (a, b, amount) => {if (a !== b) changeRelationOpinion(w, a, b, amount);},
    charity: (_id, a, amount) => {
      if (a.site && w.realm?.cities[a.site]) w.realm.cities[a.site].order = Math.min(100, w.realm.cities[a.site].order + Math.min(3, Math.floor(amount / 10)));
    },
    sanction: (id, r, penalty) => {
      const g = governmentOf(w, r as RealmId);
      if (g) g.merit[id] = Math.max(0, (g.merit[id] ?? 0) - penalty);
    },
    log: (id, text) => {
      if (id !== w.characterId) return;
      w.chronicle.push({day: w.day, person: 'player', text: text.slice(0, 400)});
      w.chronicle = w.chronicle.slice(-100);
    },
    publicTransfer: (a, direction, amount, reason) => {
      // Keep a public expenditure entry; identification comes only from an investigation.
      fiscalRecord(w, a.realm as RealmId, direction === 'out' ? a.id : 'external',
        direction === 'out' ? 'expense' : a.id, amount, reason);
    },
  };
}
export type PersonalEconomyCommand = EconomyCommand | {type: 'economy'; action: 'activate'};
export function economyCommandReason(w: World, command: PersonalEconomyCommand): string {
  if (w.mode !== 'sandbox' || !w.realm || !w.characterId || w.campaign?.status !== 'active') return '仅在进行中的历史沙盒可用';
  if (w.realm.event) return '请先处理待决政务';
  if (command.action === 'activate') return w.economy ? '本局已开始持家结算' : '';
  return economyReason(w.economy ?? newPersonalEconomy(w.day), economyHost(w), w.characterId, command);
}
export function actPersonalEconomy(w: World, c: PersonalEconomyCommand): void {
  const reason = economyCommandReason(w, c); if (reason) throw new Error(reason);
  if (c.action === 'activate') {
    ensureEconomy(w);
    w.chronicle.push({day:w.day, person:'player', text:'持家账簿已建立，每三十日结算生活开支。'});
    w.chronicle = w.chronicle.slice(-100); return;
  }
  ensureEconomy(w);
  actEconomy(w.economy!, economyHost(w), w.characterId!, c);
}
export function advancePersonalEconomy(w: World): void {
  if (w.mode !== 'sandbox' || !w.realm) return;
  if (!w.economy) return;
  advanceEconomy(w.economy, economyHost(w,true));
}
export function economyPresentation(w: World) {
  const host = economyHost(w,true), state = w.economy ?? newPersonalEconomy(w.day), id = w.characterId!;
  const realm = allegianceRealm(w, id);
  // Put the player's real jurisdiction first, including province/prefecture treasuries.
  const donorKeys = realm ? [...new Set([
    ...host.managedAccounts(id).map(a => a.id), centralAccount(realm),
    ...Object.values(territoryNodes).filter(n => ['city','province','prefecture'].includes(n.level)
      && localActive(w,n.id,realm)).map(n => territoryAccount(w,realm,n.id)),
  ])] : [];
  return {view: personalEconomyView(state, host, id),
    managed: host.managedAccounts(id).map(a => ({id: a.id, name: a.name, balance: a.wallet.read()})),
    audits: host.auditableAccounts(id).map(a => ({id: a.id, name: a.name})),
    donations: donorKeys.map(key => host.account(key)).filter((a): a is PublicAccountRef => !!a).map(a => ({id: a.id, name: a.name})),
    inspectors: host.inspectors(id).map(id => ({id, name: relationshipPersonById[id].name})),
    acquaintances: relationshipPeople.filter(p => p.id !== id && host.actor(p.id)?.adult && host.actor(p.id)?.alive && host.canMeet(id, p.id))
      .map(p => ({id: p.id, name: p.name})),
    place: siteById[w.people[0].location]?.name ?? '',
  };
}

export function economyPending(w:World){
 if(!w.economy||!w.characterId||w.campaign?.status!=='active')return [];
 const host=economyHost(w),accounts=new Set(host.auditableAccounts(w.characterId).map(a=>a.id));
 return w.economy.investigations.filter(q=>q.phase==='report'&&accounts.has(q.account)&&!w.economy!.misconduct.some(m=>q.findings.includes(m.id)&&m.person===w.characterId));
}

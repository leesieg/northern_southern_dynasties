/** Real command, save and succession regression coverage for personal accounts. */
import {describe, it, expect} from 'vitest';
import {newCampaignWorld, act, advance} from './world';
import {serializeWorld, parseWorld, validateWorld} from './save';
import {economyHost, economyCommandReason, economyPresentation} from './personalEconomyAdapter';
import {actEconomy} from './personalEconomyRules';
import {governmentOf} from './government';
import {localPoliticalBasis} from './officePower';
import {dispatchCommissionedEnvoy} from './diplomacy';
import {personResidence} from './residence';

describe('personal economy integration', () => {
  it('keeps new/old sandbox saves unchanged until the first settled day', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    expect(w.economy).toBeUndefined();
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('activation does not mint or retrospectively charge private or public funds', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    const before = [w.people[0].coins, w.realm!.treasuries.west.coins];
    act(w, {type:'economy', action:'activate'});
    expect([w.people[0].coins, w.realm!.treasuries.west.coins]).toEqual(before);
    expect(w.economy?.since).toBe(w.day);
    expect(() => act(w, {type:'economy', action:'activate'})).toThrow('已开始');
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('disables paid merit after account initialization, without erasing existing merit', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    act(w, {type:'economy', action:'activate'});
    const coins = w.people[0].coins, merit = governmentOf(w)!.merit[w.characterId!];
    expect(() => act(w, {type:'government', action:'appraise'})).toThrow('不再收取');
    expect(w.people[0].coins).toBe(coins);
    expect(governmentOf(w)!.merit[w.characterId!]).toBe(merit);
  });
  it('offers the serving province treasury and conserves repeat private deposits without farming benefits', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    const presentation = economyPresentation(w), host=economyHost(w);
    const province=host.managedAccounts('dugu-xin').find(a=>a.id.includes('|province:'))!;
    expect(province).toBeDefined();
    expect(presentation.donations.some(a=>a.id===province.id)).toBe(true);
    const total=w.people[0].coins+province.wallet.read();
    act(w,{type:'economy',action:'donate',account:province.id,amount:20});
    const order=w.realm!.cities[province.site!].order,stress=w.social!.stress;
    act(w,{type:'economy',action:'donate',account:province.id,amount:20});
    expect(province.wallet.read()).toBe(40);
    expect(w.people[0].coins+province.wallet.read()).toBe(total);
    expect(w.realm!.cities[province.site!].order).toBe(order);
    expect(w.social!.stress).toBe(stress);
    const before=structuredClone(w);w.people[0].coins=0;
    expect(()=>act(w,{type:'economy',action:'donate',account:province.id,amount:20})).toThrow('个人钱不足');
    expect(province.wallet.read()).toBe(40);w.people[0].coins=before.people[0].coins;
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('uses actual account references for donations through the regular command path', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    act(w, {type:'economy', action:'activate'});
    const h = economyHost(w), account = h.account('central:west')!;
    const total = w.people[0].coins + account.wallet.read();
    act(w, {type:'economy', action:'donate', account:account.id, amount:20});
    expect(w.people[0].coins + account.wallet.read()).toBe(total);
    validateWorld(w);
  });
  it('recognizes an active province seat without requiring an extra county office', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    act(w, {type:'economy', action:'activate'});
    expect(localPoliticalBasis(w, 'dugu-xin', 'west')).toBeGreaterThanOrEqual(20);
    expect(Object.values(w.realm!.cities).some(c => c.governor === 'dugu-xin')).toBe(false);
  });
  it('does not assign an envoy awaiting a foreign reply to audit a public account', () => {
    const w = newCampaignWorld('yuwen-tai', undefined, 'sandbox');
    dispatchCommissionedEnvoy(w, 'liang', 'west');
    const mission = w.diplomacy!.missions[0], envoy = mission.envoy!;
    for(let day=0;day<120&&mission.status!=='audience';day++){if(w.realm!.event)act(w,{type:'realm',action:'event',choice:'decline'});advance(w);}
    expect(mission.status).toBe('audience');
    expect(personResidence(w,envoy).traveling).toBe(false);
    expect(economyHost(w).inspectors('county-official-jiankang')).not.toContain(envoy);
    validateWorld(w);
  });
  it('has a real embezzlement / investigation / restitution path with NPC wallets', () => {
    const w = newCampaignWorld('yuwen-tai', undefined, 'sandbox');
    act(w, {type:'economy', action:'activate'});
    const actor = w.realm!.cities.tianshui.governor!;
    const host = economyHost(w), account = host.managedAccounts(actor).find(a => a.site === 'tianshui')!;
    account.wallet.write(200);
    const money = host.personal(actor)!.read();
    actEconomy(w.economy!, host, actor, {type:'economy', action:'embezzle', account:account.id, amount:20});
    expect(account.wallet.read()).toBe(180);
    expect(host.personal(actor)!.read()).toBe(money + 20);
    const inspector = host.inspectors(w.characterId!).find(id => id !== actor && id !== w.characterId)!;
    act(w, {type:'economy', action:'audit', account:account.id, inspector});
    w.economy!.investigations[0].roll = 0;
    advance(w, 14);
    expect(w.economy!.investigations[0].outcome).toBe('pending'); // Travel is additional to fourteen days at the treasury.
    for(let day=0;day<120&&w.economy!.investigations[0].phase==='investigating';day++){w.realm!.event=null;advance(w);}
    const q = w.economy!.investigations[0];
    expect(q.outcome).toBe('substantiated');
    const before = host.personal(actor)!.read() + account.wallet.read();
    act(w, {type:'economy', action:'resolve', caseId:q.id, decision:'recover'});
    expect(host.personal(actor)!.read() + account.wallet.read()).toBe(before);
    expect(w.economy!.misconduct[0].recovered).toBe(20);
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('starts on the first day without duplicating the playable wallet',()=>{
    const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),coins=w.people[0].coins;
    advance(w);expect(w.economy).toBeDefined();expect(w.people[0].coins).toBe(coins);
    expect(w.relationships!.reserves[w.characterId!]).toBe(0);
  });
  it('retains liability-backed assets and merges only real successor funds on succession',()=>{
    const w=newCampaignWorld('xiao-yan',undefined,'sandbox');act(w,{type:'economy',action:'activate'});
    const account=economyHost(w).managedAccounts('xiao-yan')[0];account.wallet.write(500);
    act(w,{type:'economy',action:'embezzle',account:account.id,amount:100});
    const own=w.people[0].coins,heir=w.relationships!.reserves['xiao-yi'];
    act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});
    expect(w.relationships!.reserves['xiao-yan']).toBe(100);
    expect(w.people[0].coins).toBe(own+heir-100);
    expect(w.relationships!.reserves['xiao-yi']).toBe(0);
    expect(w.economy!.misconduct[0].person).toBe('xiao-yan');
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('allows the same personal capacity for NPCs and keeps restitution conserved',()=>{
    const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');act(w,{type:'economy',action:'activate'});
    const h=economyHost(w),wallet=h.personal('dugu-xin')!;wallet.write(1200);
    expect(wallet.capacity).toBe(h.personal(w.characterId!)!.capacity);
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('does not expose new commands in tutorial mode' , () => {
    const w = newCampaignWorld(undefined, undefined, 'tutorial');
    expect(economyCommandReason(w, {type:'economy', action:'activate'})).toContain('历史沙盒');
    expect(w.economy).toBeUndefined();
  });
  it('rejects corrupted added save state before executing commands', () => {
    const w = newCampaignWorld('dugu-xin', undefined, 'sandbox');
    act(w, {type:'economy', action:'activate'});
    w.economy!.seed = -1;
    expect(() => serializeWorld(w)).toThrow('存档');
  });
});

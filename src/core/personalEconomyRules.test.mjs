import {monthStart} from './calendar';
import {test} from 'vitest';
import assert from 'node:assert/strict';
import * as R from './personalEconomyRules';
import {assignmentIncidentRisk} from './assignmentIncidentRisk';

function fixture() {
  const wallets = {p: 120, chief: 200, inspector: 100, foreign: 100};
  const balances = {county: 500, central: 600, foreign: 800};
  const people = Object.fromEntries(Object.keys(wallets).map(id => [id, {
    id, alive: true, adult: true, player: id === 'p', available: true,
    realm: id === 'foreign' ? 'other' : 'home', traits: [], stewardship: 12, intrigue: 8,
  }]));
  const holders = {county: 'p', central: 'chief', foreign: 'foreign'};
  const disabled = new Set(), logs = [], publicEntries = [], sanctions = [], opinions = [], stress = [];
  const wallet = id => ({key: 'person:' + id, capacity: 1000,
    read: () => wallets[id], write: n => {wallets[id] = n;}});
  const account = id => Object.hasOwn(balances, id) && !disabled.has(id) ? {
    id, name: id, realm: id === 'foreign' ? 'other' : 'home', site: id === 'central' ? null : id, holder: holders[id],
    wallet: {key: 'public:' + id, capacity: 1_000_000, read: () => balances[id], write: n => {balances[id] = n;}},
  } : undefined;
  const s = R.newPersonalEconomy(0);
  const h = {
    day: 0, actors: () => Object.values(people), actor: id => people[id],
    personal: id => Object.hasOwn(wallets, id) ? wallet(id) : undefined, account,
    managedAccounts: id => Object.keys(balances).filter(k => holders[k] === id).map(account).filter(Boolean),
    auditableAccounts: id => id === 'chief' && people.chief.alive ? ['county', 'central'].map(account).filter(Boolean) : [],
    inspectors: id => id === 'chief' ? ['inspector', 'p', 'chief'] : [],
    canMeet: (a, b) => people[a]?.available && people[b]?.available && people[a]?.realm === people[b]?.realm,
    stress: (a, d) => stress.push([a, d]), relationship: (a, b, d) => opinions.push([a, b, d]),
    charity: () => {}, sanction: (...args) => sanctions.push(args),
    log: (actor, message) => logs.push([actor, message]),
    publicTransfer: (a, d, amount, reason) => publicEntries.push({id: a.id, d, amount, reason}),
  };
  const act = (command, actor = 'p') => R.actEconomy(s, h, actor, {type: 'economy', ...command});
  const advance = n => {for (let i = 0; i < n; i++) {h.day++; R.advanceEconomy(s, h);}};
  const valid = () => R.validPersonalEconomy(s, h.day, id => Object.hasOwn(people, id));
  return {s, h, wallets, balances, people, holders, disabled, publicEntries, sanctions, opinions, stress, logs, act, advance, valid};
}
function openProvenCase(f, amount = 40) {
  f.act({action: 'embezzle', account: 'county', amount});
  f.act({action: 'audit', account: 'county', inspector: 'inspector'}, 'chief');
  f.s.investigations[0].roll = 0;
  f.advance(14);
  assert.equal(f.s.investigations[0].outcome, 'substantiated');
  return f.s.investigations[0];
}

test('new/migrated state creates no money, charges no prior periods', () => {
  const f = fixture(); const before = structuredClone(f.wallets);
  const s = R.newPersonalEconomy(720); R.budgetFor(s, 'p', 720);
  assert.deepEqual(f.wallets, before); assert.equal(s.budgets.p.lastMonth, monthStart(720));
  assert.equal(R.validPersonalEconomy(s, 720), true);
});
test('living rule change does not debit a second time; monthly settlement idempotent', () => {
  const f = fixture(); f.act({action: 'living', standard: 'comfortable'});
  assert.equal(f.wallets.p, 120); f.advance(31); assert.equal(f.wallets.p, 112);
  const snap = JSON.stringify(f.s); R.advanceEconomy(f.s, f.h);
  assert.equal(f.wallets.p, 112); assert.equal(JSON.stringify(f.s), snap); assert.ok(f.valid());
});
test('living costs stop at zero and optional luxury downgrades without debt minting', () => {
  const f = fixture(); f.wallets.p = 5; f.act({action: 'living', standard: 'lavish'}); f.advance(31);
  assert.equal(f.wallets.p, 0); assert.equal(f.s.budgets.p.standard, 'modest');
  assert.equal(f.s.budgets.p.lastPaid, 5); assert.equal(f.s.budgets.p.lastBill, 24);
  f.advance(31); assert.equal(f.wallets.p, 0); assert.ok(f.valid());
});
test('dead/minor actors are not charged household bills', () => {
  const f = fixture(); f.people.p.alive = false; f.people.inspector.adult = false;
  f.advance(31); assert.equal(f.wallets.p, 120); assert.equal(f.wallets.inspector, 100);
});
test('new economy cannot be advanced by skipping unprocessed days', () => {
  const f = fixture(); f.h.day = 30; assert.throws(() => R.advanceEconomy(f.s, f.h), /按日/);
  assert.equal(f.s.lastDay, 0);
});
test('donation is a single real private-to-public transfer', () => {
  const f = fixture(); const total = f.wallets.p + f.balances.county;
  f.act({action: 'donate', account: 'county', amount: 30});
  assert.equal(f.wallets.p, 90); assert.equal(f.balances.county, 530);
  assert.equal(f.wallets.p + f.balances.county, total); assert.equal(f.publicEntries.length, 1);
  assert.ok(f.valid());
});
test('donation cooldown limits same-day benefits while preserving real transfers', () => {
  const f = fixture(); f.people.p.traits.push('generous');
  const total = f.wallets.p + f.balances.county;
  f.act({action: 'donate', account: 'county', amount: 20});
  f.act({action: 'donate', account: 'county', amount: 20});
  assert.equal(f.wallets.p, 80); assert.equal(f.balances.county, 540);
  assert.equal(f.wallets.p + f.balances.county, total);
  assert.equal(f.publicEntries.length, 2);
  assert.deepEqual(f.stress, [['p', -5]]);
  assert.ok(f.valid());
});
test('donation rejects receiver overflow before touching payer', () => {
  const f = fixture(); f.balances.county = 999999;
  assert.throws(() => f.act({action: 'donate', account: 'county', amount: 20}), /容量/);
  assert.equal(f.wallets.p, 120); assert.equal(f.balances.county, 999999);
});
for (const amount of [NaN, Infinity, -1, 0, 10.5, Number.MAX_SAFE_INTEGER, '20', null]) {
  test('invalid money amount rejected without mutation: ' + String(amount), () => {
    const f = fixture(); const before = JSON.stringify([f.s, f.wallets, f.balances]);
    assert.throws(() => f.act({action: 'donate', account: 'county', amount}), /整数/);
    assert.equal(JSON.stringify([f.s, f.wallets, f.balances]), before);
  });
}
test('embezzlement conserves money and reduces money available to actual public duties', () => {
  const f = fixture(); const total = f.wallets.p + f.balances.county;
  f.act({action: 'embezzle', account: 'county', amount: 40});
  assert.equal(f.wallets.p, 160); assert.equal(f.balances.county, 460);
  assert.equal(f.wallets.p + f.balances.county, total); assert.ok(f.valid());
});
test('cannot steal central, foreign or nonexistent public accounts', () => {
  for (const account of ['central', 'foreign', 'not-real']) {
    const f = fixture(); assert.throws(() => f.act({action: 'embezzle', account, amount: 20}));
    assert.equal(f.wallets.p, 120); assert.equal(f.s.misconduct.length, 0);
  }
});
test('appointment loss immediately revokes access but preserves existing liability', () => {
  const f = fixture(); f.act({action: 'embezzle', account: 'county', amount: 40}); f.holders.county = 'chief';
  assert.throws(() => f.act({action: 'embezzle', account: 'county', amount: 10}), /不实际经管/);
  assert.equal(f.s.misconduct[0].amount, 40); assert.equal(f.wallets.p, 160);
});
test('stealing capped to available balance and per-person cooling period', () => {
  const f = fixture(); assert.throws(() => f.act({action: 'embezzle', account: 'county', amount: 110}), /两成/);
  f.act({action: 'embezzle', account: 'county', amount: 100});
  assert.throws(() => f.act({action: 'embezzle', account: 'county', amount: 5}), /近期/);
});
test('private wallet capacity checked before debiting public account', () => {
  const f = fixture(); f.wallets.p = 990;
  assert.throws(() => f.act({action: 'embezzle', account: 'county', amount: 20}), /容量/);
  assert.equal(f.balances.county, 500); assert.equal(f.wallets.p, 990);
});
test('public ledger provides an anomaly, not a leaked secret beneficiary', () => {
  const f = fixture(); f.act({action: 'embezzle', account: 'county', amount: 40});
  assert.equal(f.publicEntries[0].reason, '待核经办支出');
  assert.equal('person' in f.publicEntries[0], false);
  const view = R.personalEconomyView(f.s, f.h, 'chief');
  assert.equal(view.ownMisconduct.length, 0); assert.equal(view.entries.length, 0);
  assert.equal(JSON.stringify(view).includes('侵吞'), false);
});
test('players are never automatically embezzled for by NPC AI', () => {
  const f = fixture(); f.people.p.traits = ['greedy']; f.wallets.p = 0;
  assert.equal(R.npcEconomyChoice(f.s, f.h, f.people.p), null); f.advance(30);
  assert.equal(f.s.misconduct.some(m => m.person === 'p'), false);
});
test('a greedy NPC with opportunity has a real private accumulation goal', () => {
  const f = fixture(); f.people.p.player = false; f.people.p.traits = ['greedy'];
  const choice = R.npcEconomyChoice(f.s, f.h, f.people.p); assert.equal(choice.action, 'embezzle');
  f.advance(31); assert.equal(f.s.misconduct[0].person, 'p'); assert.ok(f.wallets.p > 120);
});
test('honest trait prevents automated theft even under resource pressure', () => {
  const f = fixture(); f.people.p.player = false; f.people.p.traits = ['greedy', 'honest']; f.wallets.p = 0;
  assert.equal(R.npcEconomyChoice(f.s, f.h, f.people.p), null); f.advance(30);
  assert.equal(f.s.misconduct.some(m => m.person === 'p'), false);
});
test('player may choose a trait-conflicting act but receives stress rather than forced obedience', () => {
  const f = fixture(); f.people.p.traits = ['honest']; f.act({action: 'embezzle', account: 'county', amount: 20});
  assert.deepEqual(f.stress[0], ['p', 18]);
});
test('new economic traits are stable for fictional IDs and not fabricated for historical people', () => {
  assert.deepEqual(R.stableEconomicTraits('xiao-yan', false), []);
  assert.deepEqual(R.stableEconomicTraits('county:p', true), R.stableEconomicTraits('county:p', true));
  const set = new Set(Array.from({length: 100}, (_, i) => R.stableEconomicTraits('fictional:' + i, true)[0]));
  assert.ok(set.has('greedy') && set.has('honest') && set.has('ambitious'));
});
test('study requires time and does not immediately award ability or merit', () => {
  const f = fixture(); f.act({action: 'programme', kind: 'study'});
  assert.equal(f.wallets.p, 90); assert.equal(R.educationBonus(f.s, 'p'), 0);
  f.advance(29); assert.equal(f.s.budgets.p.courses, 0); f.advance(1);
  assert.equal(f.s.budgets.p.courses, 1); assert.equal(f.sanctions.length, 0); assert.ok(f.valid());
});
test('study is paused during travel/other work; postponed date survives save/load', () => {
  const f = fixture(); f.act({action: 'programme', kind: 'study'}); f.people.p.available = false;
  f.advance(10); assert.equal(f.s.programmes[0].due, 40); assert.ok(f.valid());
  f.people.p.available = true; f.advance(29); assert.equal(f.s.programmes[0].status, 'active');
  f.advance(1); assert.equal(f.s.programmes[0].status, 'completed'); assert.ok(f.valid());
});
test('two concurrent personal programmes not allowed', () => {
  const f = fixture(); f.act({action: 'programme', kind: 'study'});
  assert.throws(() => f.act({action: 'programme', kind: 'banquet', target: 'chief'}), /先完成/);
});
test('banquet requires adult same-city participant and resolves once', () => {
  const f = fixture(); assert.throws(() => f.act({action: 'programme', kind: 'banquet', target: 'foreign'}), /同城/);
  f.act({action: 'programme', kind: 'banquet', target: 'chief'}); f.advance(3);
  assert.deepEqual(f.opinions, [['p', 'chief', 6]]); f.advance(5); assert.equal(f.opinions.length, 1); assert.ok(f.valid());
});
test('audit requires real jurisdiction and independent available inspector', () => {
  const f = fixture(); assert.throws(() => f.act({action: 'audit', account: 'county', inspector: 'inspector'}), /权限/);
  assert.throws(() => f.act({action: 'audit', account: 'county', inspector: 'p'}, 'chief'), /回避调查/);
  f.people.inspector.available = false;
  assert.throws(() => f.act({action: 'audit', account: 'county', inspector: 'inspector'}, 'chief'), /可用/);
});
test('audit outcome is hidden while pending; no exact discovery roll in presentation', () => {
  const f = fixture(); f.act({action: 'audit', account: 'county', inspector: 'inspector'}, 'chief');
  const view = R.personalEconomyView(f.s, f.h, 'chief');
  assert.equal('roll' in view.investigations[0], false); assert.deepEqual(view.investigations[0].findings, []);
  assert.ok(f.valid());
});
test('clean account investigation does not fabricate guilt and cannot be used to recover money', () => {
  const f = fixture(); f.act({action: 'audit', account: 'county', inspector: 'inspector'}, 'chief'); f.advance(14);
  const q = f.s.investigations[0]; assert.equal(q.outcome, 'inconclusive');
  assert.throws(() => f.act({action: 'resolve', caseId: q.id, decision: 'recover'}, 'chief'), /证据不足/);
  f.act({action: 'resolve', caseId: q.id, decision: 'dismiss'}, 'chief'); assert.ok(f.valid());
});
test('investigation can find documented acts without exposing others to the suspect', () => {
  const f = fixture(); const q = openProvenCase(f);
  const view = R.personalEconomyView(f.s, f.h, 'p');
  assert.equal(view.investigations.length, 1); assert.equal(view.investigations[0].findings[0].person, 'p');
  assert.equal(q.findings.length, 1); assert.ok(f.valid());
});
test('saved investigation roll and outcome do not change on reload', () => {
  const f = fixture(); f.act({action: 'embezzle', account: 'county', amount: 40});
  f.act({action: 'audit', account: 'county', inspector: 'inspector'}, 'chief'); f.advance(5);
  const clone = JSON.parse(JSON.stringify(f.s));
  const g = fixture(); Object.assign(g.s, clone); Object.assign(g.wallets, f.wallets); Object.assign(g.balances, f.balances); g.h.day = 5;
  f.advance(9); g.advance(9);
  assert.deepEqual(g.s.investigations, f.s.investigations); assert.ok(g.valid());
});
test('investigator death or loss of authority cancels without deleting responsibility', () => {
  for (const who of ['chief', 'inspector']) {
    const f = fixture(); f.act({action: 'embezzle', account: 'county', amount: 40});
    f.act({action: 'audit', account: 'county', inspector: 'inspector'}, 'chief'); f.people[who].alive = false; f.advance(14);
    assert.equal(f.s.investigations[0].outcome, 'cancelled'); assert.equal(f.s.misconduct.length, 1); assert.ok(f.valid());
  }
});
test('recovery moves available assets only and cannot settle the same amount twice', () => {
  const f = fixture(); const q = openProvenCase(f); f.wallets.p = 15;
  f.act({action: 'resolve', caseId: q.id, decision: 'recover'}, 'chief');
  assert.equal(f.s.misconduct[0].recovered, 15); assert.equal(f.wallets.p, 0); assert.equal(f.balances.county, 475);
  assert.equal(f.sanctions.length, 1);
  assert.throws(() => f.act({action: 'resolve', caseId: q.id, decision: 'recover'}, 'chief'), /已结案/);
  f.wallets.p = 30; f.advance(17); assert.equal(f.s.misconduct[0].recovered, 40); assert.equal(f.balances.county, 500);
  const total = f.balances.county; f.advance(30); assert.equal(f.balances.county, total); assert.ok(f.valid());
});
test('restitution pauses when destination is lost, without silently rewarding a conqueror', () => {
  const f = fixture(); const q = openProvenCase(f); f.wallets.p = 0;
  f.act({action: 'resolve', caseId: q.id, decision: 'recover'}, 'chief');
  f.wallets.p = 100; f.disabled.add('county'); f.advance(16);
  assert.equal(f.s.misconduct[0].recovered, 0); assert.equal(f.balances.county, 460);
});
test('outstanding liability not erased by person death or new holder', () => {
  const f = fixture(); const q = openProvenCase(f); f.wallets.p = 0;
  f.act({action: 'resolve', caseId: q.id, decision: 'recover'}, 'chief'); f.people.p.alive = false; f.holders.county = 'inspector';
  f.advance(46); assert.equal(f.s.misconduct[0].amount - f.s.misconduct[0].recovered, 40);
});
test('same wallet or alias transfer cannot mint money', () => {
  const f = fixture(); const a = f.h.personal('p'), b = f.h.personal('p');
  assert.throws(() => R.moveMoney(a, b, 20), /同一个/); assert.equal(f.wallets.p, 120);
});
test('reject forged secret findings, duplicate IDs and impossible recovered balances', () => {
  const f = fixture(); openProvenCase(f); assert.ok(f.valid());
  const a = structuredClone(f.s); a.investigations[0].findings.push(9999); assert.equal(R.validPersonalEconomy(a, 14), false);
  const b = structuredClone(f.s); b.entries[0].id = b.misconduct[0].id; assert.equal(R.validPersonalEconomy(b, 14), false);
  const c = structuredClone(f.s); c.misconduct[0].recovered = 41; assert.equal(R.validPersonalEconomy(c, 14), false);
});
test('reject stale lastDay, invalid standard, unknown people and prototype-key budgets', () => {
  const f = fixture(); f.act({action: 'living', standard: 'comfortable'});
  const a = structuredClone(f.s); a.lastDay = 1; assert.equal(R.validPersonalEconomy(a, 0), false);
  const b = structuredClone(f.s); b.budgets.p.standard = 'free'; assert.equal(R.validPersonalEconomy(b, 0), false);
  assert.equal(R.validPersonalEconomy(f.s, 0, id => id !== 'p'), false);
  const c = JSON.parse(JSON.stringify(f.s)); Object.defineProperty(c.budgets, '__proto__', {value: c.budgets.p, enumerable: true});
  assert.equal(R.validPersonalEconomy(c, 0), false);
});
test('long simulation conserves nonnegative bounded wallets and valid serializable state', () => {
  const f = fixture(); f.people.p.player = false; f.people.p.traits = ['greedy'];
  f.people.chief.traits = ['honest']; f.people.inspector.traits = ['ambitious'];
  for (let d = 0; d < 1800; d++) {
    if (d % 30 === 0) for (const id of Object.keys(f.wallets)) f.wallets[id] = Math.min(1000, f.wallets[id] + 12);
    f.advance(1);
    assert.ok(f.valid(), 'invalid state day ' + f.h.day);
    for (const n of Object.values(f.wallets)) assert.ok(Number.isSafeInteger(n) && n >= 0 && n <= 1000);
    for (const n of Object.values(f.balances)) assert.ok(Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000);
  }
  assert.ok(f.s.misconduct.length + Object.values(f.s.archived??{}).reduce((n,a)=>n+a.cases,0) > 0); assert.ok(f.s.investigations.length > 0);
});
test('property sweep: hundreds of arbitrary legal transfers preserve exact totals', () => {
  for (let i = 1; i <= 500; i++) {
    const f = fixture(); f.wallets.p = i % 800; f.balances.county = 100 + i * 3;
    const amount = Math.min(200, Math.floor(f.balances.county / 5), 1000 - f.wallets.p);
    const total = f.wallets.p + f.balances.county;
    f.act({action: 'embezzle', account: 'county', amount});
    assert.equal(f.wallets.p + f.balances.county, total); assert.ok(f.valid());
  }
});
test('conditional incidents are reproducible, not guaranteed, and respond to preparation', () => {
  let stable = 0, unstable = 0;
  for (let id = 1; id <= 1000; id++) {
    const t = {id, created: 0, kind: 'agriculture', site: 'test', quality: 115};
    const good = assignmentIncidentRisk(t, 90), bad = assignmentIncidentRisk({...t, quality: 85}, 20);
    assert.equal(good, assignmentIncidentRisk({...t}, 90));
    if (good) stable++; if (bad) unstable++;
  }
  assert.ok(stable > 0 && stable < 150); assert.ok(unstable > stable + 200 && unstable < 800);
});

test('self-adjudication cannot create an invalid self-relationship entry', () => {
  const f = fixture();
  f.act({action: 'embezzle', account: 'central', amount: 40}, 'chief');
  f.act({action: 'audit', account: 'central', inspector: 'inspector'}, 'chief');
  f.s.investigations[0].roll = 0; f.advance(14);
  const before=structuredClone(f.s);
  assert.throws(()=>f.act({action: 'resolve', caseId: f.s.investigations[0].id, decision: 'recover'}, 'chief'),/不得裁决自己的案件/);
  assert.deepEqual(f.s,before);
  assert.equal(f.opinions.some(([a,b]) => a === b), false); assert.ok(f.valid());
});
test('NPC oversight does not conscript the player as its investigator', () => {
  const f = fixture();
  f.people.inspector.available = false;
  f.h.inspectors = () => ['p'];
  f.advance(90);
  assert.equal(f.s.investigations.length, 0);
});

test('rejects overlapping inspectors and an active private programme in an inspection save',()=>{
 const f=fixture();f.act({action:'audit',account:'county',inspector:'inspector'},'chief');
 const copy=structuredClone(f.s.investigations[0]);copy.id=f.s.nextId++;copy.account='central';f.s.investigations.push(copy);
 assert.equal(f.valid(),false);f.s.investigations.pop();
 f.s.programmes.push({id:f.s.nextId++,actor:'inspector',kind:'study',target:null,started:0,due:30,cost:30,status:'active'});
 assert.equal(f.valid(),false);
});

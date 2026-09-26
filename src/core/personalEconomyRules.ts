/**
 * Personal spending and public-account misconduct rules.
 * The host exposes references to EXISTING wallets, never copied balances.
 * No historical attribution is made by the balance or temperament parameters.
 */
export const livingStandards = {
  modest: {name: '朴素度日', monthly: 2, relief: 0},
  comfortable: {name: '体面持家', monthly: 8, relief: 3},
  lavish: {name: '盛宴华服', monthly: 24, relief: 7},
} as const;
export type LivingStandard = keyof typeof livingStandards;
export type EconomicTrait = 'greedy' | 'honest' | 'ambitious';
export type EconomicProgramme = 'study' | 'banquet';
export const economyLimits = {records: 512, cases: 256, entries: 320, programmes: 256} as const;
const MAX_MONEY = 1_000_000;
const MAX_DAY = 365_000;

export interface WalletRef { key: string; read(): number; write(value: number): void; capacity: number }
export interface EconomyActor {
  id: string; alive: boolean; adult: boolean; player: boolean; available: boolean;
  realm: string | null; traits: readonly string[]; stewardship: number; intrigue: number;
}
export interface PublicAccountRef {
  id: string; realm: string; name: string; site: string | null; holder: string | null;
  wallet: WalletRef;
}
export interface EconomyHost {
  day: number;
  actors(): readonly EconomyActor[];
  actor(id: string): EconomyActor | undefined;
  personal(id: string): WalletRef | undefined;
  account(id: string): PublicAccountRef | undefined;
  managedAccounts(actor: string): readonly PublicAccountRef[];
  auditableAccounts(actor: string): readonly PublicAccountRef[];
  canAudit?(actor:string, account:string):boolean;
  inspectors(actor: string): readonly string[];
  inspectionReason?(inspector:string, account:PublicAccountRef):string;
  inspectAt?(inspector:string, account:PublicAccountRef):boolean;
  dispatchInspector?(inspector:string, account:PublicAccountRef):void;
  canMeet(actor: string, target: string): boolean;
  /** All effects are bounded and their inputs are validated before invoking. */
  stress(actor: string, delta: number): void;
  relationship(actor: string, target: string, delta: number): void;
  charity(actor: string, account: PublicAccountRef, amount: number): void;
  sanction(person: string, realm: string, severity: number): void;
  log(actor: string, message: string): void;
  /** Public fiscal records deliberately do not reveal a secret beneficiary. */
  publicTransfer(account: PublicAccountRef, direction: 'out' | 'in', amount: number, reason: string): void;
}
export interface PersonalBudget {
  standard: LivingStandard; lastMonth: number; lastChoice: number;
  missed: number; lastBill: number; lastPaid: number;
  courses: number; lastDonation: number; lastBanquet: number; lastTheft: number;
}
export interface Misappropriation {
  id: number; person: string; account: string; realm: string;
  day: number; amount: number; recovered: number; caseId: number | null;
}
export interface Investigation {
  id: number; account: string; realm: string; commissioner: string; inspector: string;
  started: number; due: number; phase: 'investigating' | 'report' | 'closed';
  outcome: 'pending' | 'inconclusive' | 'substantiated' | 'cancelled';
  /** Created at issue and serialized: reload cannot reroll the same examination. */
  roll: number; findings: number[]; liability: string | null;
  resolution: 'none' | 'recover' | 'dismiss'; closedDay: number | null;
}
export interface PersonalProgramme {
  id: number; actor: string; kind: EconomicProgramme; target: string | null;
  started: number; due: number; cost: number;
  status: 'active' | 'completed' | 'cancelled';
}
export interface PersonalEntry {
  id: number; day: number; actor: string; delta: number; reason: string;
}
export interface PersonalEconomyState {
  version: 1; since: number; lastDay: number; seed: number; nextId: number;
  budgets: Record<string, PersonalBudget>;
  archived?: Record<string, {cases:number;recovered:number}>;
  misconduct: Misappropriation[]; investigations: Investigation[];
  programmes: PersonalProgramme[]; entries: PersonalEntry[];
}
export type EconomyCommand =
  | {type: 'economy'; action: 'living'; standard: LivingStandard}
  | {type: 'economy'; action: 'programme'; kind: EconomicProgramme; target?: string}
  | {type: 'economy'; action: 'donate' | 'embezzle'; account: string; amount: number}
  | {type: 'economy'; action: 'audit'; account: string; inspector: string}
  | {type: 'economy'; action: 'resolve'; caseId: number; decision: 'recover' | 'dismiss'};

export function newPersonalEconomy(day: number): PersonalEconomyState {
  integer(day, 0, MAX_DAY, '日期');
  return {version: 1, since: day, lastDay: day, seed: 546_2026, nextId: 1,
    budgets: {}, misconduct: [], investigations: [], programmes: [], entries: []};
}
export function budgetFor(s: PersonalEconomyState, id: string, day: number): PersonalBudget {
  // Migration creates no money and never retrospectively charges living costs.
  if (!Object.hasOwn(s.budgets, id)) s.budgets[id] = {
    standard: 'modest', lastMonth: Math.floor(day / 30) * 30, lastChoice: -1,
    missed: 0, lastBill: 0, lastPaid: 0, courses: 0,
    lastDonation: -90, lastBanquet: -30, lastTheft: -30,
  };
  return s.budgets[id];
}
function integer(v: unknown, min: number, max: number, label: string): asserts v is number {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max)
    throw new Error(label + '必须为 ' + min + ' 至 ' + max + ' 的整数');
}
function assertWallet(w: WalletRef): number {
  integer(w.capacity, 0, MAX_MONEY, '账户容量');
  const n = w.read(); integer(n, 0, w.capacity, '账户余额'); return n;
}
/** Validate BOTH endpoints before writing; failed receipt cannot destroy source money. */
export function moveMoney(from: WalletRef, to: WalletRef | null, amount: number): void {
  integer(amount, 1, MAX_MONEY, '金额');
  if (to && from.key === to.key) throw new Error('不能向同一个账户转账');
  const debit = assertWallet(from), credit = to ? assertWallet(to) : 0;
  if (debit < amount) throw new Error('付款账户余额不足');
  if (to && credit + amount > to.capacity) throw new Error('收款账户容量不足');
  from.write(debit - amount);
  try { if (to) to.write(credit + amount); }
  catch (error) { from.write(debit); if (to) to.write(credit); throw error; }
}
export function stableEconomicTraits(id: string, fictional: boolean): EconomicTrait[] {
  if (!fictional) return []; // Do not silently label historical people corrupt.
  let n = 2166136261;
  for (const ch of id) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  const pick = (n >>> 0) % 4;
  return pick === 0 ? ['greedy'] : pick === 1 ? ['honest'] : pick === 2 ? ['ambitious'] : [];
}
function random(s: PersonalEconomyState): number {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed % 100;
}
function entry(s: PersonalEconomyState, h: EconomyHost, actor: string, delta: number, reason: string): void {
  s.entries.push({id: s.nextId++, day: h.day, actor, delta, reason});
  s.entries = s.entries.slice(-economyLimits.entries);
  h.log(actor, reason + (delta ? '：' + (delta > 0 ? '+' : '') + delta + ' 钱。' : '。'));
}
function activeProgramme(s: PersonalEconomyState, actor: string): PersonalProgramme | undefined {
  return s.programmes.find(p => p.actor === actor && p.status === 'active');
}
export function educationBonus(s: PersonalEconomyState | undefined, actor: string): number {
  return Math.min(3, Math.floor((s?.budgets[actor]?.courses ?? 0) / 3));
}
export function auditChance(h: EconomyHost, investigation: Investigation, record: Misappropriation): number {
  const investigator = h.actor(investigation.inspector);
  const suspect = h.actor(record.person);
  return Math.min(95, Math.max(10, 35 + (investigator?.stewardship ?? 0) * 2
    + (investigator?.intrigue ?? 0) - (suspect?.intrigue ?? 0)
    + Math.min(20, Math.floor(record.amount / 5))));
}
export function economyReason(s: PersonalEconomyState, h: EconomyHost, actor: string, c: EconomyCommand): string {
  try {
    const person = h.actor(actor), wallet = h.personal(actor);
    if (!person?.alive || !person.adult || !wallet || !person.realm) return '须为本国在世成年人物';
    const b = s.budgets[actor] ?? {
      standard: 'modest', courses: 0, lastDonation: -90, lastBanquet: -30, lastTheft: -30,
    };
    const coins = assertWallet(wallet);
    if (!c || c.type !== 'economy') return '无效的个人财务指令';
    if (c.action === 'living') {
      if (!Object.hasOwn(livingStandards, c.standard)) return '未知持家规格';
      return b.standard === c.standard ? '持家规格未变化' : '';
    }
    if (c.action === 'programme') {
      if (!['study', 'banquet'].includes(c.kind)) return '未知私人活动';
      if (!person.available || s.investigations.some(q => q.inspector === actor && q.phase === 'investigating') || activeProgramme(s, actor)) return '请先完成现有行程、军职或私人活动';
      if (s.programmes.length >= economyLimits.programmes) return '私人活动记录容量已满，请先归档';
      if (c.kind === 'study') {
        if (c.target !== undefined) return '研习不接受宴请对象';
        if (b.courses >= 9) return '本轮家学培养已满，管理增益最高 +3';
        return coins < 30 ? '研习需私财 30 钱，并驻留学习 30 日' : '';
      }
      if (h.day - b.lastBanquet < 30) return '宴请每 30 日一次';
      if (!c.target || c.target === actor || !h.actor(c.target)?.alive || !h.actor(c.target)?.adult)
        return '请选另一位在世成年人物';
      if (!h.canMeet(actor, c.target)) return '宴请双方须同城且有空闲';
      return coins < 40 ? '宴请需私财 40 钱' : '';
    }
    if (c.action === 'donate' || c.action === 'embezzle') {
      integer(c.amount, c.action === 'donate' ? 10 : 5, 200, '金额');
      const account = h.account(c.account);
      if (!account || account.realm !== person.realm) return '账户不存在或已不属本国';
      assertWallet(account.wallet);
      if (c.action === 'donate') {
        if (h.day - b.lastDonation < 90) return '捐输每 90 日一次';
        if (coins < c.amount) return '个人钱不足';
        return account.wallet.read() + c.amount > account.wallet.capacity ? '公库容量不足' : '';
      }
      if (!h.managedAccounts(actor).some(a => a.id === account.id)) return '你不实际经管此公库';
      if (h.day - b.lastTheft < 30) return '近期资金异动尚未平息';
      if (!s.misconduct.some(m=>m.person===actor&&m.account===c.account&&m.caseId===null)&&s.misconduct.length >= economyLimits.records) return '未归档责任记录过多，不能再产生新案';
      const liability=s.misconduct.find(m=>m.person===actor&&m.account===c.account&&m.caseId===null);
      if(liability&&liability.amount+c.amount>MAX_MONEY)return '未清偿责任金额已达上限';
      if (s.investigations.some(q => q.account === c.account && q.phase === 'investigating')) return '该公库正在接受监察';
      if (c.amount > Math.floor(account.wallet.read() / 5)) return '本次最多侵吞当前公库余额的两成';
      return coins + c.amount > wallet.capacity ? '个人钱包容量不足' : '';
    }
    if (c.action === 'audit') {
      const account = h.account(c.account);
      if (!account || !h.auditableAccounts(actor).some(a => a.id === c.account)) return '没有此公库的监察权限';
      if (s.investigations.length >= economyLimits.cases) return '案件记录容量已满';
      if (!h.inspectors(actor).includes(c.inspector) || !h.actor(c.inspector)?.available) return '监察者须为本国可用的成年人物';
      if (s.investigations.some(q => q.inspector === c.inspector && q.phase === 'investigating')) return '监察者已在办理其他案件';
      if (activeProgramme(s, c.inspector)) return '监察者正在私人活动中';
      if (c.inspector === account.holder||s.misconduct.some(m=>m.account===c.account&&m.person===c.inspector&&m.recovered<m.amount)) return '经管人及涉案人员须回避调查';
      const travelReason=h.inspectionReason?.(c.inspector,account);if(travelReason)return travelReason;
      if (s.investigations.some(q => q.account === c.account && (q.phase !== 'closed' || h.day - q.started < 30))) return '已有该公库待决案件，或尚在监察冷却期';
      return coins < 20 ? '本轮主动发起查核须自付 20 钱；不自动动用下级公库' : '';
    }
    if (c.action === 'resolve') {
      integer(c.caseId, 1, Number.MAX_SAFE_INTEGER, '案号');
      if (!['recover', 'dismiss'].includes(c.decision)) return '未知裁决';
      const q = s.investigations.find(x => x.id === c.caseId);
      if (!q || q.phase !== 'report') return '案件尚未完成调查或已结案';
      if (!h.auditableAccounts(actor).some(a => a.id === q.account)) return '须由当前有权的上级裁决';
      if(s.misconduct.some(m=>q.findings.includes(m.id)&&m.person===actor))return '涉案人员不得裁决自己的案件';
      if (c.decision === 'recover' && q.outcome !== 'substantiated') return '证据不足，不得直接追缴';
      return '';
    }
    return '未知个人财务行动';
  } catch (e) { return e instanceof Error ? e.message : '个人财务参数错误'; }
}
export function actEconomy(s: PersonalEconomyState, h: EconomyHost, actor: string, c: EconomyCommand): void {
  const reason = economyReason(s, h, actor, c);
  if (reason) throw new Error(reason);
  const b = budgetFor(s, actor, h.day), wallet = h.personal(actor)!;
  switch (c.action) {
    case 'living':
      b.standard = c.standard; b.lastChoice = h.day;
      entry(s, h, actor, 0, '改用' + livingStandards[c.standard].name + '，下一期按实扣款'); break;
    case 'programme': {
      const cost = c.kind === 'study' ? 30 : 40;
      moveMoney(wallet, null, cost);
      s.programmes.push({id: s.nextId++, actor, kind: c.kind, target: c.target ?? null,
        started: h.day, due: h.day + (c.kind === 'study' ? 30 : 3), cost, status: 'active'});
      if (c.kind === 'banquet') b.lastBanquet = h.day;
      entry(s, h, actor, -cost, c.kind === 'study' ? '延师研习开始，须驻留满 30 日' : '筹备私人宴请'); break;
    }
    case 'donate': {
      const account = h.account(c.account)!;
      moveMoney(wallet, account.wallet, c.amount); b.lastDonation = h.day;
      h.publicTransfer(account, 'in', c.amount, '个人捐输'); h.charity(actor, account, c.amount);
      if (h.actor(actor)!.traits.includes('generous')) h.stress(actor, -5);
      if (h.actor(actor)!.traits.includes('greedy')) h.stress(actor, 5);
      entry(s, h, actor, -c.amount, '向' + account.name + '捐输'); break;
    }
    case 'embezzle': {
      const account = h.account(c.account)!;
      moveMoney(account.wallet, wallet, c.amount); b.lastTheft = h.day;
      const existing=s.misconduct.find(m=>m.person===actor&&m.account===c.account&&m.caseId===null);
      if(existing){existing.amount+=c.amount;existing.day=h.day;}else s.misconduct.push({id: s.nextId++, person: actor, account: c.account, realm: account.realm,day:h.day,amount:c.amount,recovered:0,caseId:null});
      h.publicTransfer(account, 'out', c.amount, '待核经办支出');
      h.stress(actor, h.actor(actor)!.traits.includes('honest') ? 18 : 5);
      entry(s, h, actor, c.amount, '侵吞经管公款；公共余额已真实减少，离任不消除责任'); break;
    }
    case 'audit': {
      moveMoney(wallet, null, 20); const account = h.account(c.account)!;
      s.investigations.push({id: s.nextId++, account: c.account, realm: account.realm,
        commissioner: actor, inspector: c.inspector, started: h.day, due: h.day + 14,
        phase: 'investigating', outcome: 'pending', roll: random(s), findings: [],
        liability: null, resolution: 'none', closedDay: null});
      h.dispatchInspector?.(c.inspector,account);
      entry(s, h, actor, -20, '委托查核' + account.name + '；需 14 日，结论可能证据不足'); break;
    }
    case 'resolve': {
      const q = s.investigations.find(x => x.id === c.caseId)!;
      q.phase = 'closed'; q.resolution = c.decision; q.closedDay = h.day;
      if (c.decision === 'recover') {
        const persons = new Set(s.misconduct.filter(m => q.findings.includes(m.id)).map(m => m.person));
        for (const person of persons) {
          const due = s.misconduct.filter(m => q.findings.includes(m.id) && m.person === person)
            .reduce((sum, m) => sum + m.amount - m.recovered, 0);
          h.sanction(person, q.realm, Math.min(20, 5 + Math.floor(due / 20)));
          if (person !== actor) h.relationship(person, actor, -15);
        }
        recoverCase(s, h, q);
      }
      h.log(actor, c.decision === 'recover' ? '案件裁定追缴；不足部分作为未清责任继续保留。' : q.outcome === 'substantiated' ? '证据已经查明，本次裁定不追缴；责任记录保留。' : '案件证据不足，结案而不认定有罪。'); break;
    }
  }
}
function recoverCase(s: PersonalEconomyState, h: EconomyHost, q: Investigation): void {
  const account = h.account(q.account);
  // A lost or transferred account is NOT silently redirected to another government.
  if (!account || account.realm !== q.realm) return;
  for (const m of s.misconduct.filter(m => q.findings.includes(m.id))) {
    const wallet = h.personal(m.person); if (!wallet) continue;
    const amount = Math.min(m.amount - m.recovered, wallet.read(), account.wallet.capacity - account.wallet.read());
    if (amount <= 0) continue;
    moveMoney(wallet, account.wallet, amount); m.recovered += amount;
    h.publicTransfer(account, 'in', amount, '案件追缴');
    entry(s, h, m.person, -amount, '退赔公款');
  }
}
function advanceInvestigations(s: PersonalEconomyState, h: EconomyHost): void {
  for (const q of s.investigations) {
    if (q.phase !== 'investigating') continue;
    if (h.day-q.started>180 || !h.actor(q.inspector)?.alive || h.actor(q.inspector)?.realm !== q.realm || !(h.canAudit?.(q.commissioner,q.account)??h.auditableAccounts(q.commissioner).some(a => a.id === q.account))) {
      q.phase = 'closed'; q.outcome = 'cancelled'; q.closedDay = h.day;
      h.log(q.commissioner, '查核因监察者死亡、任职或辖区变化终止；已有责任记录仍保留。'); continue;
    }
    const account=h.account(q.account);if(!h.actor(q.inspector)?.available||account&&h.inspectAt&&!h.inspectAt(q.inspector,account)){q.due++;continue;}
    if(q.due>h.day)continue;
    // Only events predating the investigation can be found in this examination.
    q.findings = s.misconduct.filter(m => m.account === q.account && m.realm === q.realm && m.day <= q.started
      && m.caseId === null && m.person !== q.inspector && q.roll < auditChance(h, q, m)).map(m => m.id);
    q.phase = 'report'; q.outcome = q.findings.length ? 'substantiated' : 'inconclusive';
    for (const m of s.misconduct.filter(m => q.findings.includes(m.id))) m.caseId = q.id;
    h.log(q.commissioner, q.findings.length ? '查核获得可核实证据，等待有权上级裁决。' : '本轮查核证据不足，不等于证明所有支出均无问题。');
  }
}
function advanceProgrammes(s: PersonalEconomyState, h: EconomyHost): void {
  for (const p of s.programmes) {
    if (p.status !== 'active') continue;
    const person = h.actor(p.actor);
    if (!person?.alive||p.kind==='banquet'&&p.target&&!h.actor(p.target)?.alive) { p.status = 'cancelled'; continue; }
    if(h.day-p.started>365){p.status='cancelled';h.log(p.actor,'私人活动久延未成，结束筹办，已付费用不退。');continue;}
    // Busy days extend the finish date. No full credit for travel or concurrent duties.
    if (!person.available || p.kind === 'banquet' && (!p.target || !h.canMeet(p.actor, p.target))) { p.due++; continue; }
    if (p.due > h.day) continue;
    p.status = 'completed'; const b = budgetFor(s, p.actor, h.day);
    if (p.kind === 'study') {
      b.courses = Math.min(9, b.courses + 1);
      h.log(p.actor, '驻留研习完成；每三期获得管理 +1，最高 +3，不奖励功绩。');
    } else if (p.target) {
      h.relationship(p.actor, p.target, person.traits.includes('generous') ? 10 : 6);
      h.stress(p.actor, person.traits.includes('frugal') ? 5 : -5);
      h.log(p.actor, '私人宴请结束，交往变化已结算。');
    }
  }
  // Only harmless, completed activity history is pruned, never outstanding liability.
  s.programmes = s.programmes.filter(p => p.status === 'active')
    .concat(s.programmes.filter(p => p.status !== 'active').slice(-64));
}
export function npcEconomyChoice(s: PersonalEconomyState, h: EconomyHost, person: EconomyActor): EconomyCommand | null {
  if (person.player || !person.alive || !person.adult || !person.realm) return null;
  const b = budgetFor(s, person.id, h.day), coins = h.personal(person.id)?.read() ?? 0;
  const honest = person.traits.includes('honest'), greedy = person.traits.includes('greedy');
  const generous = person.traits.includes('generous'), ambitious = person.traits.includes('ambitious');
  // Choices use this NPC's own wallet and access, not other people's hidden misconduct.
  const reserve = livingStandards[b.standard].monthly * 6 + (greedy ? 240 : ambitious ? 120 : generous ? 60 : 30);
  const candidates:{command:EconomyCommand;utility:number}[]=[];
  // Scores only use one's own cash, legal access, private choices and visible needs.
  if(greedy&&!honest&&h.day-b.lastTheft>=30){
    const account=h.managedAccounts(person.id).slice().sort((a,b)=>b.wallet.read()-a.wallet.read())[0],amount=account?Math.min(40,Math.floor(account.wallet.read()/5)):0;
    if(account&&amount>=5)candidates.push({command:{type:'economy',action:'embezzle',account:account.id,amount},utility:amount+(reserve-coins)/8-30-(person.traits.includes('wary')?25:0)-(person.traits.includes('generous')?10:0)});
  }
  if(generous&&coins>reserve+20&&h.day-b.lastDonation>=90){const a=h.managedAccounts(person.id).find(a=>a.site!==null);if(a)candidates.push({command:{type:'economy',action:'donate',account:a.id,amount:20},utility:20+Math.max(0,80-a.wallet.read())/4-(coins<reserve*2?10:0)});}
  if(ambitious&&coins>=reserve+30&&b.courses<9&&!activeProgramme(s,person.id)&&person.available)candidates.push({command:{type:'economy',action:'programme',kind:'study'},utility:30-b.courses*2-(coins<reserve*2?10:0)});
  const best=candidates.filter(c=>c.utility>0&&!economyReason(s,h,person.id,c.command)).sort((a,b)=>b.utility-a.utility)[0];if(best)return best.command;
  return null;
}
export function advanceEconomy(s: PersonalEconomyState, h: EconomyHost): void {
  if (h.day <= s.lastDay) return; // Replay of a settled day is strictly idempotent.
  if (h.day !== s.lastDay + 1) throw new Error('个人经济须按日推进，不能跳过结算');
  s.lastDay = h.day;
  if(h.day%30===0)archiveEconomy(s,h.day);
  advanceProgrammes(s, h); advanceInvestigations(s, h);
  if (h.day % 30 !== 0) return;
  for (const q of s.investigations) if (q.phase === 'closed' && q.resolution === 'recover') recoverCase(s, h, q);
  for (const person of h.actors().slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (!person.alive || !person.adult) continue;
    const b = budgetFor(s, person.id, h.day - 1), wallet = h.personal(person.id);
    if (!wallet || b.lastMonth >= h.day) continue;
    b.lastMonth = h.day;
    const living = livingStandards[b.standard], paid = Math.min(wallet.read(), living.monthly);
    if (paid) moveMoney(wallet, null, paid);
    b.lastBill = living.monthly; b.lastPaid = paid;
    if (paid < living.monthly) {
      b.missed = Math.min(1000, b.missed + 1); h.stress(person.id, 4);
      // Optional luxury is reduced rather than generating infinite household debt.
      b.standard = 'modest';
      entry(s, h, person.id, -paid, '持家支出不足，缩减为朴素度日，不追溯虚构债务');
    } else { h.stress(person.id, -living.relief); entry(s, h, person.id, -paid, living.name + '月度支出'); }
    const c = npcEconomyChoice(s, h, person);
    if (c && !economyReason(s, h, person.id, c)) actEconomy(s, h, person.id, c);
  }
  // Periodic non-player oversight rotates by public account ID, NOT hidden fraud facts.
  if (h.day % 90 === 0) for (const person of h.actors().slice().sort((a, b) => a.id.localeCompare(b.id))) {
    if (person.player || !person.alive || !person.adult || (h.personal(person.id)?.read() ?? 0) < 100) continue;
    const accounts = h.auditableAccounts(person.id).slice().sort((a, b) => a.id.localeCompare(b.id));
    if (!accounts.length) continue;
    const a = accounts[Math.floor(h.day / 90) % accounts.length];
    const inspector = h.inspectors(person.id).find(id => id !== a.holder && h.actor(id)?.available && !h.actor(id)?.player);
    if (!inspector) continue;
    const c: EconomyCommand = {type: 'economy', action: 'audit', account: a.id, inspector};
    if (!economyReason(s, h, person.id, c)) actEconomy(s, h, person.id, c);
  }
  // AI judges only its OWN completed reports, and never decides on the player's behalf.
  for (const q of s.investigations) if (q.phase === 'report' && !h.actor(q.commissioner)?.player) {
    const c: EconomyCommand = {type: 'economy', action: 'resolve', caseId: q.id,
      decision: q.outcome === 'substantiated' ? 'recover' : 'dismiss'};
    if (!economyReason(s, h, q.commissioner, c)) actEconomy(s, h, q.commissioner, c);
  }
}
export function personalEconomyView(s: PersonalEconomyState, h: EconomyHost, viewer: string) {
  const q = s.investigations.filter(q => q.commissioner === viewer || q.phase !== 'investigating'
    && (h.auditableAccounts(viewer).some(a => a.id === q.account)
      || q.findings.some(id => s.misconduct.some(m => m.id === id && m.person === viewer))));
  return {
    budget: s.budgets[viewer] ?? null, education: educationBonus(s, viewer),
    entries: s.entries.filter(e => e.actor === viewer),
    programmes: s.programmes.filter(p => p.actor === viewer),
    investigations: q.map(({roll: _roll, findings, ...visible}) => ({...visible,
      findings: findings.map(id => s.misconduct.find(m => m.id === id)!).filter(Boolean)
        .map(m => ({person: m.person, amount: m.amount, recovered: m.recovered})),
    })),
    // Own acts are known; somebody else's undiscovered acts are never exposed here.
    ownMisconduct: s.misconduct.filter(m => m.person === viewer).map(m => ({...m})),
  };
}

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= lo && v <= hi;
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 180 && !['__proto__', 'prototype', 'constructor'].includes(v);
/** Structural validation before any migration or execution of an imported state. */
export function validPersonalEconomy(v: unknown, day: number, knownPerson: (id: string) => boolean = () => true): v is PersonalEconomyState {
  if (!obj(v) || v.version !== 1 || !num(v.since, 0, day) || !num(v.lastDay, Number(v.since), day)
      || v.lastDay !== day || !num(v.seed, 0, 0xffffffff) || !num(v.nextId, 1, Number.MAX_SAFE_INTEGER) || !obj(v.budgets)) return false;
  const person = (id: unknown): id is string => str(id) && knownPerson(id);
  if (Object.keys(v.budgets).length > 10000) return false;
  for (const [id, b] of Object.entries(v.budgets)) {
    if (!person(id) || !obj(b) || !Object.hasOwn(livingStandards, String(b.standard))
      || !num(b.lastMonth, 0, day) || Number(b.lastMonth) % 30 !== 0 || !num(b.lastChoice, -1, day)
      || !num(b.missed, 0, 1000) || !num(b.courses, 0, 9) || !num(b.lastBill, 0, 24)
      || !num(b.lastPaid, 0, Number(b.lastBill)) || !num(b.lastDonation, -90, day)
      || !num(b.lastBanquet, -30, day) || !num(b.lastTheft, -30, day)) return false;
  }
  if(v.archived!==undefined&&(!obj(v.archived)||!Object.entries(v.archived).every(([id,a])=>person(id)&&obj(a)&&num(a.cases,0,Number.MAX_SAFE_INTEGER)&&num(a.recovered,0,Number.MAX_SAFE_INTEGER))))return false;
  const ids = new Set<number>();
  const validId = (id: unknown) => { if (!num(id, 1, Number(v.nextId) - 1) || ids.has(Number(id))) return false; ids.add(Number(id)); return true; };
  if (!Array.isArray(v.misconduct) || v.misconduct.length > economyLimits.records
      || !Array.isArray(v.investigations) || v.investigations.length > economyLimits.cases
      || !Array.isArray(v.programmes) || v.programmes.length > economyLimits.programmes
      || !Array.isArray(v.entries) || v.entries.length > economyLimits.entries) return false;
  for (const m of v.misconduct) if (!obj(m) || !validId(m.id) || !person(m.person) || !str(m.account)
    || !str(m.realm) || !num(m.day, Number(v.since), day) || !num(m.amount, 5, MAX_MONEY)
    || !num(m.recovered, 0, Number(m.amount)) || m.caseId !== null && !num(m.caseId, 1, Number(v.nextId) - 1)) return false;
  for (const q of v.investigations) {
    if (!obj(q) || !validId(q.id) || !str(q.account) || !str(q.realm) || !person(q.commissioner) || !person(q.inspector)
      || !num(q.started, Number(v.since), day) || !num(q.due,Number(q.started)+14,MAX_DAY+365) || !num(q.roll, 0, 99)
      || !['investigating', 'report', 'closed'].includes(String(q.phase))
      || !['pending', 'inconclusive', 'substantiated', 'cancelled'].includes(String(q.outcome))
      || !['none', 'recover', 'dismiss'].includes(String(q.resolution)) || q.liability !== null
      || !Array.isArray(q.findings) || new Set(q.findings).size !== q.findings.length) return false;
    if (q.phase === 'investigating' && (q.outcome !== 'pending' || Number(q.due) <= day || q.findings.length || q.resolution !== 'none' || q.closedDay !== null)) return false;
    if (q.phase === 'report' && (!['substantiated', 'inconclusive'].includes(String(q.outcome)) || q.resolution !== 'none' || q.closedDay !== null || Number(q.due) > day)) return false;
    if (q.phase === 'closed' && (!num(q.closedDay, Number(q.started), day) || q.outcome === 'pending' || q.outcome !== 'cancelled' && q.resolution === 'none')) return false;
    if ((q.outcome === 'substantiated') !== (q.findings.length > 0) || q.resolution === 'recover' && q.outcome !== 'substantiated') return false;
    for (const id of q.findings) {
      const m = (v.misconduct as Misappropriation[]).find(m => m.id === id);
      if (!m || m.caseId !== q.id || m.account !== q.account || m.realm !== q.realm || m.day > Number(q.started)) return false;
    }
  }
  for (const m of v.misconduct as Misappropriation[]) {
    if (m.caseId !== null && !(v.investigations as Investigation[]).some(q => q.id === m.caseId && q.findings.includes(m.id))) return false;
    if (m.recovered > 0 && !(v.investigations as Investigation[]).some(q => q.id === m.caseId && q.resolution === 'recover')) return false;
  }
  for (const p of v.programmes) if (!obj(p) || !validId(p.id) || !person(p.actor) || !['study', 'banquet'].includes(String(p.kind))
    || !num(p.started, Number(v.since), day) || !num(p.due, Number(p.started) + (p.kind === 'study' ? 30 : 3), MAX_DAY + 30)
    || p.cost !== (p.kind === 'study' ? 30 : 40) || (p.kind === 'study' ? p.target !== null : !person(p.target) || p.target === p.actor)
    || !['active', 'completed', 'cancelled'].includes(String(p.status))
    || p.status === 'completed' && Number(p.due) > day || p.status === 'active' && Number(p.due) <= day) return false;
  const ongoing=(v.investigations as Investigation[]).filter(q=>q.phase==='investigating');
  const open=(v.investigations as Investigation[]).filter(q=>q.phase!=='closed');
  if(new Set(ongoing.map(q=>q.inspector)).size!==ongoing.length||new Set(open.map(q=>q.account)).size!==open.length)return false;
  const active = (v.programmes as PersonalProgramme[]).filter(p => p.status === 'active');
  if(active.some(p=>ongoing.some(q=>q.inspector===p.actor)))return false;
  if (new Set(active.map(p => p.actor)).size !== active.length) return false;
  for (const e of v.entries) if (!obj(e) || !validId(e.id) || !num(e.day, Number(v.since), day) || !person(e.actor)
    || !num(e.delta, -MAX_MONEY, MAX_MONEY) || typeof e.reason !== 'string' || e.reason.length > 300) return false;
  return true;
}

/** Archive only fully repaid cases; unresolved liability is never dropped. */
function archiveEconomy(s:PersonalEconomyState,day:number){
 const ids=new Set<number>();
 for(const q of s.investigations){if(q.phase!=='closed'||q.closedDay===null||day-q.closedDay<360)continue;
 const records=s.misconduct.filter(m=>m.caseId===q.id);if(records.some(m=>m.amount!==m.recovered))continue;
 for(const m of records){s.archived??={};const a=s.archived[m.person]??={cases:0,recovered:0};a.cases++;a.recovered+=m.recovered;}ids.add(q.id);
 }
 s.investigations=s.investigations.filter(q=>!ids.has(q.id));s.misconduct=s.misconduct.filter(m=>m.caseId===null||!ids.has(m.caseId));
}

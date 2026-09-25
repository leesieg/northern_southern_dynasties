import { IDBFactory,IDBObjectStore } from 'fake-indexeddb';
import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import type { Reply,Request } from '../core/types';
type Snapshot=Extract<Reply,{type:'world'}>;
let receive:(event:{data:Request})=>void;
let waiting:((value:Snapshot)=>void)|null=null;
let replies:Reply[]=[];
async function request(data:Request){return new Promise<Snapshot>(resolve=>{waiting=resolve;receive({data});});}
beforeEach(async()=>{
  vi.resetModules();vi.useFakeTimers({toFake:['setInterval','clearInterval']});
  vi.stubGlobal('indexedDB',new IDBFactory());replies=[];
  vi.stubGlobal('self',{set onmessage(handler:typeof receive){receive=handler;},postMessage:(message:Reply)=>{const copy=structuredClone(message);replies.push(copy);if(copy.type==='world'&&waiting){const done=waiting;waiting=null;done(copy);}}});
  await import('./simulation');
});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('worker menu and save lifecycle without browser UI',()=>{

 it('三年铨选恢复时暂停，保存失败不批准或扣费，审批前不能推进',async()=>{await request({type:'init'});const {newCampaignWorld}=await import('../core/world');const {advanceAppointments}=await import('../core/appointmentCycle');const {serializeWorld}=await import('../core/save');const w=newCampaignWorld('xiao-yan',undefined,'sandbox');advanceAppointments(w);w.day=1096;advanceAppointments(w);const imported=await request({type:'import',text:serializeWorld(w)});expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.kind==='appointments'))).toBe(true);expect((await request({type:'speed',speed:7})).speed).toBe(0);expect((await request({type:'step'})).world.day).toBe(1096);const command={type:'appointments',action:'reject',realm:'liang',year:549} as const;const fault=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});expect((await request({type:'command',command})).world).toEqual(imported.world);fault.mockRestore();const result=await request({type:'command',command});expect(result.world.realm!.local!.cycle!.rounds.liang!.status).toBe('rejected');expect((await request({type:'step'})).world.day).toBe(1097);});
 it('幕僚延聘存储失败不扣钱；任职及在建工程随存档恢复',async()=>{
  await request({type:'init'});const {newGovernedCampaignWorld}=await import('../core/governedTestWorld');const {serializeWorld}=await import('../core/save');const before=await request({type:'import',text:serializeWorld(newGovernedCampaignWorld('xiao-gang',undefined,'sandbox'))});
  const command={type:'retinue',action:'recruit',person:'guest-liang'} as const;
  const fault=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
  const failed=await request({type:'command',command});fault.mockRestore();expect(failed.world).toEqual(before.world);
  const hired=await request({type:'command',command});expect(hired.world.retinue!.members['guest-liang'].host).toBe('xiao-gang');expect(hired.world.people[0].coins).toBe(before.world.people[0].coins-30);
  await request({type:'command',command:{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'}});
  await request({type:'command',command:{type:'fiscal',action:'request',site:'jiankang',amount:100,purpose:'construction'}});
  for(let i=0;i<3;i++)await request({type:'step'});
  const built=await request({type:'command',command:{type:'build',scope:'city',site:'jiankang',building:'market'}});expect(built.world.holdings.cities.jiankang.project?.supervisor).toBe('guest-liang');
  const restored=await request({type:'load',slot:'auto'});expect(restored.world.retinue).toEqual(built.world.retinue);expect(restored.world.holdings).toEqual(built.world.holdings);
 });
 it('keeps activity planning atomic, restores it from saves, and pauses for its actual decision',async()=>{
  await request({type:'init'});const before=await request({type:'new',characterId:'xiao-gang',mode:'sandbox'});
  const command={type:'mobility',action:'plan',kind:'visit',site:'jiankang',target:'xiao-yan'} as const;
  const fault=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
  const failed=await request({type:'command',command});fault.mockRestore();expect(failed.world).toEqual(before.world);
  replies=[];const planned=await request({type:'command',command});expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.kind==='mobility'))).toBe(true);
  const id=planned.world.mobility!.activities[0].id;await request({type:'command',command:{type:'mobility',action:'begin',id}});replies=[];
  await request({type:'speed',speed:7});const update=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const paused=await update;
  expect(paused.speed).toBe(0);expect(paused.world.mobility!.activities[0].phase).toBe('decision');expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.activityId===id))).toBe(true);
  await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(paused.world);
  const completed=await request({type:'command',command:{type:'mobility',action:'resolve',id,choice:'measured'}});expect(completed.world.mobility!.activities[0].phase).toBe('done');
 });

 it('saves the general service board atomically and pauses on NPC budget proposals',async()=>{
  await request({type:'init'});await request({type:'new',characterId:'yuwen-tai',mode:'sandbox'});await request({type:'command',command:{type:'service',action:'begin'}});
  const before=await request({type:'command',command:{type:'service',action:'priority',priority:'economy'}});
  const fault=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
  const failed=await request({type:'command',command:{type:'service',action:'open',kind:'agriculture',site:'tianshui',officer:'dugu-xin'}});fault.mockRestore();expect(failed.world).toEqual(before.world);
  await request({type:'command',command:{type:'service',action:'open',kind:'agriculture',site:'tianshui',officer:'dugu-xin'}});replies=[];await request({type:'speed',speed:7});
  const update=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const paused=await update;
  expect(paused.speed).toBe(0);expect(paused.world.service!.tasks[0].phase).toBe('approval');expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.kind==='service'&&e.assignmentId===1))).toBe(true);
  const write=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
  const rollback=await request({type:'command',command:{type:'service',action:'approve',id:1}});write.mockRestore();expect(rollback.world).toEqual(paused.world);
  const approved=await request({type:'command',command:{type:'service',action:'approve',id:1}});await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(approved.world);
 });

  it('explains a forced pause when automatic saving fails',async()=>{
    await request({type:'init'});await request({type:'new'});await request({type:'speed',speed:7});
    const first=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);await first;
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const next=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const paused=await next;spy.mockRestore();
    expect(paused.speed).toBe(0);expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.kind==='error'))).toBe(true);
  });
  it('reports background pauses only when time was running',async()=>{
    await request({type:'init'});await request({type:'new'});await request({type:'background'});expect(replies.some(r=>r.type==='paused')).toBe(false);
    await request({type:'speed',speed:3});const paused=await request({type:'background'});expect(paused.speed).toBe(0);expect(replies.some(r=>r.type==='paused'&&r.events[0].kind==='background')).toBe(true);
  });
  it('reports arrival when advancing one day and does not repeat the dialog on later steps',async()=>{
    await request({type:'init'});await request({type:'new'});const snapshot=await request({type:'command',command:{type:'travel',destination:'jingkou'}});
    const {advance}=await import('../core/world');const {serializeWorld}=await import('../core/save');const w=structuredClone(snapshot.world);advance(w,w.people[0].journey!.durations.reduce((a,b)=>a+b,0)-1);await request({type:'import',text:serializeWorld(w)});replies=[];
    const arrived=await request({type:'step'});expect(arrived.speed).toBe(0);expect(replies.filter(r=>r.type==='paused')).toHaveLength(1);expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.kind==='arrival'))).toBe(true);
    replies=[];await request({type:'step'});expect(replies.some(r=>r.type==='paused')).toBe(false);
  });

  it('persists duties atomically and pauses at a newly arrived approval request',async()=>{
    await request({type:'init'});const before=await request({type:'new',characterId:'yuwen-tai',mode:'sandbox'});
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const failed=await request({type:'command',command:{type:'duty',action:'open'}});spy.mockRestore();expect(failed.world).toEqual(before.world);
    await request({type:'command',command:{type:'duty',action:'open'}});await request({type:'speed',speed:7});
    const update=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const paused=await update;
    expect(replies.some(r=>r.type==='paused'&&r.events.some(e=>e.kind==='duties'))).toBe(true);expect(paused.speed).toBe(0);expect(paused.world.day).toBe(2);expect(paused.world.duties?.task?.phase).toBe('approval');
    const fault=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const denied=await request({type:'command',command:{type:'duty',action:'approve'}});fault.mockRestore();expect(denied.world).toEqual(paused.world);
    const approved=await request({type:'command',command:{type:'duty',action:'approve'}});await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(approved.world);
  });

  it('rolls back diplomatic dispatch when storage fails and persists accepted embassies',async()=>{
    await request({type:'init'});const before=await request({type:'new',characterId:'gao-huan',mode:'sandbox'});
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const failed=await request({type:'command',command:{type:'diplomacy',action:'improve',target:'west'}});spy.mockRestore();expect(failed.world).toEqual(before.world);
    const accepted=await request({type:'command',command:{type:'diplomacy',action:'improve',target:'west'}});
    expect(accepted.world.realm!.treasuries.east.coins).toBe(before.world.realm!.treasuries.east.coins-40);expect(accepted.world.diplomacy!.missions).toHaveLength(1);
    await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(accepted.world);
  });
  it('rolls back relationship writes on storage failure and restores accepted changes',async()=>{
    await request({type:'init'});const before=await request({type:'new',characterId:'xiao-yan',mode:'sandbox'});
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const failed=await request({type:'command',command:{type:'relationship',action:'gift',target:'xiao-gang'}});spy.mockRestore();expect(failed.world).toEqual(before.world);
    const accepted=await request({type:'command',command:{type:'relationship',action:'gift',target:'xiao-gang'}});
    expect(accepted.world.people[0].coins).toBe(before.world.people[0].coins-30);
    expect(accepted.world.relationships!.history).toHaveLength(1);
    await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(accepted.world);
  });
  it('persists court membership atomically and retains the original faction when saving fails',async()=>{
    await request({type:'init'});const before=await request({type:'new',characterId:'xiao-gang',mode:'sandbox'});
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const failed=await request({type:'command',command:{type:'court',action:'join',group:'reform'}});spy.mockRestore();expect(failed.world).toEqual(before.world);
    const accepted=await request({type:'command',command:{type:'court',action:'join',group:'reform'}});
    expect(accepted.world.realm?.governments?.realms.liang.court?.members['xiao-gang']).toBe('reform');
    expect(accepted.world.realm!.influence).toBe(before.world.realm!.influence-10);
    await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(accepted.world);
  });

  it('persists a reform and does not spend public resources when writing the new agenda fails',async()=>{
    await request({type:'init'});
    const before=await request({type:'new',characterId:'xiao-yan',mode:'sandbox'});
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const failed=await request({type:'command',command:{type:'government',action:'adopt',government:'feudal'}});spy.mockRestore();
    expect(failed.world).toEqual(before.world);
    const accepted=await request({type:'command',command:{type:'government',action:'adopt',government:'feudal'}});
    expect(accepted.world.realm?.governments?.realms.liang.task?.target).toBe('feudal');
    expect(accepted.world.realm?.treasuries.liang.coins).toBe(440);
    await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(accepted.world);
  });
  it('persists lifestyle unlocks and leaves points unchanged if saving fails',async()=>{
    await request({type:'init'});await request({type:'new',characterId:'xiao-yan'});
    const selected=await request({type:'command',command:{type:'lifestyle',action:'focus',focus:'architecture'}});
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const failed=await request({type:'command',command:{type:'lifestyle',action:'unlock',perk:'surveying'}});spy.mockRestore();
    expect(failed.world).toEqual(selected.world);expect(replies.some(r=>r.type==='notice'&&r.error)).toBe(true);
    const upgraded=await request({type:'command',command:{type:'lifestyle',action:'unlock',perk:'surveying'}});
    expect(upgraded.world.lifestyles?.people['xiao-yan'].perks).toEqual(['surveying']);
    await request({type:'menu'});const restored=await request({type:'resume'});expect(restored.world).toEqual(upgraded.world);
    const duplicate=await request({type:'command',command:{type:'lifestyle',action:'unlock',perk:'surveying'}});expect(duplicate.world).toEqual(restored.world);
  });

  it('saves sandbox economics, automatically pauses for decisions and resumes unchanged',async()=>{
    await request({type:'init'});const {newGovernedCampaignWorld}=await import('../core/governedTestWorld');const {serializeWorld:encode}=await import('../core/save');await request({type:'import',text:encode(newGovernedCampaignWorld('xiao-yan',undefined,'sandbox'))});
    const after=await request({type:'command',command:{type:'realm',action:'tax',site:'jiankang',tax:'heavy'}});expect(after.world.realm?.cities.jiankang.tax).toBe('heavy');
    await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(after.world);
    const {serializeWorld}=await import('../core/save');const {advance}=await import('../core/world');const world=structuredClone(after.world);advance(world,89);await request({type:'import',text:serializeWorld(world)});await request({type:'speed',speed:7});
    const update=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const paused=await update;
    expect(paused.world.day).toBe(90);expect(paused.speed).toBe(0);expect(paused.world.realm?.event).not.toBeNull();
    const resolved=await request({type:'command',command:{type:'realm',action:'event',choice:'decline'}});expect(resolved.world.realm?.event).toBeNull();await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(resolved.world);
  });
  it('passes script selection through the worker, saves its metadata and rejects unknown scripts atomically',async()=>{
    await request({type:'init'});
    const state=await request({type:'new',scriptId:'three-realms-546',characterId:'xiao-gang'});
    expect(state.world.scriptId).toBe('three-realms-546');expect(state.slots[0].scriptId).toBe('three-realms-546');
    const rejected=await request({type:'new',scriptId:'unreleased',characterId:'xiao-yan'});expect(rejected.world).toEqual(state.world);expect(rejected.slots).toEqual(state.slots);
    await request({type:'menu'});expect((await request({type:'resume'})).world.scriptId).toBe('three-realms-546');
  });
  it('persists social actions and transferred identity through menu and resume',async()=>{
    await request({type:'init'});await request({type:'new',characterId:'xiao-yan'});
    await request({type:'command',command:{type:'interact',target:'xiao-gang',action:'gift'}});
    await request({type:'command',command:{type:'heir',target:'xiao-yi'}});
    const transferred=await request({type:'command',command:{type:'handover'}});
    await request({type:'menu'});const restored=await request({type:'resume'});
    expect(restored.world).toEqual(transferred.world);expect(restored.world.characterId).toBe('xiao-yi');expect(restored.world.social?.founder).toBe('xiao-yan');expect(restored.world.social?.opinions['xiao-yan|xiao-gang']).toBe(40);
  });
  it('starts paused, creates a run, saves to menu, continues and preserves the previous run',async()=>{
    expect((await request({type:'init'})).slots).toHaveLength(0);
    let state=await request({type:'new'});expect(state.world.campaign?.status).toBe('active');expect(state.speed).toBe(0);
    await request({type:'step'});state=await request({type:'menu'});expect(state.world.day).toBe(1);expect(replies).toContainEqual({type:'screen',page:'menu'});
    state=await request({type:'resume'});expect(state.world.day).toBe(1);
    state=await request({type:'new'});expect(state.world.day).toBe(0);expect(state.slots.some(s=>s.id==='previous-run'&&s.day===1)).toBe(true);
    state=await request({type:'load',slot:'previous-run'});expect(state.world.day).toBe(1);
    const before=state.world;state=await request({type:'import',text:'broken'});expect(state.world).toEqual(before);expect(replies.at(-2)).toMatchObject({type:'notice',error:true});
  });
  it('persists a selected historical identity and rejects unknown starts without replacing it',async()=>{
    await request({type:'init'});
    let state=await request({type:'new',characterId:'yuwen-tai'});
    expect(state.world.people[0].name).toBe('宇文泰');expect(state.world.holdings.estate.family).toBe('yuwen');
    await request({type:'menu'});state=await request({type:'resume'});expect(state.world.characterId).toBe('yuwen-tai');
    const before=state.world;state=await request({type:'new',characterId:'unknown'});expect(state.world).toEqual(before);
  });
  it('does not leave the game or replace its world if persistence fails',async()=>{
    await request({type:'init'});await request({type:'new'});const before=await request({type:'step'});replies=[];
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
    const state=await request({type:'menu'});spy.mockRestore();expect(state.world).toEqual(before.world);expect(state.speed).toBe(0);expect(replies.some(r=>r.type==='screen')).toBe(false);expect(replies.some(r=>r.type==='notice'&&r.error)).toBe(true);
  });
  it('automatically saves the ending and prevents further time advancement',async()=>{
    await request({type:'init'});await request({type:'new'});
    const {newCampaignWorld}=await import('../core/world');const {serializeWorld}=await import('../core/save');
    const w=newCampaignWorld();w.day=119;await request({type:'import',text:serializeWorld(w)});await request({type:'speed',speed:7});
    const ended=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const state=await ended;
    expect(state.world.campaign?.status).toBe('lost');expect(state.speed).toBe(0);expect(state.slots[0].day).toBe(120);
    expect((await request({type:'speed',speed:7})).speed).toBe(0);
  });
});

describe('生命状态的 Worker 持久化',()=>{
 it('pauses and saves immediately on automatic inheritance',async()=>{
  await request({type:'init'});const snapshot=await request({type:'new',characterId:'xiao-yan',mode:'sandbox'});
  const {advance}=await import('../core/world');const {serializeWorld}=await import('../core/save');const w=structuredClone(snapshot.world);advance(w,29);
  w.life!.seed=100000;w.life!.people['xiao-yan'].health=1;w.life!.people['xiao-yan'].illness={kind:'fever',since:29,severity:3};
  await request({type:'import',text:serializeWorld(w)});await request({type:'speed',speed:7});
  const update=new Promise<Snapshot>(resolve=>{waiting=resolve;});await vi.advanceTimersByTimeAsync(1000);const paused=await update;
  expect(paused.world.characterId).toBe('xiao-gang');expect(paused.speed).toBe(0);expect(paused.world.day).toBe(30);
  await request({type:'menu'});expect((await request({type:'resume'})).world).toEqual(paused.world);
 });
 it('does not charge for care if the save fails',async()=>{
  await request({type:'init'});const snapshot=await request({type:'new',characterId:'gao-huan',mode:'sandbox'});
  const {serializeWorld}=await import('../core/save');const w=structuredClone(snapshot.world);w.life!.people['gao-huan'].illness={kind:'fever',since:0,severity:1};
  const before=await request({type:'import',text:serializeWorld(w)});
  const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('full','QuotaExceededError');});
  const failed=await request({type:'command',command:{type:'health',action:'care',target:'gao-huan'}});spy.mockRestore();expect(failed.world).toEqual(before.world);
  const accepted=await request({type:'command',command:{type:'health',action:'care',target:'gao-huan'}});expect(accepted.world.people[0].coins).toBe(before.world.people[0].coins-30);
 });
});

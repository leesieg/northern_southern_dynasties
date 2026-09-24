import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION, roads, sites, siteById } from '../data/scenario';
import { act, advance, newWorld, planRoute, position, remainingDays } from './world';
import { parseWorld, serializeWorld, validateWorld } from './save';

describe('geography and travel rules',()=>{
  it('every road has valid endpoints and all places are reachable',()=>{
    expect(new Set(sites.map(s=>s.id)).size).toBe(sites.length);
    for(const r of roads){expect(siteById[r.from]).toBeDefined();expect(siteById[r.to]).toBeDefined();}
    for(const s of sites.filter(s=>s.id!=='jiankang'))expect(planRoute('jiankang',s.id)?.days).toBeGreaterThan(0);
  });
  it('plans the shortest time route across the graph, with consistent provisions',()=>{
    const p=planRoute('jiankang','ye')!;
    expect(p.route[0]).toBe('jiankang');expect(p.route.at(-1)).toBe('ye');
    expect(p.food).toBe(p.days);expect(p.days).toBe(p.durations.reduce((a,b)=>a+b,0));
    expect(planRoute('ye','jiankang')?.days).toBe(p.days);
    expect(planRoute('jiankang','__proto__')).toBeNull();
  });
  it('reserves food once, moves continuously, and arrives exactly on the promised day',()=>{
    const w=newWorld(),p=planRoute('jiankang','changan')!;
    act(w,{type:'travel',destination:'changan'});
    expect(w.people[0].food).toBe(90-p.days);
    expect(position(w.people[0]).lon).toBe(siteById.jiankang.lon);
    advance(w,1);expect(position(w.people[0]).lon).not.toBe(siteById.jiankang.lon);
    advance(w,p.days-2);expect(remainingDays(w.people[0])).toBe(1);expect(w.people[0].journey).not.toBeNull();
    advance(w);expect(w.people[0].location).toBe('changan');expect(w.people[0].journey).toBeNull();
    expect(w.people[0].food).toBe(90-p.days);validateWorld(w);
  });
  it('rejects duplicate departures and purchases while in transit without changing resources',()=>{
    const w=newWorld();act(w,{type:'travel',destination:'changan'});const snapshot=structuredClone(w);
    expect(()=>act(w,{type:'travel',destination:'ye'})).toThrow('正在途中');
    expect(()=>act(w,{type:'provision'})).toThrow('正在途中');expect(w).toEqual(snapshot);
  });
  it('rejects insufficient resources and same-place travel without mutating the world',()=>{
    const w=newWorld();w.people[0].food=0;w.people[0].coins=0;const snapshot=structuredClone(w);
    expect(()=>act(w,{type:'travel',destination:'changan'})).toThrow('行粮不足');
    expect(()=>act(w,{type:'travel',destination:'jiankang'})).toThrow();
    expect(()=>act(w,{type:'provision'})).toThrow('盘缠不足');expect(w).toEqual(snapshot);
  });
  it('purchases actual provisions and records the cost',()=>{
    const w=newWorld();act(w,{type:'provision'});expect(w.people[0].coins).toBe(168);expect(w.people[0].food).toBe(120);expect(w.chronicle.at(-1)?.text).toContain('12 钱');
  });
  it('continues distant NPC journeys without moving the idle player',()=>{
    const w=newWorld();advance(w,10);
    expect(w.people[0].location).toBe('jiankang');expect(w.people.slice(1).some(p=>p.journey)).toBe(true);
    expect(position(w.people[1]).lon).not.toBe(siteById.changan.lon);validateWorld(w);
  });
});
describe('save and deterministic simulation',()=>{
  it('matches uninterrupted simulation after a mid-journey save and reload',()=>{
    const a=newWorld();act(a,{type:'travel',destination:'changan'});advance(a,7);
    const b=parseWorld(serializeWorld(a));advance(a,365);advance(b,365);expect(b).toEqual(a);
  });
  it('rejects tampering, malformed files, and incompatible versions',()=>{
    expect(()=>parseWorld('not JSON')).toThrow();expect(()=>parseWorld('x'.repeat(2_000_001))).toThrow();
    const serialized=serializeWorld(newWorld());expect(()=>parseWorld(serialized.replace(CONTENT_VERSION,'incorrect'))).toThrow();
    const world=newWorld();world.contentVersion='different';expect(()=>serializeWorld(world)).toThrow('不兼容');
  });
  it('rejects inconsistent routes, invalid dates, inventory and history references',()=>{
    for(const mutate of [
      (w:ReturnType<typeof newWorld>)=>{w.people[0].coins=-1;},
      (w:ReturnType<typeof newWorld>)=>{w.day=NaN;},
      (w:ReturnType<typeof newWorld>)=>{w.people[0].location='__proto__';},
      (w:ReturnType<typeof newWorld>)=>{w.chronicle[0].person='ghost';},
      (w:ReturnType<typeof newWorld>)=>{w.people[0].journey!.durations[0]++;},
      (w:ReturnType<typeof newWorld>)=>{w.people[0].journey!.elapsed=2;},
    ]){const w=newWorld();act(w,{type:'travel',destination:'changan'});mutate(w);expect(()=>validateWorld(w)).toThrow();}
  });
  it('runs fifty years without invalid positions, unbounded events, or inconsistent journeys',()=>{
    const w=newWorld();
    for(let y=0;y<50;y++){advance(w,365);validateWorld(w);}
    expect(w.day).toBe(18250);expect(w.chronicle.length).toBeLessThanOrEqual(100);
    expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
});

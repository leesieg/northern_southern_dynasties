import { describe,expect,it } from 'vitest';
import { act,advance,newWorld } from '../core/world';
import { parseWorld,serializeWorld } from '../core/save';
import { estateScene } from './estateScene';

describe('estate painting state',()=>{
  it('shows only the initial home and leaves unbuilt plots empty',()=>{
    const w=newWorld();
    const scene=estateScene(w.holdings.estate,w.day);
    expect(scene.find(p=>p.id==='hall')).toMatchObject({row:0,level:1,constructing:false});
    expect(scene.filter(p=>p.id!=='hall').every(p=>p.row===null&&!p.constructing)).toBe(true);
  });
  it('keeps new buildings hidden during construction and restores their progress from saves',()=>{
    const w=newWorld();
    act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});
    advance(w,9);
    const restored=parseWorld(serializeWorld(w));
    expect(estateScene(restored.holdings.estate,restored.day)).toEqual(estateScene(w.holdings.estate,w.day));
    expect(estateScene(restored.holdings.estate,restored.day).find(p=>p.id==='fields')).toMatchObject({row:null,constructing:true,progress:.9,remaining:1,target:1});
    advance(restored);
    expect(estateScene(restored.holdings.estate,restored.day).find(p=>p.id==='fields')).toMatchObject({row:0,constructing:false,progress:null,level:1});
  });
  it('preserves the old building while upgrading and swaps it only on completion',()=>{
    const w=newWorld();
    act(w,{type:'build',scope:'estate',site:'jiankang',building:'hall'});
    advance(w,29);
    expect(estateScene(w.holdings.estate,w.day).find(p=>p.id==='hall')).toMatchObject({row:0,constructing:true,target:2,remaining:1});
    advance(w);
    expect(estateScene(w.holdings.estate,w.day).find(p=>p.id==='hall')).toMatchObject({row:1,level:2,constructing:false});
  });
  it('supports independent building levels without modifying the saved estate',()=>{
    const w=newWorld();
    w.holdings.estate.levels={hall:3,fields:1,workshop:2,storehouse:3};
    const before=structuredClone(w.holdings.estate);
    const scene=estateScene(w.holdings.estate,w.day);
    expect(Object.fromEntries(scene.map(p=>[p.id,[p.column,p.row]]))).toEqual({hall:[0,2],fields:[1,0],workshop:[2,1],storehouse:[3,2]});
    expect(w.holdings.estate).toEqual(before);
  });
});

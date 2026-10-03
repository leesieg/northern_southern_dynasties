import { describe,expect,it } from 'vitest';
import { act,advance,newWorld,newCampaignWorld } from './world';
import { buildQuote, emptyCity, provisionCost, estateYield, estateName, beginConstruction, advanceConstruction } from './construction';
import { parseWorld,serializeWorld,validateWorld } from './save';
import type { GameCommand } from './types';
import {familyById} from '../data/families';
const estate=(building:'fields'|'hall'|'workshop'|'storehouse')=>({type:'build' as const,scope:'estate' as const,site:'jiankang',building});
function legacyEnvelope(payload:string){let hash=2166136261;for(let i=0;i<payload.length;i++)hash=Math.imul(hash^payload.charCodeAt(i),16777619);return JSON.stringify({format:'fynbc-save',version:1,payload,checksum:(hash>>>0).toString(16)});}
describe('city and family construction rules',()=>{
  it('derives estate names from every registered family, including compound and generated surnames',()=>{
    for(const [id,family] of Object.entries(familyById))expect(estateName(id)).toBe(family.surname+'氏庄园');
    expect(estateName('cui-qinghe')).toBe('崔氏庄园');expect(estateName('chen-yingchuan')).toBe('陈氏庄园');
    expect(estateName('fictional-house-liang')).toBe('顾氏庄园');expect(estateName('yuwen')).toBe('宇文氏庄园');
    expect(estateName('missing-family')).toBe('家族庄园');
  });
  it('uses the actual estate family in existing saves and construction records without changing assets',()=>{
    for(const id of ['cui-ling','chen-baxian','guest-liang','yuwen-tai']){
      const w=parseWorld(serializeWorld(newCampaignWorld(id,undefined,'sandbox'))),family=w.holdings.estate.family,name=estateName(family),before=structuredClone(w.holdings);
      expect(name).not.toBe('家族氏庄园');expect(w.holdings).toEqual(before);
      w.people[0].coins=1000;const command={type:'build',scope:'estate',site:w.holdings.estate.location,building:'fields'} as const,q=buildQuote(w,command);expect(q.reason).toBe('');
      beginConstruction(w,command);expect(w.people[0].coins).toBe(1000-q.cost);expect(w.chronicle.at(-1)?.text).toContain(name+'开建');
      w.day=w.holdings.estate.project!.due;advanceConstruction(w);expect(w.chronicle.some(e=>e.text.startsWith(name+'的田庄竣工'))).toBe(true);
      expect(w.holdings.estate.family).toBe(family);expect(parseWorld(serializeWorld(w)).holdings.estate).toEqual(w.holdings.estate);
    }
  });
  it('uses the same estate income forecast and actual private payment without an office',()=>{
    const w=newWorld();w.holdings.estate.levels.workshop=1;w.holdings.governedCities=[];
    expect(estateYield(w)).toEqual({coins:10,food:0});
    const before=w.people[0].coins;w.day=31;advanceConstruction(w);
    expect(w.people[0].coins-before).toBe(estateYield(w).coins);
  });
  it('deducts the real cost, persists an unfinished project and completes once',()=>{
    const w=newWorld();act(w,estate('fields'));expect(w.people[0].coins).toBe(140);expect(w.holdings.estate.levels.fields).toBe(0);
    advance(w,9);const restored=parseWorld(serializeWorld(w));advance(restored);expect(restored.holdings.estate.levels.fields).toBe(1);expect(restored.holdings.estate.project).toBeNull();
    advance(restored,21);expect(restored.people[0].coins).toBe(144);expect(restored.people[0].food).toBe(96);validateWorld(restored);
  });
  it('enforces estate slots, project capacity, home location and affordability atomically',()=>{
    const w=newWorld();act(w,estate('fields'));let before=structuredClone(w);
    expect(()=>act(w,estate('workshop'))).toThrow('已有工程');expect(w).toEqual(before);
    advance(w,10);before=structuredClone(w);expect(()=>act(w,estate('workshop'))).toThrow('建筑位已满');expect(w).toEqual(before);
    expect(()=>act(w,{...estate('fields'),site:'ye'})).toThrow('家族庄园位于');
    expect(()=>act(w,estate('hall'))).toThrow('盘缠不足');
    w.people[0].coins=500;act(w,estate('hall'));advance(w,31);expect(w.holdings.estate.levels.hall).toBe(2);expect(buildQuote(w,estate('workshop')).reason).toBe('');
  });
  it('requires city authority and rejects construction on counties, realms or invalid categories',()=>{
    const w=newWorld(),before=structuredClone(w);
    for(const command of [
      {type:'build',scope:'city',site:'jiankang',building:'market'},
      {type:'build',scope:'city',site:'danyang-prefecture',building:'market'},
      {type:'build',scope:'county',site:'jiankang',building:'fields'},
      {type:'build',scope:'estate',site:'jiankang',building:'market'},
    ]){expect(()=>act(w,command as GameCommand)).toThrow();expect(w).toEqual(before);}
    w.holdings.governedCities=['jiankang'];act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});advance(w,31);
    expect(w.holdings.cities.jiankang.levels.market).toBe(1);expect(w.people[0].coins).toBe(112);validateWorld(w);
  });
  it('keeps family income without an office, while city bonuses require governance',()=>{
    const w=newWorld();w.holdings.cities.jiankang=emptyCity();w.holdings.cities.jiankang.levels.hostel=2;
    expect(provisionCost(w)).toBe(12);w.holdings.governedCities=['jiankang'];expect(provisionCost(w)).toBe(8);
    act(w,{type:'provision'});expect(w.people[0].coins).toBe(172);
    w.holdings.governedCities=[];act(w,estate('fields'));act(w,{type:'travel',destination:'changan'});advance(w,31);
    expect(w.holdings.estate.levels.fields).toBe(1);expect(w.people[0].coins).toBe(136);validateWorld(w);
  });
  it('migrates a genuine version-one journey without changing its route or resources',()=>{
    const w=newWorld();act(w,{type:'travel',destination:'changan'});advance(w,3);
    const {holdings:_,...base}=w;const legacy={...base,version:1};
    const migrated=parseWorld(legacyEnvelope(JSON.stringify(legacy)));
    expect(migrated.version).toBe(2);expect(migrated.people).toEqual(w.people);expect(migrated.day).toBe(w.day);expect(migrated.holdings.estate.levels.hall).toBe(1);validateWorld(migrated);
  });
  it('rejects tampered permissions, invalid projects and impossible building states',()=>{
    const mutations=[
      (w:ReturnType<typeof newWorld>)=>{w.holdings.governedCities=['unknown'];},
      (w:ReturnType<typeof newWorld>)=>{w.holdings.governedCities=['ye','ye'];},
      (w:ReturnType<typeof newWorld>)=>{w.holdings.estate.levels.fields=9;},
      (w:ReturnType<typeof newWorld>)=>{w.holdings.estate.project!.due++;},
      (w:ReturnType<typeof newWorld>)=>{w.holdings.estate.project!.cost=1;},
      (w:ReturnType<typeof newWorld>)=>{w.holdings.estate.levels.fields=1;w.holdings.estate.levels.workshop=1;},
    ];
    for(const mutate of mutations){const w=newWorld();act(w,estate('fields'));mutate(w);expect(()=>validateWorld(w)).toThrow();}
  });
});

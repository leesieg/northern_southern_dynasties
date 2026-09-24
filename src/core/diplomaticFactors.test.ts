import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {diplomaticPair,diplomaticOpinionBreakdown,diplomaticWar,advanceDiplomacy} from './diplomacy';
import {parseWorld,serializeWorld,validateWorld} from './save';
const start=()=>{const w=newCampaignWorld('gao-huan',undefined,'sandbox');w.realm!.influence=900;w.realm!.treasuries.east.coins=10000;return w;};
const sum=(w:ReturnType<typeof start>)=>diplomaticOpinionBreakdown(diplomaticPair(w,'east','west')!).reduce((n,v)=>n+v.value,0);
describe('diplomatic opinion factors',()=>{
 it('preserves existing scores without inventing past causes',()=>{const w=start(),p=diplomaticPair(w,'east','west')!;p.opinion=13;const copy=parseWorld(serializeWorld(w));expect(diplomaticOpinionBreakdown(diplomaticPair(copy,'east','west')!)).toEqual([{label:'既有关系（未记分项）',value:13}]);});
 it('records the actual capped delta and roundtrips its factors',()=>{const w=start(),p=diplomaticPair(w,'east','west')!;p.opinion=-95;act(w,{type:'diplomacy',action:'insult',target:'west'});expect(p.opinion).toBe(-100);expect(p.opinionFactors).toEqual({base:-95,effects:{insult:-5}});expect(sum(w)).toBe(p.opinion);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('records war independently of diplomatic condemnation without exceeding the cap',()=>{const w=start(),p=diplomaticPair(w,'east','west')!;p.opinion=50;act(w,{type:'diplomacy',action:'insult',target:'west'});diplomaticWar(w,'east','west');expect(p.opinionFactors?.effects).toEqual({insult:-25,war:-40});expect(sum(w)).toBe(-15);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('accounts for successful and refused missions',()=>{for(const action of ['improve','safe'] as const){const w=start(),p=diplomaticPair(w,'east','west')!;act(w,{type:'diplomacy',action,target:'west'});w.day=w.diplomacy!.missions[0].due;advanceDiplomacy(w);expect(p.opinionFactors?.effects).toEqual(action==='improve'?{agreement:25}:{refusal:-5});expect(sum(w)).toBe(p.opinion);expect(parseWorld(serializeWorld(w))).toEqual(w);}});
 it('rejects imports with inconsistent totals, unknown causes or invalid factor values',()=>{const w=start();act(w,{type:'diplomacy',action:'insult',target:'west'});for(const value of [0,NaN,1000001]){const bad=structuredClone(w);diplomaticPair(bad,'east','west')!.opinionFactors!.effects.insult=value;expect(()=>validateWorld(bad)).toThrow();}const bad=structuredClone(w);Object.assign(diplomaticPair(bad,'east','west')!.opinionFactors!.effects,{fake:0});expect(()=>validateWorld(bad)).toThrow();});
});

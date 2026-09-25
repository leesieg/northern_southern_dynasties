import {describe,it,expect} from 'vitest';
import {roadMeeting,roadEncounters} from './battlefield';
import {newCampaignWorld} from './world';
import type {Journey} from './types';
const journey=(route:string[],days:number,elapsed=0):Journey=>({route,durations:[days],leg:0,elapsed,started:0});
describe('road encounters',()=>{
 it('catches opposed armies on a one-day road',()=>expect(roadMeeting(journey(['a','b'],1),journey(['b','a'],1))).toBe(true));
 it('waits until swept progress meets and ignores unrelated or parallel movement',()=>{expect(roadMeeting(journey(['a','b'],10),journey(['b','a'],10))).toBe(false);expect(roadMeeting(journey(['a','b'],10,4),journey(['b','a'],10,4))).toBe(true);expect(roadMeeting(journey(['a','b'],1),journey(['a','b'],1))).toBe(false);});
 it('does not intercept neutrals or armies withdrawing under a peace treaty',()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),s=w.realm!;s.armies=[{realm:'liang',location:'jiankang',troops:200,supply:100,morale:100,siege:0,journey:journey(['jiankang','ye'],1)},{realm:'east',location:'ye',troops:200,supply:100,morale:100,siege:0,journey:journey(['ye','jiankang'],1)}];expect(roadEncounters(w)).toHaveLength(0);s.war={attacker:'liang',defender:'east',target:'ye',started:0,score:0};expect(roadEncounters(w)).toHaveLength(1);s.armies[0].withdrawalUntil=30;expect(roadEncounters(w)).toHaveLength(0);});
});

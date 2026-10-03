import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {actLife,advanceLife,die} from './life';
import {nextMonthStart} from './calendar';
import {ageAt,ageLabel} from './lifeState';
import {getPerson,getCharacter} from './personRegistry';
import {validLife} from './lifeSave';
import {parseWorld,serializeWorld} from './save';

describe('bounded automatic care and death cleanup',()=>{
 it('ages generated children on their birthday and includes them in life validation',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),id='test-child';w.day=40;
  w.generatedPeople={[id]:{person:{...getPerson(w,'gao-yang')!,id},character:{...getCharacter(w,'gao-yang')!,id},birthDay:40,father:'gao-huan',mother:'lou-zhaojun'}};
  w.life!.people[id]={health:100,illness:null,careUntil:0,death:null};
  expect(ageAt(w,id,404)).toBe(0);expect(ageAt(w,id,405)).toBe(1);expect(ageLabel(w,id)).toBe('0 岁');expect(validLife(w)).toBe(true);
  delete w.life!.people[id];expect(validLife(w)).toBe(false);
 });
 it('uses a finite authorization without prepayment or duplicate monthly charges',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),id=w.characterId!,p=w.life!.people[id],coins=w.people[0].coins;
  actLife(w,{type:'health',action:'auto-care',target:id});expect(w.people[0].coins).toBe(coins);
  expect(()=>actLife(w,{type:'health',action:'auto-care',target:id})).toThrow('已有');
  for(let n=1;n<=3;n++){
   w.day=nextMonthStart(w.day+90,w.scriptId);p.health=50;p.illness={kind:'cold',since:w.day,severity:1};
   advanceLife(w);expect(w.people[0].coins).toBe(coins-30*n);expect(p.careUntil).toBe(w.day+90);
   const snapshot=structuredClone(w.life);advanceLife(w);expect(w.life).toEqual(snapshot);
  }
  expect(w.life!.autoCare).toBeUndefined();
  w.day=nextMonthStart(w.day+90,w.scriptId);p.health=50;advanceLife(w);expect(w.people[0].coins).toBe(coins-90);
 });
 it('pauses on lack of private funds and cancels without refunding unspent authorization',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox'),id=w.characterId!;
  actLife(w,{type:'health',action:'auto-care',target:id});w.people[0].coins=29;w.life!.people[id].health=40;
  w.day=nextMonthStart(w.day,w.scriptId);advanceLife(w);expect(w.people[0].coins).toBe(29);expect(w.life!.autoCare!.remaining).toBe(90);
  actLife(w,{type:'health',action:'stop-auto-care',target:id});expect(w.people[0].coins).toBe(29);expect(w.life!.autoCare).toBeUndefined();
 });
 it('persists authorization and rejects malformed or foreign spending authority',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');actLife(w,{type:'health',action:'auto-care',target:'gao-huan'});
  expect(parseWorld(serializeWorld(w))).toEqual(w);
  w.life!.autoCare!.remaining=91;expect(validLife(w)).toBe(false);w.life!.autoCare!.remaining=90;w.life!.autoCare!.payer='gao-yang';expect(validLife(w)).toBe(false);
 });
 it('clears care, tuition and commander duties immediately without double settlement',()=>{
  const w=newCampaignWorld('gao-huan',undefined,'sandbox');actLife(w,{type:'health',action:'auto-care',target:'gao-huan'});
  w.householdPlans={nextId:2,lastNPC:0,gifts:[],growth:{},tuition:[{id:1,payer:'gao-huan',student:'gao-yang',teacher:'gao-cheng',skill:'stewardship',next:31,progress:3,lastWorked:0,completed:0,paid:30,status:'active',reason:''}]};
  w.mobility!.armyCommanders={1:'gao-huan'};w.mobility!.pendingCommanders={2:{person:'gao-huan',ordered:0}};
  die(w,'gao-huan','illness');expect(w.life!.autoCare).toBeUndefined();expect(w.householdPlans.tuition[0].status).toBe('cancelled');expect(w.householdPlans.tuition[0].paid).toBe(30);expect(w.mobility!.armyCommanders).toEqual({});expect(w.mobility!.pendingCommanders).toEqual({});
  const coins=w.people[0].coins;die(w,'gao-huan','illness');expect(w.people[0].coins).toBe(coins);
 });
});

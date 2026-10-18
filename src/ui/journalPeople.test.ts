import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from '../core/world';
import {die} from '../core/life';
import {ensureHouseholdLife,deliverChild} from '../core/householdLife';
import {getPerson} from '../core/personRegistry';
import {parseWorld,serializeWorld} from '../core/save';
import {journalEntries} from './journalPeople';

function born(){
 const world=newCampaignWorld('gao-cheng',undefined,'sandbox'),s=ensureHouseholdLife(world);
 s.pregnancies.push({id:s.nextId++,father:'gao-cheng',mother:'guest-east',family:'gao',since:0,due:270,status:'expecting',child:null});
 world.day=270;deliverChild(world,s.pregnancies[0]);
 return {world,id:s.pregnancies[0].child!};
}
describe('journal event participants',()=>{
 it('resolves real death and succession records without rewriting their saved legacy roles',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');world.day=1;die(world,'gao-huan','illness');
  const before=serializeWorld(world),entries=journalEntries(world);
  const death=entries.find(({event})=>event.text.startsWith('高欢病逝'))!;
  expect(death.event.person).toBe('player');expect(death.people.map(p=>p.id)).toEqual(['gao-huan']);
  const succession=entries.find(({event})=>event.text.startsWith('高欢身后'))!;
  expect(succession.people.map(p=>p.id)).toContain('gao-cheng');expect(succession.people.map(p=>p.id)).not.toContain('xiao-yan');
  expect(serializeWorld(world)).toBe(before);expect(journalEntries(parseWorld(before))).toEqual(entries);
 });
 it('keeps personal records with the person controlled on that day and leaves same-day handovers unresolved',()=>{
  const world=newCampaignWorld('xiao-gang',undefined,'sandbox');world.day=12;
  world.social!.lineage=[{id:'xiao-yan',day:0},{id:'xiao-gang',day:10}];
  world.chronicle=[2,10,11].map(day=>({day,person:'player',text:'你抵达建康。'}));
  expect(journalEntries(world).map(e=>e.people.map(p=>p.id))).toEqual([['xiao-yan'],[],['xiao-gang']]);
 });
 it('deduplicates people and uses textual order in a multi-person record',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
  world.chronicle=[{day:0,person:'player',text:'高澄为高欢议谥；高澄主持朝政。'}];
  expect(journalEntries(world)[0].people.map(p=>p.id)).toEqual(['gao-cheng','gao-huan']);
 });
 it('includes a real simulated child in a birth record',()=>{
  const {world,id}=born(),name=getPerson(world,id)!.name;
  const event=journalEntries(world).find(({event})=>event.text.includes(name))!;
  expect(event.people.map(p=>p.id)).toContain(id);expect(event.people.map(p=>p.id)).not.toContain('xiao-yan');
 });
 it('does not guess between people with the same name',()=>{
  const {world,id}=born();world.generatedPeople![id].person.name='高欢';world.generatedPeople![id].character.name='高欢';
  world.chronicle=[{day:world.day,person:'player',text:'高欢病势消退，逐渐康复。'}];
  expect(journalEntries(world)[0].people).toEqual([]);
 });
 it('does not link a shorter name contained within another full name',()=>{
  const {world,id}=born();world.generatedPeople![id].person.name='宝炬';world.generatedPeople![id].character.name='宝炬';
  world.chronicle=[{day:world.day,person:'player',text:'元宝炬患上风寒。'}];
  expect(journalEntries(world)[0].people.map(p=>p.id)).toEqual(['yuan-baoju']);
 });
 it('retains an explicit real person ID and leaves unattributed public events empty',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox');
  world.chronicle=[{day:0,person:'gao-huan',text:'病势消退。'},{day:0,person:'player',text:'建康城防竣工。'}];
  expect(journalEntries(world).map(e=>e.people.map(p=>p.id))).toEqual([['gao-huan'],[]]);
 });
});

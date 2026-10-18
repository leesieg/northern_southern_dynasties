import {allPeople,getPerson} from '../core/personRegistry';
import type {World} from '../core/types';

/** Chronicle.person is a legacy travel role / message recipient, not an event actor. */
export function journalEntries(world:World){
 const byName=new Map<string,ReturnType<typeof allPeople>>();
 for(const person of allPeople(world)){
  if(person.name.length<2)continue;
  const matches=byName.get(person.name)??[];
  matches.push(person);byName.set(person.name,matches);
 }
 // Match full names before contained shorter names; duplicate names remain unresolved.
 const names=[...byName.keys()].sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const pattern=names.length?new RegExp(names.join('|'),'gu'):null;
 return world.chronicle.map(event=>{
  const ids=new Set<string>();
  if(event.person!=='player'&&getPerson(world,event.person))ids.add(event.person);
  if(pattern)for(const match of event.text.matchAll(pattern)){
   const people=byName.get(match[0])!;
   if(people.length===1)ids.add(people[0].id);
  }
  if(event.person==='player'&&/^(?:你|本人|授权本人|停止自动延医|选择生活重心|掌握「)/u.test(event.text)){
   const lineage=world.social?.lineage??[];
   // Same-day records have no ordering marker relative to a handover: do not guess.
   if(!lineage.slice(1).some(entry=>entry.day===event.day)){
    const id=lineage.filter(entry=>entry.day<=event.day).at(-1)?.id??world.characterId;
    if(id&&getPerson(world,id))ids.add(id);
   }
  }
  return {event,people:[...ids].map(id=>getPerson(world,id)!)};
 });
}

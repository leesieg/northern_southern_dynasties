import {personResidence} from './residence';
import {isAlive} from './lifeState';
import { relationshipPeople } from '../data/relationships';
import type { World } from './types';

/** Simulated locations take priority; other roster characters retain their scenario residence. */
export function residentsAt(world:World,sites:readonly string[]){
 const scope=new Set(sites),simulated=new Set(world.people.map(p=>p.id==='player'?world.characterId??'player':p.id));
 const residents=world.people.filter(p=>isAlive(world,p.id==='player'?world.characterId??'fictional':p.id)&&!p.journey&&scope.has(p.location)).map(p=>({id:p.id==='player'?world.characterId??'player':p.id,name:p.name,site:p.location,self:p.id==='player'}));
 for(const person of relationshipPeople){
  if(isAlive(world,person.id)&&!simulated.has(person.id)&&!personResidence(world,person.id).traveling&&scope.has(personResidence(world,person.id).site))residents.push({id:person.id,name:person.name,site:personResidence(world,person.id).site,self:false});
 }
 return residents.sort((a,b)=>Number(b.self)-Number(a.self)||a.site.localeCompare(b.site));
}

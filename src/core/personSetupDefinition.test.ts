import {describe,it,expect} from 'vitest';
import {assertPersonSetups,type PersonSetups} from './personSetupDefinition';
import {newEventAction} from './eventDefinitions';
import {assertInitialSuccession} from './initialSuccessionDefinition';
const value=():PersonSetups=>({p:{abilities:{diplomacy:8,martial:12,stewardship:15,intrigue:0},traits:['honest','gregarious'],source:'作者技术样本'}});
describe('author personality and succession contracts',()=>{
 it('keeps legacy defaults and accepts explicit base abilities',()=>{expect(()=>assertPersonSetups(null)).not.toThrow();expect(()=>assertPersonSetups(value())).not.toThrow();});
 it.each([-1,31,Infinity,1.5])('rejects invalid base ability %s',n=>{const v=value();v.p.abilities!.martial=n;expect(()=>assertPersonSetups(v)).toThrow();});
 it.each([['honest','greedy'],['frugal','generous'],['honest','honest'],['unknown']].map(traits=>({traits})))('rejects contradictory, duplicate or unregistered traits $traits',({traits})=>{const v=value();v.p.traits=traits as typeof v.p.traits;expect(()=>assertPersonSetups(v)).toThrow();});
 it('constructs the same registered action selected by the editor',()=>{expect(newEventAction('relocateCourt')).toEqual({kind:'relocateCourt'});expect(newEventAction('requestGrant')).toEqual({kind:'requestGrant',amount:40});expect(()=>newEventAction('unregistered' as any)).toThrow();});
 it('requires sources and rejects unregistered effect fields',()=>{const v=value();v.p.source='';expect(()=>assertPersonSetups(v)).toThrow();expect(()=>assertPersonSetups({p:{...value().p,freeMoney:100}})).toThrow();});
 it('accepts a declared succession and rejects a dynasty without a ruler',()=>{expect(()=>assertInitialSuccession({liang:{ruler:'heir',executive:null,dynasty:null}})).not.toThrow();expect(()=>assertInitialSuccession({liang:{ruler:null,executive:null,dynasty:'齐'}})).toThrow();expect(()=>assertInitialSuccession({'realm-99':{ruler:'heir',executive:null,dynasty:null}})).toThrow();});
});

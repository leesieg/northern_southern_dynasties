import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {ensureHouseholdLife,advanceHouseholdLife,deliverChild,familyPlanningReason,actFamily,familyCommandReason} from './householdLife';
import {nextMonthStart} from './calendar';
import {parseWorld,serializeWorld} from './save';
import {die} from './life';
import {parentLinksOf} from './personRegistry';
import {closeKin,maritalStress,changeRelationOpinion} from './relationships';
import {validGeneratedPeople,validHouseholdLife} from './householdLifeSave';
function setup(){const w=newCampaignWorld('gao-cheng',undefined,'sandbox');w.relationships!.marriages.push({id:'marriage:simulation:gao-cheng:0:3',a:'gao-cheng',b:'guest-east',from:0,until:null,origin:'simulation'});w.relationships!.maritalBasis['gao-cheng']='simulation';w.relationships!.maritalBasis['guest-east']='simulation';w.mobility!.residences['guest-east']={site:w.people[0].location,journey:null};ensureHouseholdLife(w);return w;}
function birth(){const w=setup(),s=w.householdLife!;const p={id:s.nextId++,father:'gao-cheng',mother:'guest-east',family:'gao',since:0,due:270,status:'expecting' as const,child:null};s.pregnancies.push(p);w.day=270;deliverChild(w,s.pregnancies[0]);return {w,p:s.pregnancies[0],id:s.pregnancies[0].child!};}
describe('household lifecycle state',()=>{
 it('persists a chosen plan, blocks conception apart, and never backfills past births',()=>{const w=setup();actFamily(w,{type:'familyLife',action:'plan',trying:true,family:'gao'});expect(parseWorld(serializeWorld(w))).toEqual(w);w.mobility!.residences['guest-east'].site='jiankang';expect(familyPlanningReason(w)).toContain('同城');w.day=nextMonthStart(w.day);advanceHouseholdLife(w);expect(w.householdLife!.pregnancies).toHaveLength(0);const s=serializeWorld(w);advanceHouseholdLife(w);expect(serializeWorld(w)).toBe(s);});
 it('birth commits once with no free cash and survives divorce and paternal death',()=>{const {w,p,id}=birth(),seed=w.householdLife!.seed;expect(w.relationships!.reserves[id]).toBe(0);expect(closeKin(id,p.father,w)).toBe(true);expect(closeKin(id,p.mother,w)).toBe(true);deliverChild(w,p);expect(w.householdLife!.seed).toBe(seed);expect(Object.keys(w.generatedPeople!)).toEqual([id]);w.relationships!.marriages.find(m=>m.id==='marriage:simulation:gao-cheng:0:3')!.until=w.day;die(w,'gao-cheng','illness');expect(parentLinksOf(w).filter(l=>l.child===id)).toHaveLength(2);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('keeps a started pregnancy after the father dies, but ends it if the mother dies',()=>{const w=setup(),s=w.householdLife!,p={id:s.nextId++,father:'gao-cheng',mother:'guest-east',family:'gao',since:0,due:270,status:'expecting' as const,child:null};s.pregnancies.push(p);w.day=20;die(w,'gao-cheng','battle');w.day=270;deliverChild(w,s.pregnancies[0]);expect(s.pregnancies[0].status).toBe('born');const other=setup(),os=other.householdLife!;os.pregnancies.push({...p,status:'expecting',child:null});os.nextId=2;die(other,'guest-east','illness');other.day=270;deliverChild(other,os.pregnancies[0]);expect(os.pregnancies[0].status).toBe('ended');expect(other.generatedPeople).toBeUndefined();});
 it('charges dependent upbringing once per month without fabricating a child purse',()=>{const {w,id}=birth(),mother='guest-east',before=w.relationships!.reserves[mother];w.day=nextMonthStart(w.day);advanceHouseholdLife(w);expect(w.relationships!.reserves[mother]).toBe(before-2);expect(w.relationships!.reserves[id]).toBe(0);advanceHouseholdLife(w);expect(w.relationships!.reserves[mother]).toBe(before-2);});
 it('rejects tampered genealogy, generated identities and duplicate pregnancy receipts',()=>{const {w,id}=birth();expect(validGeneratedPeople(w)).toBe(true);expect(validHouseholdLife(w)).toBe(true);const bad=structuredClone(w);bad.generatedPeople![id].mother=id;expect(validGeneratedPeople(bad)).toBe(false);w.householdLife!.pregnancies.push({...w.householdLife!.pregnancies[0]});expect(validHouseholdLife(w)).toBe(false);});
 it('uses reciprocal marriage relations for monthly stress rather than a permanent spouse bonus',()=>{const w=setup();changeRelationOpinion(w,'gao-cheng','guest-east',100);changeRelationOpinion(w,'guest-east','gao-cheng',100);expect(maritalStress(w,'gao-cheng')).toBe(-2);changeRelationOpinion(w,'guest-east','gao-cheng',-200);expect(maritalStress(w,'gao-cheng')).toBe(3);});
 it('blocks adult authority for an underage successor but permits household growth choices',()=>{const {w,id}=birth();act(w,{type:'heir',target:id});die(w,'gao-cheng','age');expect(()=>act(w,{type:'travel',destination:'luoyang'})).toThrow('未满');expect(()=>act(w,{type:'realm',action:'tax',level:0} as never)).toThrow('未满');});
 it('settles a childhood choice once with a real consumed trait and relation tradeoff',()=>{const {w,id}=birth(),s=w.householdLife!;s.moments.push({id:s.nextId++,key:'test',kind:'childhood',person:id,actor:w.characterId!,created:w.day,status:'pending',choice:null});const c={type:'familyLife',action:'resolve',id:s.moments[0].id,choice:'encourage'} as const;expect(familyCommandReason(w,c)).toBe('');actFamily(w,c);expect(w.social!.traits[id]).toContain('gregarious');expect(()=>actFamily(w,c)).toThrow('已处理');expect(parseWorld(serializeWorld(w))).toEqual(w);});
});

it('stores monthly conception once and produces the same inherited child after loading',()=>{
 const w=setup();actFamily(w,{type:'familyLife',action:'plan',trying:true,family:'gao'});
 // Select a deterministic conception draw, never a render-time draw.
 let seed=0;while(((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296>=.18)seed++;
 w.householdLife!.seed=seed;w.day=nextMonthStart(w.day);advanceHouseholdLife(w);
 expect(w.householdLife!.pregnancies).toHaveLength(1);const saved=parseWorld(serializeWorld(w)),p=w.householdLife!.pregnancies[0];
 advanceHouseholdLife(w);expect(w.householdLife!.pregnancies).toHaveLength(1);
 w.day=p.due;saved.day=p.due;deliverChild(w,p);deliverChild(saved,saved.householdLife!.pregnancies[0]);
 expect(w.generatedPeople).toEqual(saved.generatedPeople);expect(w.identities).toEqual(saved.identities);expect(w.householdLife!.seed).toBe(saved.householdLife!.seed);
});

it('does not grant monthly private reserve income to a generated infant',async()=>{
 const {w,id}=birth();const {advanceRelationships}=await import('./relationships');w.day=nextMonthStart(w.day);advanceRelationships(w);expect(w.relationships!.reserves[id]).toBe(0);
});

it('allows a minor heir to study through a living family guardian without adult powers',async()=>{
 const {w,id}=birth();act(w,{type:'heir',target:id});die(w,'gao-cheng','age');w.day+=365*6+2;w.people[0].coins=1000;
 const {familyGuardian}=await import('./householdLife'),{allPeople}=await import('./personRegistry'),{householdReason}=await import('./householdPlans');expect(familyGuardian(w,id)).not.toBeNull();
 const teacher=allPeople(w).find(p=>!householdReason(w,{type:'household',action:'educate',target:id,teacher:p.id,skill:'stewardship'}));expect(teacher).toBeDefined();
 act(w,{type:'household',action:'educate',target:id,teacher:teacher!.id,skill:'stewardship'});expect(w.householdPlans!.tuition.at(-1)?.student).toBe(id);
 expect(()=>act(w,{type:'household',action:'loan',target:teacher!.id})).toThrow('未满');
});

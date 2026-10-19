import {actCivilAftermath,civilSettlements} from './civilAftermath';
import {syncRulerHistory} from './rulerHistory';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {civilWar,advanceCivilPolitics,settleCivilWar} from './civilWars';
import {civilStanceQuote,actCivilPolitics,advanceCivilMobilization,civilStanceEvaluation,civilArmyObserving} from './civilMobilization';
import {civilPromiseOptions,civilCommitments,advanceCivilPromises,civilPledgeReason} from './civilPromises';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {ensureArmyOrganization} from './armyOrganization';
import {ensureFiscal,fiscalPath} from './treasury';
import {changeRelationOpinion} from './relationships';
import {allegianceRealm} from './officeEligibility';
import {parseWorld,serializeWorld,validateWorld} from './save';
import {delegatedArmyDecision} from './militaryAI';
import {awardInfluence,personInfluence} from './personalInfluence';
import {governmentOf} from './government';
import type {World} from './types';
import type {War} from './wars';

function fixture(){
 const w=newCampaignWorld('xiao-yi',undefined,'sandbox'),site=w.people[0].location;
 setLocalHolder(w,countyTerritory(site),'liang','xiao-yi');w.realm!.cities[site].grain=500;w.realm!.influence=400;w.people[0].coins=500;
 const account=fiscalPath(w,site)[0];ensureFiscal(w)!.balances[account]=300;
 w.realm!.armies.push({realm:'liang',location:site,troops:400,morale:80,supply:120,journey:null,siege:0,payer:account});ensureArmyOrganization(w);
 const a=w.realm!.armies.at(-1)!;w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]='xiao-yi';w.mobility!.residences['xiao-yi']={site,journey:null};
 act(w,{type:'civilWar',action:'rise',name:'讨奸',arrangement:{goal:'executive',sponsor:'xiao-yi',beneficiary:'xiao-yan',executive:'xiao-yi',name:''}});
 const war=civilWar(w,'liang')!,entry=Object.entries(w.realm!.cities).find(([id,c])=>id!==site&&c.owner==='liang'&&c.controller==='liang'&&c.governor&&!['xiao-yan','xiao-gang'].includes(c.governor));
 if(!entry)throw new Error('Missing real county official fixture');
 const [county,city]=entry,person=city.governor!;
 w.mobility!.residences[person]={site:county,journey:null};
 war.civil!.mobilization!.members[person]??={choice:'pending',day:w.day,checked:w.day,due:w.day+15};
 return {w,war,site,county,person};
}
function choose(w:World,war:War,id:string,choice:'loyal'|'rebel'|'watch'){
 const live=civilWar(w,war.defender)!,q=civilStanceQuote(w,live,id,choice);expect(q.reason).toBe('');actCivilPolitics(w,{type:'civilWar',action:'stance',war:live.id!,choice,revision:q.revision},id);return civilWar(w,war.defender)!;
}
const coins=(w:World)=>Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)+Object.values(w.realm!.fiscal!.balances).reduce((n,c)=>n+c,0);
function roundtrip(w:World){validateWorld(w);expect(parseWorld(serializeWorld(w))).toEqual(w);}

describe('national civil-war mobilization',()=>{
 it('opens once at political uprising and preserves same-day state and save roundtrips',()=>{
  const {w,war}=fixture();expect(war.civil!.mobilization).toMatchObject({version:1,source:'political',opened:0});
  const before=structuredClone(w);advanceCivilMobilization(w);expect(w).toEqual(before);roundtrip(w);
 });
 it('a county official joins with the real county and remaining public funds, without transferring the whole district',()=>{
  const {w,war,person,county}=fixture(),before=coins(w),population=w.realm!.cities[county].population,grain=w.realm!.cities[county].grain,third=Object.keys(w.realm!.cities).find(id=>w.realm!.cities[id].owner==='west')!;
  const west=structuredClone(w.realm!.cities[third]);choose(w,war,person,'rebel');
  expect(allegianceRealm(w,person)).toBe(war.attacker);expect(w.realm!.cities[county]).toMatchObject({owner:'liang',controller:war.attacker,governor:person,population,grain});expect(coins(w)).toBe(before);expect(w.realm!.cities[third]).toEqual(west);roundtrip(w);
 });
 it('institutional troops resist while real followers split with their stores, debt and remainder',()=>{
  const {w,war,person,county}=fixture();w.realm!.armies.push({realm:'liang',location:county,troops:500,morale:80,supply:101,arrears:31,foodRemainder:17,journey:null,siege:0});ensureArmyOrganization(w);
  const a=w.realm!.armies.at(-1)!;a.regiments=[{...a.regiments![0],id:a.id+':1',troops:300,loyalTo:person,commanderLoyalty:90,institution:30},{...a.regiments![0],id:a.id+':2',troops:200,institution:95}];w.mobility!.armyCommanders![a.id!]=person;
  const total=w.realm!.armies.reduce((n,a)=>n+a.troops,0),before=coins(w),other=w.realm!.armies.filter(b=>b!==a).map(b=>b.id!);choose(w,war,person,'rebel');
  const units=w.realm!.armies.filter(b=>!other.includes(b.id!));expect(units.map(b=>b.troops).sort()).toEqual([200,300]);expect(units.reduce((n,b)=>n+b.supply,0)).toBe(101);expect(units.reduce((n,b)=>n+(b.arrears??0),0)).toBe(31);expect(units.reduce((n,b)=>n+(b.foodRemainder??0),0)).toBe(17);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(total);expect(coins(w)).toBe(before);roundtrip(w);
 });
 it('resisting garrisons keep the city, while the official may personally join without free forces',()=>{
  const {w,war,person,county}=fixture();w.realm!.armies.push({realm:'liang',location:county,troops:500,morale:80,supply:100,journey:null,siege:0});ensureArmyOrganization(w);
  const q=civilStanceQuote(w,war,person,'rebel');expect(q.transfer?.cities).not.toContain(county);expect(q.transfer?.troops).toBe(0);choose(w,war,person,'rebel');expect(w.realm!.cities[county].controller).toBe('liang');expect(w.realm!.cities[county].governor).toBeNull();expect(allegianceRealm(w,person)).toBe(war.attacker);roundtrip(w);
 });
 it('rejects stale and repeated commands before any resource or allegiance mutation',()=>{
  const {w,war,person,county}=fixture(),q=civilStanceQuote(w,war,person,'rebel');w.realm!.cities[county].grain++;
  const before=structuredClone(w);expect(()=>actCivilPolitics(w,{type:'civilWar',action:'stance',war:war.id!,choice:'rebel',revision:q.revision},person)).toThrow('变化');
  const done=structuredClone(w);expect(()=>actCivilPolitics(w,{type:'civilWar',action:'stance',war:war.id!,choice:'rebel',revision:q.revision},person)).toThrow();expect(w).toEqual(done);expect(coins(w)).toBe(coins(before));
 });
 it('blocks stale asset plans and does not reclaim a county captured by a third country',()=>{
  const {w,war,person,county}=fixture(),q=civilStanceQuote(w,war,person,'rebel');w.realm!.cities[county].controller='west';w.realm!.cities[county].governor=null;
  const before=structuredClone(w);expect(()=>actCivilPolitics(w,{type:'civilWar',action:'stance',war:war.id!,choice:'rebel',revision:q.revision},person)).toThrow('变化');expect(w).toEqual(before);
 });
 it('watching is consumed by army AI while leaving real allegiance and enemy hostility intact',()=>{
  const {w,war,person,county}=fixture();w.realm!.armies.push({realm:'liang',owner:person,location:county,troops:400,morale:80,supply:200,journey:null,siege:0,automation:'delegated'});ensureArmyOrganization(w);const id=w.realm!.armies.at(-1)!.id!;
  choose(w,war,person,'watch');const a=w.realm!.armies.find(a=>a.id===id)!;expect(civilArmyObserving(w,war,a)).toBe(true);expect(delegatedArmyDecision(w,a)).toMatchObject({intent:'观望守土'});expect(delegatedArmyDecision(w,a).route).toBeUndefined();expect(allegianceRealm(w,person)).toBe('liang');expect(w.realm!.cities[county].controller).toBe('liang');roundtrip(w);
 });
 it('NPCs decide to watch before the same day army AI can send them to a civil-war front',()=>{
  const {w,war,person,county}=fixture();governmentOf(w,'liang')!.legitimacy=20;w.realm!.armies.push({realm:'liang',owner:person,location:county,troops:400,morale:80,supply:200,journey:null,siege:0,automation:'delegated'});ensureArmyOrganization(w);const id=w.realm!.armies.at(-1)!.id!;
  advance(w);expect(civilWar(w,'liang')!.civil!.mobilization!.members[person].choice).toBe('watch');expect(w.realm!.armies.find(a=>a.id===id)!.journey).toBeNull();expect(war.id).toBe(1);roundtrip(w);
 });
 it('player timeout means watching; no allegiance change, spending, teleport or automatic command',()=>{
  const {w,war,person}=fixture();w.characterId=person;for(const [id,m] of Object.entries(war.civil!.mobilization!.members))if(id!==person)m.choice=allegianceRealm(w,id)===war.attacker?'rebel':'loyal';
  const before=coins(w),army=w.realm!.armies.map(a=>a.id);w.day=15;advanceCivilMobilization(w);expect(civilWar(w,'liang')!.civil!.mobilization!.members[person].choice).toBe('watch');expect(allegianceRealm(w,person)).toBe('liang');expect(coins(w)).toBe(before);expect(w.realm!.armies.map(a=>a.id)).toEqual(army);
 });
 it('keeps political representatives on their own side and applies sixty-day defection cooldown',()=>{
  const {w,war,person}=fixture();expect(civilStanceQuote(w,war,'xiao-yi','watch').reason).toContain('政治代表');choose(w,war,person,'rebel');let live=civilWar(w,'liang')!;expect(civilStanceQuote(w,live,person,'loyal').reason).toContain('60');choose(w,live,person,'watch');live=civilWar(w,'liang')!;expect(civilStanceQuote(w,live,person,'loyal').reason).toContain('60');w.day=60;expect(civilStanceQuote(w,live,person,'loyal').reason).toBe('');choose(w,live,person,'loyal');expect(allegianceRealm(w,person)).toBe('liang');roundtrip(w);
 });
 it('records unavailability without reopening or removing prior responses',()=>{
  const {w,war,person}=fixture();war.civil!.responses={[person]:{choice:'wait',day:0}};w.custody!.records[person]={person,captor:'liang',site:person===w.characterId?w.people[0].location:w.mobility!.residences[person].site,cause:'city',source:'test',origin:'liang',since:0,treatment:'house',war:war.id,side:'defend'} as never;
  w.day=1;advanceCivilMobilization(w);expect(civilWar(w,'liang')!.civil!.mobilization!.members[person].unavailable).toContain('拘押');expect(civilWar(w,'liang')!.civil!.responses).toEqual({[person]:{choice:'wait',day:0}});
 });
 it('explains NPC choices from bounded live factors, without treating the score as saved resources',()=>{
  const {w,war,person}=fixture(),before=structuredClone(w);const q=civilStanceEvaluation(w,war,person);expect(q.score).toBeGreaterThanOrEqual(-100);expect(q.score).toBeLessThanOrEqual(100);expect(q.parts.reduce((n,p)=>n+p.value,0)).toBe(q.score);expect(w).toEqual(before);
 });
 it('performs only due NPC reassessments and handles the same day idempotently',()=>{
  const {w,war,person}=fixture();changeRelationOpinion(w,person,'xiao-yi',-200);changeRelationOpinion(w,person,'xiao-yan',200);w.day=1;advanceCivilMobilization(w);expect(civilWar(w,'liang')!.civil!.mobilization!.members[person].choice).not.toBe('pending');const before=structuredClone(w);advanceCivilMobilization(w);expect(w).toEqual(before);expect(war.id).toBe(1);
 });
 it('restores old active wars once without remapping military wait to political neutrality',()=>{
  const {w,war,person}=fixture();delete war.civil!.mobilization;war.civil!.responses={[person]:{choice:'wait',day:0}};const before=coins(w),s=serializeWorld(w),loaded=parseWorld(s);expect(civilWar(loaded,'liang')!.civil!.mobilization!.members[person].choice).toBe('pending');expect(coins(loaded)).toBe(before);expect(parseWorld(serializeWorld(loaded))).toEqual(loaded);
 });
 it('rejects malformed mobilization and promise metadata',()=>{
  const {w,war}=fixture();war.civil!.mobilization!.lastDay=1;expect(()=>validateWorld(w)).toThrow();
 });
 it('reassesses a watching NPC on a real change in war advantage without waiting for another month',()=>{
  const {w,war,person,county}=fixture();choose(w,war,person,'watch');changeRelationOpinion(w,person,'xiao-yi',200);changeRelationOpinion(w,person,'xiao-yan',-200);governmentOf(w,'liang')!.legitimacy=20;
  w.realm!.armies.push({realm:war.attacker,location:county,troops:1500,morale:80,supply:200,journey:null,siege:0});ensureArmyOrganization(w);civilWar(w,'liang')!.score=80;w.day=1;advanceCivilMobilization(w);expect(allegianceRealm(w,person)).toBe(war.attacker);expect(civilWar(w,'liang')!.civil!.mobilization!.members[person].choice).toBe('rebel');
 });
 it('army-capacity restrictions exclude blocked regiments instead of creating free slots or troops',()=>{
  const {w,war,person,county}=fixture();for(let i=0;i<16;i++)w.realm!.armies.push({realm:war.attacker,location:war.civil!.base,troops:100,morale:80,supply:50,journey:null,siege:0});w.realm!.armies.push({realm:'liang',owner:person,location:county,troops:300,morale:80,supply:50,journey:null,siege:0});ensureArmyOrganization(w);
  const before=w.realm!.armies.reduce((n,a)=>n+a.troops,0),q=civilStanceQuote(w,war,person,'rebel');expect(q.transfer?.armies).toEqual([]);expect(q.transfer?.blocked.some(p=>p.reason.includes('编制已满'))).toBe(true);choose(w,war,person,'rebel');expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(before);expect(w.realm!.cities[county].controller).toBe('liang');
 });
 it('the remaining district account is divided only from its current balance on later responses',()=>{
  const {w,war,person}=fixture(),before=coins(w);choose(w,war,person,'rebel');const second=Object.entries(w.realm!.cities).find(([,c])=>c.owner==='liang'&&c.controller==='liang'&&c.governor&&!['xiao-yan','xiao-gang'].includes(c.governor));expect(second).toBeDefined();const [site,c]=second!,id=c.governor!,live=civilWar(w,'liang')!;w.mobility!.residences[id]={site,journey:null};live.civil!.mobilization!.members[id]??={choice:'pending',day:0,checked:0,due:15};choose(w,live,id,'rebel');expect(coins(w)).toBe(before);roundtrip(w);
 });
});

describe('civil-war persuasion and binding promises',()=>{
 it('spends the actual chief influence once and leaves a player target to choose independently',()=>{
  const {w,war,person}=fixture(),before=personInfluence(w,'xiao-yi');actCivilPolitics(w,{type:'civilWar',action:'appeal',war:war.id!,person,side:'rebel'});expect(personInfluence(w,'xiao-yi')).toBe(before-10);const after=structuredClone(w);expect(()=>actCivilPolitics(w,{type:'civilWar',action:'appeal',war:war.id!,person,side:'rebel'})).toThrow('30');expect(w).toEqual(after);expect(allegianceRealm(w,person)).toBe('liang');roundtrip(w);
 });
 it('reserves a real county, activates upon response, detects later removal and preserves save validity',()=>{
  const {w,war,person,county}=fixture(),option=civilPromiseOptions(w,war,'xiao-yi',person).find(o=>o.target.kind==='county'&&o.target.id===county);expect(option).toBeDefined();
  const command={type:'civilWar',action:'pledge',war:war.id!,person,side:'rebel',...option!} as const;actCivilPolitics(w,command);expect(civilCommitments(w)[0].civil.status).toBe('offered');expect(civilPledgeReason(w,war,command,'xiao-yi')).not.toBe('');choose(w,war,person,'rebel');advanceCivilPromises(w);expect(civilCommitments(w)[0].civil.status).toBe('active');roundtrip(w);
  w.realm!.cities[county].governor=null;syncRulerHistory(w);advanceCivilPromises(w);expect(civilCommitments(w)[0]).toMatchObject({broken:true,civil:{status:'broken'}});roundtrip(w);
 });
 it('preserves a fulfilled wartime pledge through a winning reunification and closes it once',()=>{
  const {w,war,person,county}=fixture(),option=civilPromiseOptions(w,war,'xiao-yi',person).find(o=>o.target.id===county)!;actCivilPolitics(w,{type:'civilWar',action:'pledge',war:war.id!,person,side:'rebel',...option});choose(w,war,person,'rebel');const live=civilWar(w,'liang')!;settleCivilWar(w,live,'demand','rebel');const influence=personInfluence(w,'xiao-yi');actCivilAftermath(w,{type:'civilAftermath',war:live.id!,person,action:'fulfil'});expect(personInfluence(w,'xiao-yi')).toBe(influence);expect(civilSettlements(w)[0].promises![0]).toMatchObject({atEnd:'active',outcome:'kept'});advanceCivilPromises(w);expect(civilCommitments(w)[0].realm).toBe('liang');expect(civilCommitments(w)[0].civil.status).toBe('kept');const before=structuredClone(w);advanceCivilPromises(w);expect(w).toEqual(before);roundtrip(w);
 });
 it('does not allow arbitrary titles, third-country promises, or another chief influence',()=>{
  const {w,war,person}=fixture();awardInfluence(w,person,100);const before=structuredClone(w);expect(()=>actCivilPolitics(w,{type:'civilWar',action:'pledge',war:war.id!,person,side:'rebel',target:{kind:'ministry',id:'imaginary'},mode:'after'})).toThrow();expect(()=>actCivilPolitics(w,{type:'civilWar',action:'appeal',war:war.id!,person:'xiao-yi',side:'rebel'},person)).toThrow('执政者');expect(w).toEqual(before);
 });
 it('a promised vacant central office waits for victory and then becomes a dated duty, without a free appointment',()=>{
  const {w,war,person}=fixture();governmentOf(w,war.attacker)!.merit[person]=100;const option=civilPromiseOptions(w,war,'xiao-yi',person).find(o=>o.mode==='after');expect(option).toBeDefined();actCivilPolitics(w,{type:'civilWar',action:'pledge',war:war.id!,person,side:'rebel',...option!});choose(w,war,person,'rebel');advanceCivilPromises(w);expect(civilCommitments(w)[0]).toMatchObject({broken:false,civil:{status:'active',due:null}});
  const live=civilWar(w,'liang')!;settleCivilWar(w,live,'demand','rebel');advanceCivilPromises(w);expect(civilCommitments(w)[0].civil.due).toBe(30);expect(civilCommitments(w)[0].civil.status).toBe('active');w.day=30;advanceCivilPromises(w);expect(civilCommitments(w)[0].civil.status).toBe('broken');
 });
 it('military defeat still has a valid exit after national mobilization',()=>{
  const {w,war}=fixture();w.realm!.armies=w.realm!.armies.filter(a=>a.realm!==war.attacker);for(const key of Object.keys(w.mobility!.armyCommanders??{}))if(!w.realm!.armies.some(a=>a.id===Number(key)))delete w.mobility!.armyCommanders![Number(key)];for(const c of Object.values(w.realm!.cities))if(c.controller===war.attacker){c.controller='liang';c.governor=null;delete c.occupiedSince;delete c.occupiedByWar;}advanceCivilPolitics(w);expect(civilWar(w,'liang')).toBeUndefined();roundtrip(w);
 });
});

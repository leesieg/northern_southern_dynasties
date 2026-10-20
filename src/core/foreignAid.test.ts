import {syncGovernance} from './realm';
import {describe,it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {ensureArmyOrganization} from './armyOrganization';
import {ensureWars,activeWars} from './wars';
import {setLocalHolder,countyTerritory} from './localAdministration';
import {fiscalPath,ensureFiscal,localBalance} from './treasury';
import {foreignAidQuote,requestForeignAid,answerForeignAid,advanceForeignAid,foreignAidAnswerReason} from './foreignAid';
import {advanceDefections,validDefections} from './defections';
import {regionalDefense,frontReservations} from './warOpportunities';
import {governingAuthority} from './government';
import {parseWorld,serializeWorld} from './save';
import {allegianceRealm} from './officeEligibility';
import {diplomaticKey} from './diplomacy';

function threatened(){
 const w=newCampaignWorld('xiao-cha',undefined,'sandbox'),s=w.realm!;s.armies=[];
 w.people[0].location='hanzhong';w.people[0].journey=null;w.mobility!.residences['xiao-cha']={site:'hanzhong',journey:null};setLocalHolder(w,countyTerritory('hanzhong'),'liang','xiao-cha');
 ensureFiscal(w)!.balances[fiscalPath(w,'hanzhong')[0]]=500;
 s.war={attacker:'east',defender:'liang',target:'hanzhong',started:0,score:0};delete s.wars;ensureWars(w);
 s.cities.nanxiang.controller='east';s.cities.nanxiang.occupiedByWar=s.war!.id;s.cities.nanxiang.occupiedSince=0;
 for(const [realm,location,troops] of [['east','nanxiang',1500],['west','huxian',1200]] as const)s.armies.push({realm,location,troops,morale:100,supply:500,journey:null,siege:0,automation:'delegated'});
 ensureArmyOrganization(w);s.treasuries.west.coins=1000;
 syncGovernance(w);return w;
}
const cash=(w:ReturnType<typeof threatened>)=>Object.values(w.realm!.treasuries).reduce((n,t)=>n+t.coins,0)+Object.values(w.realm!.fiscal!.balances).reduce((n,v)=>n+v,0);
const request=(mode:'paid'|'tribute'|'cession')=>({type:'defection',action:'request',site:'hanzhong',target:'west',mode} as const);

describe('political requests for foreign protection',()=>{
 it('offers help despite food and public order being healthy, while refusing national submission by a county official',()=>{
  const w=threatened();expect(w.realm!.cities.hanzhong.order).toBeGreaterThan(35);expect(foreignAidQuote(w,request('paid')).reason).toBe('');expect(foreignAidQuote(w,request('cession')).reason).toBe('');expect(foreignAidQuote(w,request('tribute')).reason).toContain('全国');
 });
 it('charges the actual county once, pays the foreign treasury, joins the actual war and survives a save roundtrip',()=>{
  const w=threatened(),before=cash(w),balance=localBalance(w,'hanzhong'),foreign=w.realm!.treasuries.west.coins;requestForeignAid(w,request('paid'));const q=w.defections!.items[0];w.day=7;
  answerForeignAid(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'));
  expect(localBalance(w,'hanzhong')).toBe(balance-100);expect(w.realm!.treasuries.west.coins).toBe(foreign+100);expect(cash(w)).toBe(before);expect(activeWars(w)[0].allies?.west).toBe('defend');expect(w.realm!.cities.hanzhong.controller).toBe('liang');expect(validDefections(w)).toBe(true);expect(parseWorld(serializeWorld(w))).toEqual(w);
  expect(foreignAidAnswerReason(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'))).not.toBe('');
 });
 it('transfers only the voluntarily handed over county and officer, keeping legal ownership and population',()=>{
  const w=threatened(),population=w.realm!.cities.hanzhong.population,grain=w.realm!.cities.hanzhong.grain,neighbor=structuredClone(w.realm!.cities.nanxiang);requestForeignAid(w,request('cession'));const q=w.defections!.items[0];w.day=7;
  answerForeignAid(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'));
  expect(w.realm!.cities.hanzhong).toMatchObject({owner:'liang',controller:'west',governor:'xiao-cha',population,grain});expect(allegianceRealm(w,'xiao-cha')).toBe('west');expect(w.realm!.cities.nanxiang).toEqual(neighbor);expect(w.realm!.treasuries.west.coins).toBe(900);expect(activeWars(w).some(v=>v.attacker==='west'&&v.defender==='liang')).toBe(true);expect(parseWorld(serializeWorld(w))).toEqual(w);
 });
 it('withdraws when the real base or applicant changes, never paying for an obsolete offer',()=>{
  const w=threatened(),before=cash(w);requestForeignAid(w,request('paid'));w.realm!.cities.hanzhong.governor=null;w.day=7;advanceForeignAid(w);expect(w.defections!.items[0].status).toBe('withdrawn');expect(cash(w)).toBe(before);
 });
 it('cannot bypass a treaty, a truce, duplicate participation or an occupied aid army',()=>{
  const w=threatened();w.realm!.truces[diplomaticKey('east','west')]=30;expect(foreignAidQuote(w,request('paid')).reason).toContain('停战');delete w.realm!.truces[diplomaticKey('east','west')];requestForeignAid(w,request('paid'));w.day=7;
  const q=w.defections!.items[0],a=w.realm!.armies.find(a=>a.realm==='west')!;a.journey={route:['huxian','changan'],durations:[3],leg:0,elapsed:0,started:7};expect(frontReservations(w,'west').has(a.id!)).toBe(true);expect(foreignAidAnswerReason(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'))).toContain('保护部队');
 });
 it('does not initiate political submissions or spend money for a player governor',()=>{
  const w=threatened(),before=cash(w);w.day=31;advanceDefections(w);expect(w.defections!.items).toHaveLength(0);expect(cash(w)).toBe(before);
 });
 it('removes committed reinforcements from regional defense without removing actual soldiers',()=>{
  const w=threatened(),a=w.realm!.armies.find(a=>a.realm==='west')!,troops=a.troops,before=regionalDefense(w,'west','huxian');a.journey={route:['huxian','changan'],durations:[3],leg:0,elapsed:0,started:0};expect(regionalDefense(w,'west','huxian')).toBeLessThan(before);expect(a.troops).toBe(troops);
 });
});

it('permits a real ruler to request protection by submission without granting soldiers or ceding land',()=>{
 const w=threatened(),chief=governingAuthority(w,'liang'),before=cash(w),troops=w.realm!.armies.reduce((n,a)=>n+a.troops,0);requestForeignAid(w,request('tribute'),chief);const q=w.defections!.items[0];w.day=7;answerForeignAid(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'));
 expect(w.diplomacy!.subjects.liang).toBe('west');expect(w.realm!.cities.hanzhong.controller).toBe('liang');expect(cash(w)).toBe(before);expect(w.realm!.armies.reduce((n,a)=>n+a.troops,0)).toBe(troops);expect(parseWorld(serializeWorld(w))).toEqual(w);
});

it('autonomous threatened officials can request paid protection and AI accepts only after the real negotiation period',()=>{
 const w=threatened();w.characterId='guest-west';w.people[0].id='guest-west';w.realm!.governments!.realms.liang.support=20;w.day=31;advanceDefections(w);const q=w.defections!.items.find(q=>q.actor==='xiao-cha');expect(q?.mode).toBe('paid');expect(q?.status).toBe('pending');w.day=38;advanceDefections(w);expect(w.defections!.items.find(v=>v.id===q!.id)!.status).toBe('accepted');const before=structuredClone(w);advanceDefections(w);expect(w).toEqual(before);
});

it('splits real followers from resisting institutional regiments on a foreign handover, preserving stores and debts',()=>{
 const w=threatened();w.realm!.armies.push({realm:'liang',location:'hanzhong',troops:500,morale:90,supply:101,arrears:31,foodRemainder:17,journey:null,siege:0,payer:'central:liang'});ensureArmyOrganization(w);const a=w.realm!.armies.at(-1)!;a.regiments=[{...a.regiments![0],id:a.id+':1',troops:300,loyalTo:'xiao-cha',commanderLoyalty:90,institution:30},{...a.regiments![0],id:a.id+':2',troops:200,institution:95}];w.mobility!.armyCommanders??={};w.mobility!.armyCommanders[a.id!]='xiao-cha';
 const other=new Set(w.realm!.armies.filter(v=>v!==a).map(v=>v.id));requestForeignAid(w,request('cession'));const q=w.defections!.items[0];w.day=7;answerForeignAid(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'));
 const units=w.realm!.armies.filter(v=>!other.has(v.id));expect(units.map(v=>v.troops).sort()).toEqual([200,300]);expect(units.find(v=>v.troops===200)!.realm).toBe('liang');expect(units.find(v=>v.troops===300)!.realm).toBe('west');expect(units.reduce((n,v)=>n+v.supply,0)).toBe(101);expect(units.reduce((n,v)=>n+(v.arrears??0),0)).toBe(31);expect(units.reduce((n,v)=>n+(v.foodRemainder??0),0)).toBe(17);expect(parseWorld(serializeWorld(w))).toEqual(w);
});

it('rejects stale funding and forged metadata without a partial payment',()=>{
 const w=threatened();requestForeignAid(w,request('paid'));const q=w.defections!.items[0];w.day=7;w.realm!.fiscal!.balances[fiscalPath(w,'hanzhong')[0]]=99;const before=structuredClone(w);expect(()=>answerForeignAid(w,q,{type:'defection',action:'accept',id:q.id},governingAuthority(w,'west'))).toThrow('援费');expect(w).toEqual(before);q.war=0;expect(validDefections(w)).toBe(false);
});

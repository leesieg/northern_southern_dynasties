import type {World} from './types';
import type {RealmId} from './realm';
import type {PauseEvent} from './pauseEvents';
import {allegianceRealm} from './officeEligibility';
import {getPerson} from './personRegistry';
import {regimeName} from './government';
import {dynastyNames} from '../data/governments';

/** Event-time metadata, derived from committed regime history; never a second political state. */
export interface DynastyNotice {realm:RealmId;regime:string;previousName:string;name:string;previousRuler:string;ruler:string;rulerName:string;executives:{id:string;name:string}[];day:number;cause:'political'|'inheritance'|'civilWar'}
export function dynastySnapshot(w:World){
 const state=w.realm?.governments;
 return {versions:new Set(state?.regimes.map(v=>v.id)),rulers:new Map(Object.values(state?.realms??{}).map(g=>[g.regimeId,g.ruler])),civilWars:(w.realm?.wars??[]).filter(v=>v.civil&&v.civil.grievance===undefined&&(!v.civil.arrangement||v.civil.arrangement.goal==='dynasty')).map(v=>({id:v.id,realm:v.attacker,ruler:v.civil!.arrangement?.beneficiary??v.civil!.claimant,name:v.civil!.arrangement?.name??v.civil!.name}))};
}
export function dynastyEvents(before:ReturnType<typeof dynastySnapshot>,w:World):PauseEvent[]{
 const realm=w.characterId&&w.realm?allegianceRealm(w,w.characterId):null,state=w.realm?.governments;
 if(!realm||!state||w.realm?.annexed?.[realm])return [];
 const result:PauseEvent[]=[];
 for(const version of state.regimes){
  if(version.realm!==realm||before.versions.has(version.id)||!version.predecessor||!['political','inheritance'].includes(version.kind??''))continue;
  const previous=state.regimes.find(v=>v.id===version.predecessor);if(!previous)continue;
  const previousName=previous.name??dynastyNames[previous.dynasty]??previous.dynasty,name=version.name??regimeName(w,realm),ruler=version.ruler,rulerName=getPerson(w,ruler)?.name??ruler,previousRuler=before.rulers.get(previous.id)??previous.ruler;
  const civil=before.civilWars.some(v=>v.realm===realm&&v.ruler===ruler&&v.name===name&&!w.realm?.wars?.some(war=>war.id===v.id));
  const cause=version.kind==='inheritance'?'inheritance':civil?'civilWar':'political';
  const executives=(version.executives??w.life?.successions.find(e=>e.regimeId===version.id&&e.day===version.from)?.executives??state.realms[realm].executives).map(id=>({id,name:getPerson(w,id)?.name??id}));
  const notice:DynastyNotice={realm,regime:version.id,previousName,name,previousRuler,ruler,rulerName,executives,day:version.from,cause};
  const body=cause==='inheritance'?`${getPerson(w,previousRuler)?.name??previousRuler}身后，${rulerName}异姓承统，国号由「${previousName}」改为「${name}」。`:`${cause==='civilWar'?'内战已决，起兵方取得朝廷。':'本国权力交接已完成。'}${rulerName}居君位，国号由「${previousName}」改为「${name}」。`;
  result.push({id:'dynasty:'+version.id,kind:'dynasty',title:previousName+'去，'+name+'兴',body,person:ruler,dynasty:notice});
 }
 return result;
}

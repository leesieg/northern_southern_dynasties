import type {World} from './types';
import type {RealmId} from './realm';
import type {War} from './wars';
import {governmentOf,constitutionalExecutives,governingAuthority} from './government';
import {closeKin,spouseOf,relationOpinion} from './relationships';
import type {Detention} from './custodyState';

/** Current, living political ties; captivity does not erase the constitutional office. */
export function captiveImportance(w:World,p:Pick<Detention,'person'|'origin'>){
 const chiefs=constitutionalExecutives(w,p.origin),g=governmentOf(w,p.origin);
 if(chiefs.includes(p.person))return {value:45,label:'执政被俘'};
 if(g?.ruler===p.person)return {value:25,label:'君主被俘'};
 if(chiefs.some(id=>spouseOf(w,id)===p.person||closeKin(id,p.person)))return {value:15,label:'执政亲族被俘'};
 return {value:3,label:'将臣被俘'};
}
export function ransomWillingness(w:World,p:Detention){
 const chief=governingAuthority(w,p.origin),importance=captiveImportance(w,p);
 const parts=[{label:'救援本国人物',value:20},{label:'与执政者交情',value:chief?Math.round(relationOpinion(w,chief,p.person)/2):-40},{label:'朝廷与亲族关系',value:importance.value===45?40:importance.value===25?25:importance.value===15?30:0}];
 return {parts,total:parts.reduce((n,v)=>n+v.value,0)};
}
const side=(war:War,r:RealmId)=>r===war.attacker?'attack':r===war.defender?'defend':war.allies?.[r]??null;
export function warCaptives(w:World,war:War){
 if(war.civil||war.id===undefined)return [];
 return Object.values(w.custody?.records??{}).filter(p=>p.cause!=='arrest'&&(p.war===war.id||p.war===undefined&&(p.source.startsWith('city:'+war.id+':')||p.source.startsWith('siege:'+war.id+':')||w.militaryAftermath?.battles.some(b=>b.war===war.id&&p.source==='battle:'+b.id)))&&side(war,p.origin)&&side(war,p.captor)&&side(war,p.origin)!==side(war,p.captor)).map(p=>{const importance=captiveImportance(w,p);return {...p,...importance,score:(side(war,p.captor)==='attack'?1:-1)*importance.value};});
}
/** Capitulation still needs the court, most of the population, and defeated field forces. */
export function captiveCapitulation(w:World,winner:RealmId,loser:RealmId){
 const s=w.realm;if(!s||winner===loser||s.annexed?.[winner]||s.annexed?.[loser])return false;
 const chiefs=constitutionalExecutives(w,loser),war=s.wars?.find(v=>!v.civil&&side(v,winner)&&side(v,winner)!==side(v,loser)&&side(v,loser));
 if(!war||!chiefs.length||!chiefs.every(id=>warCaptives(w,war).some(p=>p.person===id&&p.captor===winner)))return false;
 const capital=s.identities?.[loser]?.capital??(loser==='liang'?'jiankang':loser==='east'?'ye':'changan'),cities=Object.values(s.cities).filter(c=>c.owner===loser);
 const total=cities.reduce((n,c)=>n+c.population,0),held=cities.filter(c=>c.controller===winner).reduce((n,c)=>n+c.population,0),victor=s.armies.filter(a=>a.realm===winner).reduce((n,a)=>n+a.troops,0),enemy=s.armies.filter(a=>a.realm===loser);
 return s.cities[capital]?.controller===winner&&cities.every(c=>c.controller===winner||c.controller===loser)&&total>0&&held>=total*.6&&victor>=600&&enemy.every(a=>!a.journey&&a.morale<=30)&&enemy.reduce((n,a)=>n+a.troops,0)<=victor/4&&!s.wars?.some(v=>v.civil&&v.attacker===loser);
}

import {personResidence} from '../core/residence';
import {isAlive} from '../core/lifeState';
import {siteById} from '../data/scenario';
import {allPeople,getCharacter} from '../core/personRegistry';
import {allegianceRealm} from '../core/officeEligibility';
import {RealmBadge} from './RealmBadge';
import {retinueQuote} from '../core/retinue';
import {CharacterPortrait} from './CharacterPortrait';


import { familyById } from '../data/families';
import { politicalTitle } from '../core/government';

import { relationOpinion } from '../core/relationships';
import type { World } from '../core/types';
export function CharacterDirectory({world:w,onPerson,onLocate,query,scope,onQuery:setQuery,onScope:setScope}:{world:World;onPerson:(id:string)=>void;onLocate?:(site:string)=>void;query:string;scope:string;onQuery:(value:string)=>void;onScope:(value:string)=>void}){
 const own=allPeople(w).find(p=>p.id===w.characterId);
 const ownRealm=w.characterId?allegianceRealm(w,w.characterId):undefined;
 const people=allPeople(w).filter(p=>p.name.includes(query)&&(scope==='all'||scope==='retinue'&&!retinueQuote(w,{type:'retinue',action:'recruit',person:p.id}).reason||scope==='family'&&p.family===own?.family||scope==='realm'&&!!ownRealm&&allegianceRealm(w,p.id)===ownRealm));
 return <div className="character-directory"><input className="search" aria-label="查找人物" placeholder="输入人物姓名" value={query} onChange={e=>setQuery(e.target.value)}/><div className="directory-scope" role="group" aria-label="人物范围">{[{id:'all',label:'天下'},{id:'realm',label:'同朝'},{id:'family',label:'同族'},...w.retinue?[{id:'retinue',label:'可延聘'}]:[]].map(item=><button key={item.id} aria-pressed={scope===item.id} onClick={()=>setScope(item.id)}>{item.label}</button>)}</div><p>{people.length} 人</p><div className="person-directory-columns" aria-hidden="true"><span>人物</span><span>职务与交情</span><span>归属</span><span>驻地</span><span>操作</span></div><div className="person-directory-list">{people.map(p=>{const at=personResidence(w,p.id),realm=allegianceRealm(w,p.id);return <article className="person-directory-entry" key={p.id}><div className="directory-person-name"><span className="directory-portrait"><CharacterPortrait characterId={p.id} name={p.name} world={w} compact/></span><span><strong>{p.name}{p.id===w.characterId?' · 你':''}</strong><small>{familyById[p.family]?.name??''}</small></span></div><div><strong>{getCharacter(w,p.id)?politicalTitle(w,p.id):p.adult?'成年':'年少'}</strong><small>{w.characterId&&p.id!==w.characterId?'对你好感 '+relationOpinion(w,w.characterId,p.id):'本人'}</small></div><div>{realm&&<RealmBadge realm={realm} world={w}/>}</div><div><span>{siteById[at.site]?.name??'驻地未详'}</span>{at.traveling&&<small>行旅中 · 出发地</small>}</div><div className="directory-row-actions"><button aria-label={'查看'+p.name} onClick={()=>onPerson(p.id)}>查看</button>{onLocate&&<button aria-label={'定位'+p.name+'驻地'} disabled={!siteById[at.site]||!isAlive(w,p.id)} onClick={()=>onLocate(at.site)}>定位</button>}</div></article>;})}</div>{!people.length&&<p>未找到人物，请更换姓名或范围。</p>}</div>;
}

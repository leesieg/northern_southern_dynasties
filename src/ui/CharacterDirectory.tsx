import {allegianceRealm} from '../core/officeEligibility';
import {RealmBadge} from './RealmBadge';
import {retinueQuote} from '../core/retinue';
import {CharacterPortrait} from './CharacterPortrait';
import {DetailTabs} from './DetailTabs';
import { useState } from 'react';
import { relationshipPeople } from '../data/relationships';
import { familyById } from '../data/families';
import { politicalTitle } from '../core/government';
import { characterById } from '../data/characters';
import { relationOpinion } from '../core/relationships';
import type { World } from '../core/types';
export function CharacterDirectory({world:w,onPerson}:{world:World;onPerson:(id:string)=>void}){
 const [query,setQuery]=useState(''),[scope,setScope]=useState('all');
 const own=relationshipPeople.find(p=>p.id===w.characterId);
 const ownRealm=w.characterId?allegianceRealm(w,w.characterId):undefined;
 const people=relationshipPeople.filter(p=>p.name.includes(query)&&(scope==='all'||scope==='retinue'&&!retinueQuote(w,{type:'retinue',action:'recruit',person:p.id}).reason||scope==='family'&&p.family===own?.family||scope==='realm'&&!!ownRealm&&allegianceRealm(w,p.id)===ownRealm));
 return <div className="character-directory"><input className="search" aria-label="查找人物" placeholder="输入人物姓名" value={query} onChange={e=>setQuery(e.target.value)}/><DetailTabs label="人物范围" value={scope} onChange={setScope} items={[{id:'all',label:'天下',icon:'world'},{id:'realm',label:'同朝',icon:'influence'},{id:'family',label:'同族',icon:'renown'},...w.retinue?[{id:'retinue',label:'可延聘',icon:'person' as const}]:[]]}/><p>{people.length} 人</p><div className="person-directory-list">{people.map(p=><article className="person-directory-entry" key={p.id}><button onClick={()=>onPerson(p.id)}><span className="directory-portrait"><CharacterPortrait characterId={p.id} name={p.name} world={w} compact/></span><span><strong>{p.name}{p.id===w.characterId?' · 你':''}</strong><span>{familyById[p.family]?.name??(p.status==='fictional'?'架空':'')}</span><small>{characterById[p.id]?politicalTitle(w,p.id):p.adult?'成年':'年少'}{w.characterId&&p.id!==w.characterId?' · 对你好感 '+relationOpinion(w,w.characterId,p.id):''} →</small></span></button>{allegianceRealm(w,p.id)&&<RealmBadge realm={allegianceRealm(w,p.id)!} world={w}/>}</article>)}</div>{!people.length&&<p>未找到人物，请更换姓名或范围。</p>}</div>;
}

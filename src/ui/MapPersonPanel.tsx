import {PersonAbilities} from './PersonAbilities';
import {isSovereign} from '../core/officialDuties';
import {RetinuePanel,RetinueRecruit} from './RetinuePanel';
import {ClanBadge} from './ClanRanking';
import {ActivityProgress} from './MobilityPanel';
import {personResidence} from '../core/residence';
import {DetailTabs} from './DetailTabs';
import {ServiceProfile} from './ServicePanel';
import {LifeSummary,LifeDetails} from './LifeDetails';
import {isDeceased} from '../core/lifeState';
import { OpinionDetails } from './OpinionDetails';
import { diplomaticQuote } from '../core/diplomacy';
import { playerRealm } from '../core/realm';
import type { RealmId } from '../core/realm';
import { useState } from 'react';
import {PersonConnections,PersonDomains} from './PersonConnections';
import { RelationshipPanel } from './RelationshipPanel';
import { relationshipPersonById } from '../data/relationships';
import { OfficeHierarchy } from './OfficeHierarchy';
import { regimeName,politicalTitle } from '../core/government';
import { FamilyPanel,FamilyCrest } from './FamilyPanel';
import { familyById,familyPersonById } from '../data/families';
import { characterById } from '../data/characters';
import { siteById } from '../data/scenario';
import { traitsFor } from '../core/social';
import { remainingDays } from '../core/world';
import { provisionCost } from '../core/construction';
import type { World,GameCommand } from '../core/types';
import { CharacterPortrait } from './CharacterPortrait';
import { TraitBadge,Resource,ArtIcon } from './ArtIcon';
import { SocialPanel } from './SocialPanel';
import './personSheet.css';
export type PersonTab='overview'|'family'|'office'|'relations'|'interaction'|'retinue';
export function MapPersonPanel({world:w,ids,tab,onTab,onPerson,onSelect,onLifestyle,onRealm,onService,onEstate,onDiplomacy,onLocate,onCity,onFind,pending,send}:{world:World;ids:string[];tab:PersonTab;onTab:(t:PersonTab)=>void;onPerson:(id:string)=>void;onSelect:(id:string)=>void;onDiplomacy:(r:RealmId)=>void;onLifestyle:()=>void;onRealm:()=>void;onService:()=>void;onEstate:()=>void;onLocate:()=>void;onCity:(id:string)=>void;onFind:()=>void;pending:boolean;send:(c:GameCommand)=>void}){
 const [familySelection,setFamilySelection]=useState<string|null>(null),[familyMode,setFamilyMode]=useState<'tree'|'legacy'>('tree');
 const raw=ids[0],id=raw==='player'?w.characterId??'player':raw,c=characterById[id],extra=relationshipPersonById[id],self=id===w.characterId||raw==='player',p=self?w.people[0]:w.people.find(p=>p.id===id),retired=w.social?.lineage.slice(0,-1).some(p=>p.id===id);
 const reference=familyPersonById[id];
 if(!c&&!p&&!extra&&!reference)return <p>未找到人物。</p>;
 const lifeId=id==='player'?'fictional':id,deceased=isDeceased(w,lifeId);
 const name=c?.name??extra?.name??reference?.name??p!.name,family=c?familyById[c.family]:reference?familyById[reference.family]:null,realm=c?.polity??extra?.realm;
 return <div className="person-sheet">
 {ids.length>1&&<nav className="person-picker-list" aria-label="此处人物">{ids.map(person=><button key={person} aria-pressed={person===raw} onClick={()=>onSelect(person)}><ArtIcon name="person" size={22}/>{characterById[person]?.name??relationshipPersonById[person]?.name??w.people.find(p=>p.id===person)?.name}</button>)}</nav>}
 <header className="person-identity"><div className="person-portrait"><CharacterPortrait characterId={self&&!c?'fictional':id} name={name} world={w}/></div><div className="person-identity-info"><span className="eyebrow">{realm?<button className="relationship-link" onClick={()=>onDiplomacy(realm)}>{regimeName(w,realm)} →</button>:reference?'族谱记载':'行旅'}{deceased?' · 已故':self?' · 你':retired?' · 退居':extra?.status==='fictional'?' · 架空':''}</span><h2>{name}</h2><LifeSummary world={w} id={lifeId}/><ClanBadge world={w} person={id}/><p>{c?politicalTitle(w,id):extra?'':reference?'史料人物':'行旅之人'}</p>{family&&<button className="person-clan" onClick={()=>onTab('family')}><FamilyCrest family={family.id} small/>{family.name} →</button>}{!self&&w.social&&extra&&<OpinionDetails world={w} actor={w.characterId!} target={id}/>}{c&&<div className="trait-strip">{traitsFor(w,id).map(t=><TraitBadge key={t} trait={t}/>)}</div>}</div></header>
 <PersonAbilities world={w} person={id}/>
 <PersonDomains world={w} person={id} onCity={onCity}/>
 <DetailTabs label="人物章节" value={tab} onChange={onTab} items={([{id:'overview',label:'总览',icon:'person'},{id:'family',label:'家族',icon:'renown'},{id:'office',label:'官职',icon:'influence'},{id:'relations',label:'关系',icon:'gregarious'},{id:'retinue',label:'幕府',icon:'influence'},{id:'interaction',label:'互动',icon:'person'}] as const).filter(({id:key})=>key==='overview'||key==='family'&&!!family||key==='office'&&!!w.realm||key==='relations'||key==='retinue'&&!isSovereign(w,id)&&!!w.retinue&&(self||Object.values(w.retinue.members).some(m=>m.host===id))||key==='interaction'&&!self&&!!extra&&!!w.social&&!retired&&!deceased)}/>

 {tab==='overview'&&<>
 <LifeDetails world={w} id={lifeId} pending={pending} send={send}/>
 <div className="person-quick-actions">{self?<><button onClick={onLifestyle}><ArtIcon name="diligent" size={26}/>生活重心 ›</button><button onClick={onEstate}><ArtIcon name="estate" size={26}/>家族庄园 ›</button></>:extra&&w.social&&<button className="primary" disabled={retired||deceased} onClick={()=>onTab('interaction')}>{deceased?'已故':retired?'已退居':'与'+name+'互动'}</button>}</div>
 {self&&w.social&&<SocialPanel world={w} pending={pending} send={send} onPerson={onPerson} section="self"/>}
 {!isDeceased(w,id)&&!self&&<p><ArtIcon name="world" size={24}/><button onClick={()=>onCity(personResidence(w,id).site)}>{siteById[personResidence(w,id).site]?.name} · {personResidence(w,id).traveling?'在途':'驻留'}</button></p>}
 {self&&<ActivityProgress world={w} send={send} pending={pending}/>}
 {self&&p&&<section className="person-travel"><h3><ArtIcon name="world" size={26}/>行踪与行囊</h3>{w.realm&&w.realm.cities[p.location].controller!==playerRealm(w)&&<div><button disabled={pending||!!diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason} onClick={()=>send({type:'diplomacy',action:'repatriate'})}>请求返国通行</button><p>{diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason||'只允许沿指定路线返回本国。'}</p></div>}<p>{siteById[p.location].name}{p.journey?' → '+siteById[p.journey.route.at(-1)!].name+' · 余 '+remainingDays(p)+' 日':' · 驻留'}</p><Resource name="coins" value={p.coins} label="盘缠" unit="钱"/><Resource name="grain" value={p.food} label="行粮" unit="日"/><div className="person-quick-actions"><button onClick={onLocate}>在地图上定位</button><button disabled={pending||!!p.journey||p.coins<provisionCost(w)} onClick={()=>send({type:'provision'})}>补给 · {provisionCost(w)} 钱 / 30 日</button></div></section>}
 {reference&&!c&&<p>{reference.description}</p>}
 {c&&<details><summary>生平</summary><p>{c.biography}</p></details>}
 </>}
 {tab==='family'&&family&&<>{self&&<DetailTabs label="家族事务" value={familyMode} onChange={setFamilyMode} items={[{id:'tree',label:'族谱',icon:'renown'},{id:'legacy',label:'世业继任',icon:'estate'}]}/>}{(!self||familyMode==='tree')&&<FamilyPanel world={w} selected={familySelection??id} onSelect={setFamilySelection} onPerson={onPerson}/>}{self&&familyMode==='legacy'&&<SocialPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}</>}
 {tab==='office'&&<><OfficeHierarchy world={w} person={id} onPerson={onPerson}/><ServiceProfile world={w} person={id} onOpen={onService}/>{self&&w.realm&&<button className="primary" onClick={onRealm}><ArtIcon name="influence" size={24}/>任职与朝廷事务 →</button>}</>}
 {tab==='relations'&&<PersonConnections key={id} world={w} person={id} onPerson={onPerson}/>}
 {tab==='retinue'&&!isSovereign(w,id)&&<RetinuePanel world={w} host={id} pending={pending} send={send} onPerson={onPerson} onFind={onFind}/>}
 {tab==='interaction'&&!self&&w.social&&extra&&!retired&&!deceased&&<><RetinueRecruit world={w} person={id} pending={pending} send={send} onPerson={onPerson}/><RelationshipPanel key={id} world={w} pending={pending} send={send} targetId={id}/></>}

 </div>;
}

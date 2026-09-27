import {PersonIdentityIcons} from './PersonIdentityIcons';
import {RealmBadge} from './RealmBadge';
import {PersonAbilities} from './PersonAbilities';
import {isSovereign} from '../core/officialDuties';
import {RetinuePanel} from './RetinuePanel';
import {clanStanding} from '../core/clans';
import {HoverHint} from './HoverHint';
import {ActivityProgress} from './MobilityPanel';
import {personResidence} from '../core/residence';
import {DetailTabs} from './DetailTabs';
import {LifeSummary,LifeDetails,TemporaryIllnessTrait} from './LifeDetails';
import {isDeceased} from '../core/lifeState';
import { OpinionDetails } from './OpinionDetails';
import { diplomaticQuote } from '../core/diplomacy';
import { playerRealm } from '../core/realm';
import type { RealmId } from '../core/realm';
import { useState } from 'react';
import {PersonConnections,PersonDomains} from './PersonConnections';
import { RelationshipPanel } from './RelationshipPanel';
import { relationshipPersonById } from '../data/relationships';
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
export type PersonTab='overview'|'family'|'relations'|'interaction'|'retinue'|'economy';
export function MapPersonPanel({world:w,ids,tab,onTab,onPerson,onSelect,onLifestyle,onEconomy,onCourtPerson,onStaff,onEstate,onDiplomacy,onLocate,onCity,onFind,pending,send}:{world:World;ids:string[];tab:PersonTab;onTab:(t:PersonTab)=>void;onPerson:(id:string)=>void;onSelect:(id:string)=>void;onDiplomacy:(r:RealmId)=>void;onLifestyle:()=>void;onEconomy:()=>void;onCourtPerson:(id:string)=>void;onStaff:()=>void;onEstate:()=>void;onLocate:()=>void;onCity:(id:string)=>void;onFind:()=>void;pending:boolean;send:(c:GameCommand)=>void}){
 const [familySelection,setFamilySelection]=useState<string|null>(null),[familyMode,setFamilyMode]=useState<'tree'|'legacy'>('tree');
 const raw=ids[0],id=raw==='player'?w.characterId??'player':raw,c=characterById[id],extra=relationshipPersonById[id],self=id===w.characterId||raw==='player',p=self?w.people[0]:w.people.find(p=>p.id===id),retired=w.social?.lineage.slice(0,-1).some(p=>p.id===id);
 const reference=familyPersonById[id];
 if(!c&&!p&&!extra&&!reference)return <p>未找到人物。</p>;
 const lifeId=id==='player'?'fictional':id,deceased=isDeceased(w,lifeId);
 const name=c?.name??extra?.name??reference?.name??p!.name,family=familyById[c?.family??reference?.family??extra?.family??''],realm=c?.polity??extra?.realm,clan=family?clanStanding(w,id):null;
 return <div className="person-sheet">
 {ids.length>1&&<nav className="person-picker-list" aria-label="此处人物">{ids.map(person=><button key={person} aria-pressed={person===raw} onClick={()=>onSelect(person)}><ArtIcon name="person" size={22}/>{characterById[person]?.name??relationshipPersonById[person]?.name??w.people.find(p=>p.id===person)?.name}</button>)}</nav>}
 <header className="person-identity"><div className="person-portrait"><CharacterPortrait characterId={self&&!c?'fictional':id} name={name} world={w}/></div><div className="person-identity-info"><span className="eyebrow">{realm?<RealmBadge realm={realm} world={w} onOpen={onDiplomacy}/>:reference?'族谱记载':'行旅'}{deceased?' · 已故':self?' · 你':retired?' · 退居':extra?.status==='fictional'?' · 架空':''}</span><div className="person-name-row"><h2>{name}</h2>{family&&<HoverHint label={family.name+'家族'} content={<><strong>{family.name}</strong>{clan?.elite&&<><p>本国世族 · 族望第 {clan.rank} 位 · 家族威望 {clan.prestige}</p><p>联姻荫望 +{clan.marriage}；求官接受度 +{clan.petition}，城邑请任功绩门槛 −{clan.merit}。</p></>}</>}><button className={'person-clan'+(clan?.elite?' is-elite':'')} aria-label={'查看'+family.name+'家族详情'} onClick={()=>onTab('family')}><FamilyCrest family={family.id} small/></button></HoverHint>}</div><LifeSummary world={w} id={lifeId}/><div className="person-symbol-row">{!deceased&&<PersonIdentityIcons world={w} person={id} onOffice={()=>onCourtPerson(id)} onLifestyle={onLifestyle}/>}{(c||extra)&&<div className="trait-strip">{traitsFor(w,id).map(t=><TraitBadge key={t} trait={t}/>)}<TemporaryIllnessTrait world={w} id={lifeId}/></div>}</div>{!self&&w.social&&extra&&<OpinionDetails world={w} actor={w.characterId!} target={id}/>}</div></header>
 <PersonAbilities world={w} person={id}/>
 <PersonDomains world={w} person={id} onCity={onCity}/>{w.realm&&<button className="person-court-entry" onClick={()=>onCourtPerson(id)}><ArtIcon name="influence" size={22}/>朝廷任职 · {name}<span aria-hidden="true">›</span></button>}
 <DetailTabs label="人物章节" value={tab} onChange={next=>next==='retinue'&&self?onStaff():onTab(next)} items={([{id:'overview',label:'总览',icon:'person'},{id:'family',label:'家族',icon:'renown'},{id:'relations',label:'关系',icon:'gregarious'},{id:'retinue',label:'幕僚',icon:'influence'},{id:'interaction',label:'互动',icon:'person'}] as const).filter(({id:key})=>key==='overview'||key==='family'&&!!family||key==='relations'||key==='retinue'&&!isSovereign(w,id)&&!!w.retinue&&(self||Object.values(w.retinue.members).some(m=>m.host===id))||key==='interaction'&&!self&&!!extra&&!!w.social&&!retired&&!deceased)}/>

 {tab==='overview'&&<>
 <LifeDetails world={w} id={lifeId} pending={pending} send={send}/>
 <div className="person-quick-actions">{self?<><button onClick={onEconomy}><ArtIcon name="coins" size={26}/>管理私财 ›</button><button onClick={onLifestyle}><ArtIcon name="diligent" size={26}/>生活重心 ›</button><button onClick={onEstate}><ArtIcon name="estate" size={26}/>家族庄园 ›</button>{w.retinue&&!isSovereign(w,id)&&<button onClick={onStaff}><ArtIcon name="person" size={26}/>管理幕僚 ›</button>}</>:extra&&w.social&&<button className="primary" disabled={retired||deceased} onClick={()=>onTab('interaction')}>{deceased?'已故':retired?'已退居':'与'+name+'互动'}</button>}</div>
 {self&&w.social&&<SocialPanel world={w} pending={pending} send={send} onPerson={onPerson} section="self"/>}
 {!isDeceased(w,id)&&!self&&<p><ArtIcon name="world" size={24}/><button onClick={()=>onCity(personResidence(w,id).site)}>{siteById[personResidence(w,id).site]?.name} · {personResidence(w,id).traveling?'在途':'驻留'}</button></p>}
 {self&&<ActivityProgress world={w} send={send} pending={pending}/>}
 {self&&p&&<section className="person-travel"><h3><ArtIcon name="world" size={26}/>行踪与行囊</h3>{w.realm&&w.realm.cities[p.location].controller!==playerRealm(w)&&<div><button disabled={pending||!!diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason} onClick={()=>send({type:'diplomacy',action:'repatriate'})}>请求返国通行</button><p>{diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason||'只允许沿指定路线返回本国。'}</p></div>}<p>{siteById[p.location].name}{p.journey?' → '+siteById[p.journey.route.at(-1)!].name+' · 余 '+remainingDays(p)+' 日':' · 驻留'}</p><Resource name="coins" value={p.coins} label="盘缠" unit="钱"/><Resource name="grain" value={p.food} label="行粮" unit="日"/><div className="person-quick-actions"><button onClick={onLocate}>在地图上定位</button><button disabled={pending||!!p.journey||p.coins<provisionCost(w)} onClick={()=>send({type:'provision'})}>补给 · {provisionCost(w)} 钱 / 30 日</button></div></section>}
 {reference&&!c&&<p>{reference.description}</p>}
 {c&&<section className="detail-record-group"><h4>生平</h4><p>{c.biography}</p></section>}
 </>}
 {tab==='family'&&family&&<>{self&&<DetailTabs label="家族事务" value={familyMode} onChange={setFamilyMode} items={[{id:'tree',label:'族谱',icon:'renown'},{id:'legacy',label:'世业继任',icon:'estate'}]}/>}{(!self||familyMode==='tree')&&<FamilyPanel world={w} selected={familySelection??id} onSelect={setFamilySelection} onPerson={onPerson}/>}{self&&familyMode==='legacy'&&<SocialPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}</>}

 {tab==='economy'&&self&&w.realm&&<button onClick={onEconomy}><ArtIcon name="coins"/>管理私财 →</button>}
 {tab==='relations'&&<PersonConnections key={id} world={w} person={id} onPerson={onPerson}/>}
 {tab==='retinue'&&!isSovereign(w,id)&&(self?<button className="primary" onClick={onStaff}>打开幕僚 · 安排幕职 →</button>:<RetinuePanel onInteract={target=>{onPerson(target);onTab('interaction');}} world={w} host={id} pending={pending} send={send} onPerson={onPerson} onFind={onFind}/>) }
 {tab==='interaction'&&!self&&w.social&&extra&&!retired&&!deceased&&<><RelationshipPanel key={id} world={w} pending={pending} send={send} targetId={id}/></>}

 </div>;
}

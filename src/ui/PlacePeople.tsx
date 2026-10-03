import {getCharacter} from '../core/personRegistry';
import {ageLabel} from '../core/lifeState';
import type { World } from '../core/types';
import { residentsAt } from '../core/placePeople';
import { politicalTitle } from '../core/government';
import {familyName} from '../data/characters';
import { siteById } from '../data/scenario';
import { CharacterPortrait } from './CharacterPortrait';
import { ArtIcon } from './ArtIcon';
import './placePeople.css';

export function PlacePeople({world,sites,onPerson,onEstate}:{world:World;sites:string[];onPerson:(id:string)=>void;onEstate:()=>void}){
 const people=residentsAt(world,sites),estate=world.holdings.estate;
 return <section className="place-people" aria-label="此地人物与庄园">
 {sites.includes(estate.location)&&<section className="place-estate-section" aria-label="家族庄园"><h3>家族庄园</h3><button className="place-estate-link place-people-card" onClick={onEstate} aria-label={'查看'+familyName(estate.family)+'氏庄园'}><span className="place-estate-art"><ArtIcon name="estate" size={54}/></span><span className="place-estate-info"><strong>{familyName(estate.family)}氏庄园</strong><span className="place-card-meta"><span>主宅 {estate.levels.hall} 级</span><span>{siteById[estate.location].name}</span></span><small>{estate.project?'营建中 · 余 '+Math.max(0,estate.project.due-world.day)+' 日':'管理家产与营建'}</small></span><span className="place-card-arrow" aria-hidden="true">›</span></button></section>}
 <section className="place-residents-section" aria-label="驻留人物"><h3>{sites.length>1?'辖区人物':'驻留人物'} <small>{people.length} 人</small></h3>
 <div className="place-resident-list">{people.map(p=>{const title=getCharacter(world,p.id)!?politicalTitle(world,p.id):'行旅之人';return <button className={'place-people-card'+(p.self?' is-player':'')} key={p.id} onClick={()=>onPerson(p.id)} aria-label={'查看'+p.name+'详情'}><span className="place-resident-portrait"><CharacterPortrait characterId={p.self&&!getCharacter(world,p.id)!?'fictional':p.id} name={p.name} world={world} compact/></span><span className="place-resident-info"><span className="place-card-name"><strong>{p.name}</strong>{p.self&&<small className="place-self-badge">你</small>}<small className="place-person-age">{ageLabel(world,p.id==='player'?'fictional':p.id)}</small></span><span className="place-person-title" title={title}>{title}</span><span className="place-card-meta"><ArtIcon name="city" size={16}/><span>{siteById[p.site].name} · 驻留</span></span></span><span className="place-card-arrow" aria-hidden="true">›</span></button>;})}</div>
 {!people.length&&<p className="place-residents-empty">此地暂无驻留人物。</p>}
 </section></section>;
}

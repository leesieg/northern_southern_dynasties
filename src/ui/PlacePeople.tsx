import {allEstates} from '../core/estates';
import {getPerson} from '../core/personRegistry';
import {getCharacter} from '../core/personRegistry';
import {ageLabel} from '../core/lifeState';
import type { World } from '../core/types';
import { residentsAt } from '../core/placePeople';
import { politicalTitle } from '../core/government';
import {estateName} from '../core/construction';
import { siteById } from '../data/scenario';
import { CharacterPortrait } from './CharacterPortrait';
import { ArtIcon } from './ArtIcon';
import './placePeople.css';

export function PlacePeople({world,sites,onPerson,onEstate}:{world:World;sites:string[];onPerson:(id:string)=>void;onEstate:(id?:string)=>void}){
 const people=residentsAt(world,sites),estates=allEstates(world).filter(e=>sites.includes(e.location)&&e.disposed===undefined);
 return <section className="place-people" aria-label="此地人物与庄园">
 {estates.length>0&&<section className="place-estate-section" aria-label="本地庄园"><h3>本地庄园</h3>{estates.map(estate=><button key={estate.id} className="place-estate-link place-people-card" onClick={()=>onEstate(estate.id)} aria-label={'查看'+estateName(estate.family)}><span className="place-estate-art"><ArtIcon name="estate" size={54}/></span><span className="place-estate-info"><strong>{estateName(estate.family)}</strong><span className="place-card-meta"><span>{getPerson(world,estate.owner)?.name}</span><span>{estate.population} 庄户</span></span><small>{estate.project?'营建中 · 余 '+Math.max(0,estate.project.due-world.day)+' 日':siteById[estate.location].name}</small></span><span className="place-card-arrow" aria-hidden="true">›</span></button>)}</section>}
 <section className="place-residents-section" aria-label="驻留人物"><h3>{sites.length>1?'辖区人物':'驻留人物'} <small>{people.length} 人</small></h3>
 <div className="place-resident-list">{people.map(p=>{const title=getCharacter(world,p.id)!?politicalTitle(world,p.id):'行旅之人';return <button className={'place-people-card'+(p.self?' is-player':'')} key={p.id} onClick={()=>onPerson(p.id)} aria-label={'查看'+p.name+'详情'}><span className="place-resident-portrait"><CharacterPortrait characterId={p.self&&!getCharacter(world,p.id)!?'fictional':p.id} name={p.name} world={world} compact/></span><span className="place-resident-info"><span className="place-card-name"><strong>{p.name}</strong>{p.self&&<small className="place-self-badge">你</small>}<small className="place-person-age">{ageLabel(world,p.id==='player'?'fictional':p.id)}</small></span><span className="place-person-title" title={title}>{title}</span><span className="place-card-meta"><ArtIcon name="city" size={16}/><span>{siteById[p.site].name} · 驻留</span></span></span><span className="place-card-arrow" aria-hidden="true">›</span></button>;})}</div>
 {!people.length&&<p className="place-residents-empty">此地暂无驻留人物。</p>}
 </section></section>;
}

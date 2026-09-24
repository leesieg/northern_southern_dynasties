import {RealmBadge} from './RealmBadge';
import type {Polity} from '../core/types';
import {ancestorsOf,levelNames} from '../data/territorialHierarchy';
import {administration,countyGroups,historySources} from '../data/administration';
import {sites,siteById} from '../data/scenario';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
export function CityDistrict({site,onTerritory,onCity}:{site:string;onTerritory:(id:string)=>void;onCity:(id:string)=>void}){
 const a=administration[site],chain=ancestorsOf('city:'+site);
 return <section className="city-district"><h3>州郡隶属 <small>546 年区划基底</small></h3><nav aria-label="行政隶属" className="district-chain">{chain.map(n=>n.level==='realm'?<div className="district-country" key={n.id}><RealmBadge realm={n.id.slice(6) as Polity}/><span>所属政权</span></div>:<button key={n.id} onClick={()=>onTerritory(n.id)} aria-current={n.site===site?'location':undefined}><ArtIcon name={n.level==='city'?'city':'influence'} size={22}/><span><small>{levelNames[n.level]}</small><strong>{n.name}</strong></span><span aria-hidden="true">›</span></button>)}</nav>{a?<><h3>同郡县治 <small>{a.prefecture}</small></h3><div className="district-counties">{[...new Set([...(countyGroups[a.group as keyof typeof countyGroups]??[]),...Object.values(administration).filter(row=>row.group===a.group).map(row=>row.county.replace(/县$/,''))])].map(name=>{const linked=sites.find(s=>administration[s.id]?.group===a.group&&administration[s.id]?.county===(/县$|城$/.test(name)?name:name+'县'));return <HoverHint key={name} label={name} content={linked?'查看'+siteById[linked.id].name:'史籍有录，城址尚未定位'}><button disabled={!linked} aria-pressed={linked?.id===site} onClick={()=>linked&&onCity(linked.id)}><ArtIcon name="city" size={26}/><span>{name}</span>{!linked&&<small>未定位</small>}</button></HoverHint>;})}</div><div className="district-evidence"><p>{a.note}</p><small>所录区划基底 · 城址近似，覆盖色块不是精确历史县界。</small><div>{a.sources.map(key=><a key={key} href={historySources[key].url} target="_blank" rel="noreferrer">{historySources[key].title} ↗</a>)}</div></div></>:<p>此城州郡隶属尚待核实。</p>}</section>;
}

import {ArtIcon,type ArtName} from './ArtIcon';
import type { Polity } from '../core/types';
import { RealmFlagButton } from './RealmFlag';
import { ancestorsOf,childrenOf,descendantSites,levelNames,territoryNodes,territoryRoots,controlEvents,type TerritoryLevel } from '../data/territorialHierarchy';
export function HierarchyExplorer({selected,level,eventId,onSelect,onLevel,onEvent}:{selected:string;level:TerritoryLevel;eventId:string|null;onSelect:(id:string)=>void;onLevel:(level:TerritoryLevel)=>void;onEvent:(id:string|null)=>void}){
  const node=territoryNodes[selected],children=childrenOf(selected),path=ancestorsOf(selected);
  return <section className="hierarchy-explorer">
    <div className="hierarchy-levels detail-tabs" aria-label="领地层级">{Object.entries(levelNames).map(([id,name])=><button key={id} aria-pressed={id===level} onClick={()=>onLevel(id as TerritoryLevel)}><ArtIcon name={(({realm:'renown',province:'world',commandery:'influence',county:'city',city:'city'} as Record<string,ArtName>)[id]??'world')} size={24}/><span>{name}</span></button>)}</div>
    <nav aria-label="行政层级路径">{path.map(n=><button key={n.id} aria-current={n.id===selected?'location':undefined} onClick={()=>onSelect(n.id)}><small>{levelNames[n.level]}</small>{n.name}<span>›</span></button>)}</nav>
    <div className="hierarchy-heading"><span>{levelNames[node.level]} · 546 年</span><h3>{node.name}</h3><p>{descendantSites(selected).length} 座城市 · 部分辖区</p></div>
    {node.parent&&<button className="hierarchy-up" onClick={()=>onSelect(node.parent!)}>↑ 返回{territoryNodes[node.parent].name}</button>}
    <div className="hierarchy-children">{children.map(child=><button key={child.id} onClick={()=>onSelect(child.id)}><span><small>{levelNames[child.level]}</small>{child.name}</span><span>{child.basis==='unresolved'?'隶属待核':child.level==='city'?'进入城市':descendantSites(child.id).length+' 城'} ›</span></button>)}</div>
    {!children.length&&<p className="hierarchy-note">已进入城市，可查看营建与行程。县是行政区域，城市是独立建设对象。</p>}
    <details className="hierarchy-realms"><summary>切换政权</summary><div className="realm-flags">{territoryRoots.map(root=><RealmFlagButton key={root.id} realm={root.id.slice(6) as Polity} name={root.name} compact selected={path.some(n=>n.id===root.id)} onClick={()=>onSelect(root.id)}/>)}</div></details>
    <details className="history-events"><summary>城市沿革</summary><p>查看沿革只在地图上标记对应城市，不改变本局局势。记录尚不完整。</p><button aria-pressed={!eventId} onClick={()=>onEvent(null)}>退出沿革查看</button>{controlEvents.map(event=><div key={event.id}><button aria-pressed={eventId===event.id} onClick={()=>onEvent(event.id)}>{event.year} 年 · {event.label}</button><a href={event.source} target="_blank" rel="noreferrer">史料 ↗</a></div>)}</details>
    <p className="hierarchy-note">边界为辖区示意，并非完整历史疆域。</p>
  </section>;
}

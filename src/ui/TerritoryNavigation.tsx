import {ArtIcon,type ArtName} from './ArtIcon';
import {RealmBadge} from './RealmBadge';
import {ancestorsOf,childrenOf,territoryNodes} from '../data/territorialHierarchy';
import type {Polity} from '../core/types';
import type {CityTab} from './Development';

export function TerritoryTabs({tab,onTab,peopleCount,governance=true}:{tab:CityTab;onTab:(tab:CityTab)=>void;peopleCount:number;governance?:boolean}){
 return <nav className="development-tabs city-icon-tabs" aria-label="辖区操作">{([['model','城景','city'],['build','营建','estate'],['governance','政务','influence'],['people','人物','person'],['travel','出行','world'],['history','区划','influence']] as [CityTab,string,ArtName][]).filter(([id])=>governance||id!=='governance').map(([id,label,icon])=><button key={id} aria-pressed={(tab==='military'?'governance':tab)===id} onClick={()=>onTab(id)}><ArtIcon name={icon} size={26}/><span>{label}{id==='people'&&<small>{peopleCount}</small>}</span></button>)}</nav>;
}
export function TerritoryNavigation({territory,onSelect}:{territory:string;onSelect:(id:string)=>void}){
 const node=territoryNodes[territory],chain=ancestorsOf(territory).filter(n=>n.level!=='city'),current=node.level==='city'?chain.at(-1)!:node,parent=current.parent,siblings=parent?childrenOf(parent):[];
 return <div className="territory-navigation"><nav aria-label="辖区路径">{chain.map(n=>n.level==='realm'?<RealmBadge key={n.id} realm={n.id.slice(6) as Polity}/>:<button key={n.id} aria-current={n.id===current.id?'location':undefined} disabled={n.id===current.id} onClick={()=>onSelect(n.id)}><ArtIcon name={n.level==='county'?'city':'influence'} size={18}/>{n.name}</button>)}</nav>{siblings.length>1&&<nav className="territory-peers" aria-label="同级辖区">{siblings.map(n=><button key={n.id} aria-current={n.id===current.id?'location':undefined} disabled={n.id===current.id} onClick={()=>onSelect(n.id)}>{n.name}</button>)}</nav>}</div>;
}

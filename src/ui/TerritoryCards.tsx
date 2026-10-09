import {CountyArtwork} from './TerritoryArtwork';
import {childrenOf,descendantSites,territoryNodes} from '../data/territorialHierarchy';
import {siteById} from '../data/scenario';
import {localHolder,localSeatSite,localSites} from '../core/localAdministration';
import {publicBalance,territoryAccount} from '../core/treasury';
import {politicalName} from '../core/government';
import type {RealmId} from '../core/realm';
import type {World} from '../core/types';
import {ArtIcon} from './ArtIcon';
import {terrainSceneStyle} from './terrainScene';

export function TerritoryCards({world,territory,realm,onSelect}:{world:World;territory:string;realm:RealmId;onSelect:(id:string)=>void}){
 return <nav className="territory-card-strip" aria-label="直属辖区">{childrenOf(territory).map(node=>{
 const site=localSeatSite(world,node.id,realm)??descendantSites(node.id)[0],holder=localHolder(world,node.id,realm),project=world.holdings.cities[site]?.project,controlled=localSites(world,node.id,realm,true).length;
 return <button key={node.id} className="territory-image-card" onClick={()=>onSelect(node.id)} style={terrainSceneStyle(site)}>
 <span className="territory-card-art"><CountyArtwork terrain={siteById[site]?.terrain}/></span>
 <strong>{node.name}</strong><span className="territory-card-meta">{holder?politicalName(holder,world):'主官空缺'} · {territoryNodes[node.id].level==='county'?(controlled?'实控':'失守'):`实控 ${controlled} 县`}</span>
 <span className="territory-card-foot"><span><ArtIcon name="coins" size={19}/>{publicBalance(world,territoryAccount(world,realm,node.id)).toLocaleString()}</span><span>查看{node.level==='county'?'县域':'辖区'} ›</span></span>
 {project&&<small>营建中 · 余 {Math.max(0,project.due-world.day)} 日</small>}
 <span className="sr-only">治所 {siteById[site]?.name??'未录'}</span></button>;
 })}</nav>;
}

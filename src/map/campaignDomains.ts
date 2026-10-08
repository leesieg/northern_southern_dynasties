import clipping from 'polygon-clipping';
import type {FeatureCollection,MultiPolygon} from 'geojson';
import type {World,Polity} from '../core/types';
import {siteById} from '../data/scenario';
import {polityStyle,worldRealms} from '../core/polityRuntime';
import {waterMaskContains} from './campaignTerrain';
import {territories} from './territories';

/** Presentation boundary of modeled control; not a claim of complete historical borders. */
export function controlledSite(world:World,id:string){
 const realm=world.realm?.cities[id]?.controller??siteById[id]?.polity;
 return !!realm&&realm!=='frontier'&&!world.realm?.annexed?.[realm]&&worldRealms(world).includes(realm);
}
export function domainSignature(world:World){return territories.features.map(f=>{const id=String(f.properties!.id);return id+':'+(controlledSite(world,id)?world.realm?.cities[id]?.controller??siteById[id].polity:'');}).join('|');}
let cached:{signature:string;value:{realms:FeatureCollection<MultiPolygon>;fog:FeatureCollection<MultiPolygon>}}|undefined;
export function campaignDomains(world:World){
 const signature=domainSignature(world);if(cached?.signature===signature)return cached.value;
 const byRealm=new Map<Polity,clipping.MultiPolygon[]>();
 for(const f of territories.features){const id=String(f.properties!.id);if(!controlledSite(world,id))continue;const realm=world.realm?.cities[id]?.controller??siteById[id].polity;const group=byRealm.get(realm)??[];group.push(f.geometry.coordinates as clipping.MultiPolygon);byRealm.set(realm,group);}
 const realms:FeatureCollection<MultiPolygon>={type:'FeatureCollection',features:[]};
 for(const [id,parts] of byRealm){const coordinates=clipping.union(parts[0],...parts.slice(1));realms.features.push({type:'Feature',properties:{id,color:polityStyle(world,id).color},geometry:{type:'MultiPolygon',coordinates}});}
 const bounds:clipping.Polygon=[[[ -180,-85],[180,-85],[180,85],[-180,85],[-180,-85]]];
 const known=realms.features.map(f=>f.geometry.coordinates as clipping.MultiPolygon);
 const fog:FeatureCollection<MultiPolygon>={type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:known.length?clipping.difference(bounds,...known):[bounds]}}]};
 const value={realms,fog};cached={signature,value};return value;
}

export function campaignCoverage(world:World){const regions=campaignDomains(world).realms.features;return (lon:number,lat:number)=>regions.some(f=>waterMaskContains([lon,lat],f.geometry));}

import {Group} from 'three';
import type {FeatureCollection} from 'geojson';
import {createPaperMap} from '../artSample/paperMap';
import type {countrySurface} from './surface';
import {sites} from '../../data/scenario';
import {projectGround} from './geography';
/** Viewport atlas with the sample's ink/fibre renderer and live geographic sources. */
export function campaignPaper(){
 const root=new Group();let atlas:ReturnType<typeof createPaperMap>|undefined,key='',revision=0;
 return {root,invalidate(){revision++;},update(surface:Awaited<ReturnType<typeof countrySurface>>,center:{x:number;z:number},range:number,sources:Map<string,FeatureCollection>,blend:number,moving:boolean){
  root.visible=blend>.001;if(!root.visible)return;
  // Overscan and snapped bounds keep the paper fixed while panning and bound canvas work.
  const span=840*2**Math.max(0,Math.ceil(Math.log2(Math.max(840,range*3)/840))),cell=span/8,cx=Math.round(center.x/cell)*cell,cz=Math.round(center.z/cell)*cell,next=[cx,cz,span,revision].join(':');
  const channel=surface.channel();if(channel&&next!==key&&!moving){
   const territories=sources.get('territories')??{type:'FeatureCollection',features:[]},realms=sources.get('realms')??{type:'FeatureCollection',features:[]},ids=new Set(territories.features.map(f=>String(f.properties?.id)));
   const fresh=createPaperMap({measured:surface.measured,river:(x,z)=>channel.sample(x,z)?.distance??Infinity,channel,cities:sites.filter(s=>ids.has(s.id)).map(s=>({id:s.id,...projectGround(s.lon,s.lat)}))},{center:{x:cx,z:cz},span,territories,realms,land:surface.land});
   if(atlas){root.remove(atlas.root);atlas.dispose();}atlas=fresh;root.add(atlas.root);key=next;
  }
  atlas?.update(blend);
 },dispose(){atlas?.dispose();root.clear();}};
}

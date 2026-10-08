import {describe,it,expect} from 'vitest';
import {MercatorCoordinate} from 'maplibre-gl';
import {projectGround,unprojectGround,mercator,gridHeight,zoomDistance,distanceZoom,campaignHeight} from './geography';
import {sites} from '../../data/scenario';
import {evaluate} from './overlays';
import {atlasStyle} from '../atlasStyle';
import {territories} from '../territories';

describe('national Three.js geographic and interaction coordinates',()=>{
 it('preserves every authoritative settlement coordinate and the existing army Mercator convention',()=>{
  for(const site of sites){const point=projectGround(site.lon,site.lat),back=unprojectGround(point.x,point.z),old=MercatorCoordinate.fromLngLat([site.lon,site.lat]),next=mercator(site.lon,site.lat);expect(back.lng).toBeCloseTo(site.lon,10);expect(back.lat).toBeCloseTo(site.lat,10);expect(next.x).toBeCloseTo(old.x,12);expect(next.y).toBeCloseTo(old.y,12);}
 });
 it('samples real heights bilinearly, keeps missing coverage missing and separates display exaggeration',()=>{
  const data=new Float32Array([0,100,200,300]),meta={columns:2,rows:2,west:0,north:0,width:1,height:1};expect(gridHeight(data,meta,.5,.5)).toBe(150);expect(gridHeight(data,meta,-.001,.5)).toBeNull();expect(gridHeight(data,meta,0,0)).toBe(0);expect(campaignHeight(1000,0)).toBe(10);expect(campaignHeight(-10,30)).toBe(0);
 });
 it('keeps camera zoom and distance inverse across strategic and close views',()=>{for(const zoom of [2.2,3.7,4.8,6.2,8.2,11.3,12])expect(distanceZoom(zoomDistance(zoom))).toBeCloseTo(zoom,10);});
 it('evaluates actual overlay filters, selected state and zoom-dependent opacity',()=>{
  const feature=territories.features[0];
  for(const layer of atlasStyle().layers){if(!['realms','territories','hierarchy','frontiers','roads','route','selection','history-event'].includes('source' in layer?String(layer.source):''))continue;
   if('filter' in layer&&layer.filter)expect(()=>evaluate(layer.filter,feature,7,{selected:true,hover:true})).not.toThrow();
   for(const key of [layer.type+'-opacity',layer.type+'-color','line-width']){const value=(layer.paint as Record<string,unknown>|undefined)?.[key];if(value!==undefined)expect(()=>evaluate(value,feature,7,{selected:true,hover:true}),layer.id+':'+key).not.toThrow();}
  }
  expect(evaluate(['case',['boolean',['feature-state','selected'],false],.2,0],feature,7,{selected:true})).toBe(.2);
  expect(evaluate(['case',['boolean',['feature-state','selected'],false],.2,0],feature,7,{})).toBe(0);
 });
});

it('drapes and clips tactical territory fills to sampled terrain instead of floating polygon plates',async()=>{
 const {CampaignOverlays}=await import('./overlays'),{Mesh}=await import('three');
 const height=(lon:number,lat:number)=>Math.sin(lon*2)*3+Math.cos(lat*2)*3,overlay=new CampaignOverlays(height);
 const data={type:'FeatureCollection' as const,features:[{type:'Feature' as const,properties:{id:'test'},geometry:{type:'Polygon' as const,coordinates:[[[110,32],[110.2,32],[110.2,32.2],[110,32.2],[110,32]]]}}]};
 overlay.rebuild([{id:'test',type:'fill',source:'territories',paint:{'fill-color':'#667755','fill-opacity':.2}}],new Map([['territories',data]]),10,.05,new Map(),[110.05,32.05,110.15,32.15]);
 const p=(overlay.root.children[0] as InstanceType<typeof Mesh>).geometry.getAttribute('position');expect(p.count).toBeGreaterThan(6);
 for(let i=0;i<p.count;i++){const ll=unprojectGround(p.getX(i),p.getZ(i));expect(ll.lng).toBeGreaterThan(110.049);expect(ll.lng).toBeLessThan(110.151);expect(p.getY(i)).toBeCloseTo(height(ll.lng,ll.lat)+.165,3);}
 overlay.clear();expect(overlay.root.children).toHaveLength(0);
});

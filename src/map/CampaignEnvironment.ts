import {BoxGeometry,Color,CylinderGeometry,SphereGeometry,InstancedMesh,Matrix4,MeshLambertMaterial,Vector3,BufferGeometry,Float32BufferAttribute,Group} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MercatorCoordinate,type Map} from 'maplibre-gl';
import {siteById,roads} from '../data/scenario';
import {roadCoordinates} from '../core/routeGeometry';
import {campaignCityMeters} from './campaignScenery';
import {cityRoofGeometry} from '../city/architecture';

export const ENVIRONMENT_CHUNK_SIZE=.125,MAX_ENVIRONMENT_CHUNKS=48,MAX_ENVIRONMENT_INSTANCES=768;
const roadSegments=roads.filter(r=>!r.legacyOnly).flatMap(r=>{const points=roadCoordinates(r.from,r.to);return points.slice(1).map((to,i)=>({from:points[i],to}));});
export function nearCampaignRoad(lon:number,lat:number){
 const cos=Math.cos(lat*Math.PI/180);
 return roadSegments.some(({from:a,to:b})=>{
  if(lon<Math.min(a[0],b[0])-.003||lon>Math.max(a[0],b[0])+.003||lat<Math.min(a[1],b[1])-.003||lat>Math.max(a[1],b[1])+.003)return false;
  const dx=(b[0]-a[0])*cos,dy=b[1]-a[1],px=(lon-a[0])*cos,py=lat-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,(px*dx+py*dy)/d)):0;
  return Math.hypot(px-t*dx,py-t*dy)*111320<180;
 });
}
export function environmentCandidates(cx:number,cy:number){
 const rand=(i:number,salt:number)=>{let h=Math.imul(cx+9187,374761393)^Math.imul(cy+411,668265263)^Math.imul(i+salt,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
 return Array.from({length:16},(_,i)=>({lon:(cx+rand(i,3))*ENVIRONMENT_CHUNK_SIZE,lat:(cy+rand(i,7))*ENVIRONMENT_CHUNK_SIZE,size:90+rand(i,11)*90}));
}
/** Original visual vegetation and field patches. Modern vector landcover is a placement mask, not a 546 land-use reconstruction. */
export function campaignEnvironment(origin:{x:number;y:number}){
 const root=new Group(),parts:BufferGeometry[]=[];
 const trunk=new CylinderGeometry(.07,.12,1.3,7).toNonIndexed().translate(0,.65,0);
 const crowns=Array.from({length:7},(_,i)=>new SphereGeometry(i===6?.46:.38,8,5).toNonIndexed().scale(1,.8,1).translate(i===6?0:Math.cos(i*Math.PI/3)*.35,i===6?1.7:1.25+(i%3)*.12,i===6?0:Math.sin(i*Math.PI/3)*.35));
 for(const [g,color] of [[trunk,'#65533a'],...crowns.map(g=>[g,'#506749'] as const)] as const){const c=new Color(color),n=g.getAttribute('normal'),values:number[]=[];for(let i=0;i<n.count;i++){const shade=.82+.18*Math.max(0,n.getY(i));values.push(c.r*shade,c.g*shade,c.b*shade);}g.setAttribute('color',new Float32BufferAttribute(values,3));g.deleteAttribute('uv');parts.push(g);}
 const treeGeometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
 const material=new MeshLambertMaterial({vertexColors:true}),trees=new InstancedMesh(treeGeometry,material,MAX_ENVIRONMENT_INSTANCES);
 const fieldParts=[new BoxGeometry(1,.015,1),...Array.from({length:8},(_,i)=>new BoxGeometry(1,.015,.022).translate(0,.012,(i-3.5)/8))],fieldGeometry=mergeGeometries(fieldParts)!;
 fieldParts.forEach(g=>g.dispose());
 const fieldMaterial=new MeshLambertMaterial({color:'#a9a56b'}),fields=new InstancedMesh(fieldGeometry,fieldMaterial,64);
 const villageParts=[new BoxGeometry(1,.7,.8).translate(0,.35,0),cityRoofGeometry(1.3,1.1,.4,4,2).translate(0,.7,0)],villageGeometry=mergeGeometries(villageParts)!;
 villageParts.forEach(g=>g.dispose());const villageMaterial=new MeshLambertMaterial({color:'#a79a74'}),villages=new InstancedMesh(villageGeometry,villageMaterial,16);
 for(const m of [trees,fields,villages]){m.frustumCulled=false;m.count=0;}root.add(trees,fields,villages);
 const matrix=new Matrix4(),rotation=new Matrix4().makeRotationX(Math.PI/2);
 function position(at:ReturnType<typeof MercatorCoordinate.fromLngLat>,w:number,h:number,d:number){const u=at.meterInMercatorCoordinateUnits();return matrix.makeTranslation(at.x-origin.x,origin.y-at.y,at.z).multiply(rotation).scale(new Vector3(w*u,h*u,d*u));}
 function refresh(map:Map,urban:{id:string;capital:boolean}[],tilted:boolean,enabled:boolean){
  trees.count=0;fields.count=0;villages.count=0;
  if(!enabled||map.getZoom()<8.2||!map.isSourceLoaded('natural'))return;
  const bounds=map.getBounds(),center=map.getCenter(),size=ENVIRONMENT_CHUNK_SIZE,chunks:{x:number;y:number}[]=[];
  // A fixed grid and deterministic candidates: refreshing/reading a save never reseeds the scene.
  const cx=Math.floor(center.lng/size),cy=Math.floor(center.lat/size);
  for(let x=cx-4;x<=cx+4;x++)for(let y=cy-4;y<=cy+4;y++)if((x+1)*size>=bounds.getWest()&&x*size<=bounds.getEast()&&(y+1)*size>=bounds.getSouth()&&y*size<=bounds.getNorth())chunks.push({x,y});
  chunks.sort((a,b)=>(a.x-cx)**2+(a.y-cy)**2-(b.x-cx)**2-(b.y-cy)**2);
  const masks=['land-fallback','ocean','inland-water','rivers-major','rivers-minor','woodland'].filter(id=>!!map.getLayer(id));
  function land(lon:number,lat:number,forest:boolean){
   const p=map.project([lon,lat]);if(p.x<0||p.y<0||p.x>map.getCanvas().clientWidth||p.y>map.getCanvas().clientHeight)return null;
   const hits=map.queryRenderedFeatures([[p.x-2,p.y-2],[p.x+2,p.y+2]],{layers:masks});
   if(!hits.some(f=>f.layer.id==='land-fallback')||hits.some(f=>!['woodland','land-fallback'].includes(f.layer.id))||forest&&!hits.some(f=>f.layer.id==='woodland')||nearCampaignRoad(lon,lat))return null;
   const elevation=tilted?map.queryTerrainElevation({lng:lon,lat}):0;
   if(elevation===null)return null;
   const neighbor=tilted?map.queryTerrainElevation({lng:lon+.001,lat}):0;
   if(neighbor===null||Math.abs(neighbor-elevation)>35)return null;
   return MercatorCoordinate.fromLngLat([lon,lat],elevation+.5);
  }
  for(const chunk of chunks.slice(0,MAX_ENVIRONMENT_CHUNKS))for(const p of environmentCandidates(chunk.x,chunk.y)){
   if(urban.some(c=>{const s=siteById[c.id],r=campaignCityMeters(s,c.capital)/2;return Math.hypot((p.lon-s.lon)*111320*Math.cos(s.lat*Math.PI/180),(p.lat-s.lat)*111320)<r*1.25;}))continue;
   const at=land(p.lon,p.lat,true);if(!at)continue;
   const variation=(p.size-90)/90;
   trees.setMatrixAt(trees.count,position(at,p.size,p.size,p.size).multiply(new Matrix4().makeRotationY(variation*Math.PI*2)));
   trees.setColorAt(trees.count++,new Color().setRGB(.87+variation*.13,.92+variation*.08,.82+variation*.14));
  }
  if(map.getZoom()>=8.2)for(const c of urban.slice(0,4)){
   const s=siteById[c.id],span=campaignCityMeters(s,c.capital);
   for(const sign of [-1,1])for(let i=0;i<8;i++){
    const lon=s.lon+sign*span*.72/(111320*Math.cos(s.lat*Math.PI/180)),lat=s.lat+(i-3.5)*span*.075/111320,at=land(lon,lat,false);
    if(!at)continue;
    fields.setMatrixAt(fields.count++,position(at,span*.16,1,span*.065));
    if(i===1||i===6){const village=land(lon+span*.11/(111320*Math.cos(s.lat*Math.PI/180)),lat,false);if(village)villages.setMatrixAt(villages.count++,position(village,span*.026,span*.026,span*.026));}
   }
  }
  trees.instanceMatrix.needsUpdate=true;fields.instanceMatrix.needsUpdate=true;villages.instanceMatrix.needsUpdate=true;
  if(trees.instanceColor)trees.instanceColor.needsUpdate=true;
 }
 function dispose(){trees.dispose();fields.dispose();villages.dispose();treeGeometry.dispose();fieldGeometry.dispose();villageGeometry.dispose();material.dispose();fieldMaterial.dispose();villageMaterial.dispose();}
 return {root,refresh,dispose};
}

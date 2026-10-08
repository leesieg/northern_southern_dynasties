import clipping from 'polygon-clipping';
import {BufferGeometry,CanvasTexture,Color,DoubleSide,Float32BufferAttribute,Group,Mesh,MeshBasicMaterial,ShapeUtils,Vector2} from 'three';
import {createExpression} from '@maplibre/maplibre-gl-style-spec';
import type {Feature,FeatureCollection,Geometry,Position} from 'geojson';
import {projectGround,mercator,ORIGIN,WORLD_KM} from './geography';
import {waterMaskContains} from '../campaignTerrain';
export interface OverlayLayer{id:string;type:string;source?:string;minzoom?:number;maxzoom?:number;filter?:unknown;layout?:Record<string,unknown>;paint?:Record<string,unknown>;}
const expressions=new Map<string,ReturnType<typeof createExpression>>();
export function evaluate(value:unknown,feature:Feature,zoom:number,state:Record<string,unknown>={}){if(!Array.isArray(value))return value;const key=JSON.stringify(value);let compiled=expressions.get(key);if(!compiled){compiled=createExpression(value,'campaign overlay');expressions.set(key,compiled);}if(compiled.result==='error')throw new Error(compiled.value.map(e=>e.message).join('; '));return compiled.value.evaluate({zoom},{type:feature.geometry.type,properties:feature.properties??{},id:feature.id} as never,state);}
export function polygonRings(g:Geometry):Position[][][]{return g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];}
export function coverageTexture(features:FeatureCollection,width=1024){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=width;const c=canvas.getContext('2d')!;c.fillStyle='#000';c.fillRect(0,0,width,width);c.fillStyle='#fff';
 for(const f of features.features)for(const poly of polygonRings(f.geometry)){c.beginPath();for(const ring of poly)ring.forEach(([lon,lat],i)=>{const p=mercator(lon,lat),x=p.x*width,y=p.y*width;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.fill('evenodd');}
 const texture=new CanvasTexture(canvas);texture.flipY=false;return texture;
}
export class CampaignOverlays{
 readonly root=new Group();
 constructor(private height:(lon:number,lat:number)=>number|null){}
 clear(){for(const o of [...this.root.children]){const m=o as Mesh;this.root.remove(m);m.geometry.dispose();(m.material as MeshBasicMaterial).dispose();}}
 rebuild(layers:OverlayLayer[],sources:Map<string,FeatureCollection>,zoom:number,unitsPerPixel:number,states:Map<string,Record<string,unknown>>,bounds?:[number,number,number,number]){
  this.clear();let order=1;
  for(const layer of layers){if(!['realms','territories','hierarchy','frontiers','roads','route','selection','history-event'].includes(layer.source??'')||layer.layout?.visibility==='none'||zoom<(layer.minzoom??0)||zoom>(layer.maxzoom??99))continue;
   // Independent fill triangles intersect detailed relief. Near selection uses outlines only.
   if(zoom>6.2&&layer.type==='fill'&&['territory-hover','territory-selected','hierarchy-selected'].includes(layer.id))continue;
   const data=sources.get(layer.source!),paint=layer.paint??{};if(!data)continue;
   const positions:number[]=[],colors:number[]=[];
   const vertex=(p:Position,color:Color,alpha:number)=>{const xy=projectGround(p[0],p[1]);positions.push(xy.x,(this.height(p[0],p[1])??0)+.15+order*.015,xy.z);colors.push(color.r,color.g,color.b,alpha);};
   for(const f of data.features){const state=states.get(layer.source+':'+(f.id??f.properties?.id))??{};if(layer.filter&&!evaluate(layer.filter,f,zoom,state))continue;
    const opacity=Number(evaluate(paint[layer.type+'-opacity']??1,f,zoom,state));if(opacity<=.001)continue;
    const rgb=evaluate(paint[layer.type+'-color']??'#dbc992',f,zoom,state);const color=typeof rgb==='string'?new Color(rgb):rgb&&typeof rgb==='object'&&'r' in rgb?new Color().setRGB(rgb.r,rgb.g,rgb.b):new Color('#dbc992');
    if(layer.type==='fill'){
     let polygons=polygonRings(f.geometry);if(bounds&&zoom>6.2&&polygons.length){const [w,s,e,n]=bounds;polygons=clipping.intersection(polygons as clipping.MultiPolygon,[[[w,s],[e,s],[e,n],[w,n],[w,s]]]);}
     for(const poly of polygons){const rings=poly.map(r=>r.slice(0,-1).map(p=>new Vector2(p[0],-p[1])));if(!rings[0]?.length)continue;const all=poly.flatMap(r=>r.slice(0,-1));for(const tri of ShapeUtils.triangulateShape(rings[0],rings.slice(1))){
      const [a,b,c]=tri.map(i=>all[i]),xy=[a,b,c].map(p=>projectGround(p[0],p[1])),length=Math.max(...xy.map((p,i)=>Math.hypot(p.x-xy[(i+1)%3].x,p.z-xy[(i+1)%3].z))),count=zoom>6.2?Math.min(24,Math.max(1,Math.ceil(length/Math.max(2,unitsPerPixel*12)))):1;
      const point=(i:number,j:number):Position=>[a[0]+(b[0]-a[0])*i/count+(c[0]-a[0])*j/count,a[1]+(b[1]-a[1])*i/count+(c[1]-a[1])*j/count];
      for(let i=0;i<count;i++)for(let j=0;j<count-i;j++){for(const p of [point(i,j),point(i+1,j),point(i,j+1)])vertex(p,color,opacity);if(i+j<count-1)for(const p of [point(i+1,j),point(i+1,j+1),point(i,j+1)])vertex(p,color,opacity);}
     }}
    }
    else if(layer.type==='line'){
     const g=f.geometry,paths=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:polygonRings(g).flat();const width=Number(evaluate(paint['line-width']??1,f,zoom,state))*unitsPerPixel;
     for(const path of paths)for(let i=1;i<path.length;i++){const a=projectGround(path[i-1][0],path[i-1][1]),b=projectGround(path[i][0],path[i][1]),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,steps=Math.min(128,Math.max(1,Math.ceil(len/Math.max(2,unitsPerPixel*8))));
      for(let j=0;j<steps;j++){const points=[];for(const t of [j/steps,(j+1)/steps])for(const sign of [-1,1])points.push([a.x+dx*t-dz/len*width*.5*sign,a.z+dz*t+dx/len*width*.5*sign]);for(const idx of [0,2,1,1,2,3]){const [x,z]=points[idx],lon=(x/WORLD_KM+ORIGIN.x)*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*(z/WORLD_KM+ORIGIN.y))))*180/Math.PI;vertex([lon,lat],color,opacity);}}
     }
    }else if(layer.type==='circle'&&f.geometry.type==='Point'){const p=f.geometry.coordinates,at=projectGround(p[0],p[1]),radius=Number(evaluate(paint['circle-radius']??4,f,zoom,state))*unitsPerPixel;for(let i=0;i<32;i++){for(const angle of [null,i*Math.PI/16,(i+1)*Math.PI/16]){const x=at.x+(angle===null?0:Math.cos(angle)*radius),z=at.z+(angle===null?0:Math.sin(angle)*radius);positions.push(x,(this.height(p[0],p[1])??0)+.4,z);colors.push(color.r,color.g,color.b,opacity);}}}
   }
   if(!positions.length)continue;const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,4));geometry.computeVertexNormals();const material=new MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});const mesh=new Mesh(geometry,material);mesh.renderOrder=order++;this.root.add(mesh);
  }
 }
 contains(f:Feature,lon:number,lat:number){return waterMaskContains([lon,lat],f.geometry);}
}

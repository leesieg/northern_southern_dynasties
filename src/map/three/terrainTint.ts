import {CanvasTexture,Color,SRGBColorSpace} from 'three';
import type {FeatureCollection} from 'geojson';
import {evaluate,polygonRings,type OverlayLayer} from './overlays';
import {projectGround} from './geography';
/** Geographic colour wash painted into the actual terrain, never a competing mesh. */
export class TerrainTint{
 private canvas:HTMLCanvasElement;readonly texture:CanvasTexture;
 constructor(canvas?:HTMLCanvasElement){this.canvas=canvas??document.createElement('canvas');this.canvas.width=this.canvas.height=1024;this.texture=new CanvasTexture(this.canvas);this.texture.colorSpace=SRGBColorSpace;this.texture.flipY=false;}
 update(layers:OverlayLayer[],sources:Map<string,FeatureCollection>,zoom:number,states:Map<string,Record<string,unknown>>,extent:[number,number,number,number]){
  const c=this.canvas.getContext('2d')!;c.clearRect(0,0,1024,1024);
  for(const layer of layers){if(layer.type!=='fill'||!['realms','territories','hierarchy'].includes(layer.source??'')||layer.layout?.visibility==='none'||zoom<(layer.minzoom??0)||zoom>(layer.maxzoom??99))continue;
   if(zoom>6.2&&['territory-hover','territory-selected','hierarchy-selected'].includes(layer.id))continue;
   for(const f of sources.get(layer.source!)?.features??[]){const state=states.get(layer.source+':'+(f.id??f.properties?.id))??{};if(layer.filter&&!evaluate(layer.filter,f,zoom,state))continue;
    const alpha=Number(evaluate(layer.paint?.['fill-opacity']??1,f,zoom,state));if(alpha<=.001)continue;
    const rgb=evaluate(layer.paint?.['fill-color']??'#dbc992',f,zoom,state),color=typeof rgb==='string'?new Color(rgb):new Color().setRGB(rgb.r,rgb.g,rgb.b);
    c.fillStyle=color.getStyle();c.globalAlpha=alpha;
    for(const polygon of polygonRings(f.geometry)){c.beginPath();for(const ring of polygon){ring.forEach((p,i)=>{const v=projectGround(p[0],p[1]),x=(v.x-extent[0])/extent[2]*1024,y=(v.z-extent[1])/extent[3]*1024;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();}c.fill('evenodd');}
   }
  }c.globalAlpha=1;this.texture.needsUpdate=true;
 }
 dispose(){this.texture.dispose();}
}

import {expect,it} from 'vitest';
import {TerrainTint} from './terrainTint';
import {CampaignOverlays,type OverlayLayer} from './overlays';
import {atlasStyle,POLITICAL_LAYERS,ROAD_LAYERS} from '../atlasStyle';
const data={type:'FeatureCollection' as const,features:[{type:'Feature' as const,id:'one',properties:{id:'one',color:'#886644',tone:0},geometry:{type:'Polygon' as const,coordinates:[[[110,32],[111,32],[111,33],[110,33],[110,32]]]}}]};
it.each(['diplomacy','political','domains','terrain','roads'])('paints %s fills without constructing competing terrain meshes',mode=>{
 const fills:{alpha:number;color:string}[]=[],ctx={globalAlpha:1,fillStyle:'',clearRect(){fills.length=0;},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){fills.push({alpha:this.globalAlpha,color:this.fillStyle});}};
 const canvas={width:0,height:0,getContext:()=>ctx} as unknown as HTMLCanvasElement,tint=new TerrainTint(canvas);
 const layers=structuredClone(atlasStyle().layers) as OverlayLayer[];
 for(const l of layers){if(POLITICAL_LAYERS.includes(l.id))l.layout={visibility:['political','domains','diplomacy'].includes(mode)?'visible':'none'};if(ROAD_LAYERS.includes(l.id))l.layout={visibility:mode==='roads'?'visible':'none'};if(l.id==='territory-fill')l.paint={...l.paint,'fill-opacity':mode==='diplomacy'?.55:0};if(l.id==='realm-tint'&&mode==='diplomacy')l.paint={...l.paint,'fill-opacity':0};}
 const sources=new Map([['realms',data],['territories',data]]),states=new Map();
 tint.update(layers,sources,8,states,[-1000,-1000,2000,2000]);
 if(['terrain','roads'].includes(mode))expect(fills).toHaveLength(0);else expect(fills.length).toBeGreaterThan(0);
 if(mode==='diplomacy')expect(fills.some(v=>v.alpha===.55)).toBe(true);
 const overlays=new CampaignOverlays(()=>8);overlays.rebuild(layers.filter(l=>l.type==='fill'),sources,8,.05,states,undefined,false,true);expect(overlays.root.children).toHaveLength(0);
 tint.update([],sources,8,states,[-1000,-1000,2000,2000]);expect(fills).toHaveLength(0);tint.dispose();overlays.clear();
});

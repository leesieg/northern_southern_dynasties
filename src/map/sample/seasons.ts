import {Color,Mesh,MeshStandardMaterial,type Scene} from 'three';

export const seasons={
 spring:{name:'春',description:'新绿初生 · 山间薄雾',low:[.12,.20,.065],high:[.32,.38,.16],forest:[.085,.17,.07],field:[.18,.28,.085],leaf:'#91ae62',pine:'#627e58',snow:0,fog:'#c5cfc0',sun:'#fff0cf',sky:'#d1e1df',intensity:2.5,water:'#557e79'},
 summer:{name:'夏',description:'林深田茂 · 山河苍翠',low:[.085,.135,.064],high:[.265,.285,.135],forest:[.07,.12,.06],field:[.21,.29,.095],leaf:'#5d7842',pine:'#3b6049',snow:0,fog:'#bdc6c1',sun:'#ffe1ad',sky:'#cadcde',intensity:2.7,water:'#426f70'},
 autumn:{name:'秋',description:'层林金褐 · 田野收黄',low:[.20,.16,.07],high:[.40,.32,.15],forest:[.23,.15,.055],field:[.42,.31,.10],leaf:'#b38b43',pine:'#4f6243',snow:0,fog:'#c9c1b0',sun:'#ffdc9f',sky:'#cbd4da',intensity:2.5,water:'#526d6a'},
 winter:{name:'冬',description:'山野覆雪 · 青瓦凝霜',low:[.14,.16,.13],high:[.27,.28,.22],forest:[.10,.14,.12],field:[.24,.22,.17],leaf:'#777a64',pine:'#50655b',snow:.92,fog:'#ced8dc',sun:'#e4edff',sky:'#d5e5f3',intensity:2.15,water:'#67858d'},
} as const;
export type Season=keyof typeof seasons;
export function createSeasonState(){
 const uniforms={seasonLow:{value:new Color()},seasonHigh:{value:new Color()},seasonForest:{value:new Color()},seasonField:{value:new Color()},seasonSnow:{value:0}};
 let current:Season='summer';
 function set(season:Season){current=season;const p=seasons[season];uniforms.seasonLow.value.setRGB(p.low[0],p.low[1],p.low[2]);uniforms.seasonHigh.value.setRGB(p.high[0],p.high[1],p.high[2]);uniforms.seasonForest.value.setRGB(p.forest[0],p.forest[1],p.forest[2]);uniforms.seasonField.value.setRGB(p.field[0],p.field[1],p.field[2]);uniforms.seasonSnow.value=p.snow;}
 set(current);
 const tracked=new Map<MeshStandardMaterial,Color>();
 function sync(scene:Scene){
  const p=seasons[current];
  scene.traverse(o=>{if(!(o instanceof Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!(m instanceof MeshStandardMaterial)||! /^(Leaf |Pine |Slate tile|Ridge pottery|Warm limestone|Courtyard earth|Lime plaster)/.test(m.name))continue;
   if(!tracked.has(m)){
    tracked.set(m,m.color.clone());
    m.onBeforeCompile=s=>{
     s.uniforms.seasonSnow=uniforms.seasonSnow;
     s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying float seasonFacing;').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nseasonFacing=inverseTransformDirection(transformedNormal,viewMatrix).y;');
     s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float seasonSnow; varying float seasonFacing;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.83,.85),seasonSnow*smoothstep(.18,.75,seasonFacing));');
    };
    m.customProgramCacheKey=()=> 'campaign-season-surface-v1';m.needsUpdate=true;
   }
   if(m.name.startsWith('Leaf '))m.color.copy(tracked.get(m)!).lerp(new Color(p.leaf),.8);
   else if(m.name.startsWith('Pine '))m.color.copy(tracked.get(m)!).lerp(new Color(p.pine),.65);
  }});
 }
 return {uniforms,set,sync};
}
export type SeasonState=ReturnType<typeof createSeasonState>;

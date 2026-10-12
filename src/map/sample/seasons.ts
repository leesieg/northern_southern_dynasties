import {Color,Mesh,MeshStandardMaterial,type Scene} from 'three';
import {palettes} from '../artSample/layout';
const rgb=(hex:string)=>{const c=new Color(hex);return [c.r,c.g,c.b] as const;};

export const seasons={
 spring:{name:'春',description:'新绿初生 · 山间薄雾',low:[.14,.23,.055],high:[.34,.43,.14],forest:[.07,.14,.035],field:[.32,.40,.09],leaf:'#91ae62',pine:'#627e58',snow:0,fog:'#cbd0ce',sun:'#fff0cf',sky:'#c5d6e5',intensity:2.8,water:'#326c75'},
 summer:{name:'夏',description:'林深田茂 · 山河苍翠',low:rgb(palettes.summer.ground),high:rgb(palettes.summer.grass),forest:rgb(palettes.summer.forest),field:rgb(palettes.summer.field),leaf:'#6e804e',pine:'#405f50',snow:0,fog:palettes.summer.fog,sun:palettes.summer.sun,sky:'#dee9f0',intensity:2.35,water:palettes.summer.water},
 autumn:{name:'秋',description:'层林金褐 · 田野收黄',low:rgb(palettes.autumn.ground),high:rgb(palettes.autumn.grass),forest:rgb(palettes.autumn.forest),field:rgb(palettes.autumn.field),leaf:'#b38b43',pine:'#4f6243',snow:0,fog:palettes.autumn.fog,sun:palettes.autumn.sun,sky:'#dee9f0',intensity:2.35,water:palettes.autumn.water},
 winter:{name:'冬',description:'山野覆雪 · 青瓦凝霜',low:rgb(palettes.winter.ground),high:rgb(palettes.winter.grass),forest:rgb(palettes.winter.forest),field:rgb(palettes.winter.field),leaf:'#777a64',pine:'#50655b',snow:.92,fog:palettes.winter.fog,sun:palettes.winter.sun,sky:'#dee9f0',intensity:2.15,water:palettes.winter.water},
} as const;
export type Season=keyof typeof seasons;
export function createSeasonState(up:'y'|'z'='y'){
 const uniforms={seasonLow:{value:new Color()},seasonHigh:{value:new Color()},seasonForest:{value:new Color()},seasonField:{value:new Color()},seasonSnow:{value:0}};
 let current:Season='summer';
 function set(season:Season){current=season;const p=seasons[season];uniforms.seasonLow.value.setRGB(p.low[0],p.low[1],p.low[2]);uniforms.seasonHigh.value.setRGB(p.high[0],p.high[1],p.high[2]);uniforms.seasonForest.value.setRGB(p.forest[0],p.forest[1],p.forest[2]);uniforms.seasonField.value.setRGB(p.field[0],p.field[1],p.field[2]);uniforms.seasonSnow.value=p.snow;}
 set(current);
 const tracked=new Map<MeshStandardMaterial,Color>();
 function sync(scene:Scene){
  const p=seasons[current];
  scene.traverse(o=>{if(!(o instanceof Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!(m instanceof MeshStandardMaterial)||! /^(Leaf |Pine |Slate tile|Ridge pottery|Warm limestone|Courtyard earth|Lime plaster|Campaign city|River silt)/.test(m.name))continue;
   if(!tracked.has(m)){
    tracked.set(m,m.color.clone());
    const compile=m.onBeforeCompile,programKey=m.customProgramCacheKey();
    m.onBeforeCompile=(s,renderer)=>{
     compile.call(m,s,renderer);
     s.uniforms.seasonSnow=uniforms.seasonSnow;
     s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying float seasonFacing;').replace('#include <defaultnormal_vertex>',`#include <defaultnormal_vertex>\nseasonFacing=inverseTransformDirection(transformedNormal,viewMatrix).${up};`);
     const apron=m.name==='Courtyard earth apron'||m.name==='River silt and reed edge';
     const snow=apron?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.62,.62),seasonSnow*smoothstep(.4,.78,landscapeNoise(landscapePoint*.32))*.52);':'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.83,.85),seasonSnow*smoothstep(.18,.75,seasonFacing));';
     s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float seasonSnow; varying float seasonFacing;').replace('#include <color_fragment>','#include <color_fragment>\n'+snow);
    };
    m.customProgramCacheKey=()=> programKey+'-campaign-season-surface-v2-'+up;m.needsUpdate=true;
   }
   const kind=m.name.startsWith('Leaf ')?'leaf':m.name.startsWith('Pine ')?'pine':null;
   if(kind){
    const base=tracked.get(m)!;
    if(m.vertexColors){
     // Baked vertex colours already contain the green albedo. Apply a seasonal ratio,
     // not a second dark albedo multiplication; summer must preserve the source colour.
     const reference=new Color(seasons.summer[kind]),target=new Color(p[kind]);
     const ratio=(value:number,original:number)=>Math.max(.45,Math.min(2.2,value/Math.max(.025,original)));
     m.color.copy(base).multiply(new Color().setRGB(ratio(target.r,reference.r),ratio(target.g,reference.g),ratio(target.b,reference.b)));
    }else m.color.copy(base).lerp(new Color(p[kind]),kind==='leaf'?.8:.65);
   }
  }});
 }
 return {uniforms,set,sync};
}
export type SeasonState=ReturnType<typeof createSeasonState>;

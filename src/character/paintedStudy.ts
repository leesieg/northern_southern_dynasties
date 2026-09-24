import {expressGenome,type Genome,type FacialGene} from '../core/genetics';
import {adjustPaintedFeature,validatePaintedRecipe,type PaintedPart,type PaintedRecipe,type PaintedSlot,type PaintedRect} from './paintedLayers';

/** Accepted C-style young adult rig; not a roster-wide library. */
export const paintedStudySpec={rig:'c-young-adult-v1',view:'three-quarter-right',palette:'warm-ivory-v1'};
export const paintedStudyRoot=import.meta.env.BASE_URL+'art/portraits/painted-c/';
export type PaintedFeature='brows'|'eyes'|'nose'|'mouth';
export type PaintedVariant='a'|'b';
export interface PaintedStudyOptions {robe:PaintedVariant;features?:Partial<Record<PaintedFeature,PaintedVariant>>}
const box=(x:number,y:number,width:number,height:number):PaintedRect=>({x,y,width,height});
const normalized=(r:PaintedRect):PaintedRect=>({x:r.x/1024,y:r.y/1536,width:r.width/1024,height:r.height/1536});
function part(slot:PaintedSlot,source:string,crop:PaintedRect):PaintedPart {
 return {...paintedStudySpec,id:`${slot}:${source}`,slot,source:paintedStudyRoot+source,crop,place:normalized(crop)};
}
type FeatureRegistration={slot:PaintedSlot;feature:PaintedFeature;crop:PaintedRect;points:[number,number][];width:FacialGene;height:FacialGene};
// Source-space boundaries isolate brows from lids and the nose from the far eye.
const registrations:FeatureRegistration[]=[
 {slot:'brow-left',feature:'brows',crop:box(468,254,104,48),points:[[.06,.40],[.22,.13],[.50,.23],[.92,.59],[.91,.85],[.69,.88],[.38,.52],[.13,.50]],width:'brow',height:'brow'},
 {slot:'brow-right',feature:'brows',crop:box(568,282,62,34),points:[[.08,.55],[.28,.27],[.70,.26],[.88,.37],[.87,.61],[.42,.67],[.17,.77]],width:'brow',height:'brow'},
 {slot:'eye-left',feature:'eyes',crop:box(473,286,94,52),points:[[.08,.18],[.35,.14],[.70,.29],[.91,.46],[.87,.77],[.63,.94],[.31,.78],[.08,.47]],width:'eyeWidth',height:'eyeTilt'},
 {slot:'eye-right',feature:'eyes',crop:box(571,304,55,42),points:[[.11,.36],[.31,.15],[.80,.17],[.94,.31],[.80,.77],[.50,.91],[.19,.77]],width:'eyeWidth',height:'eyeTilt'},
 {slot:'nose',feature:'nose',crop:box(518,314,71,81),points:[[.42,.02],[.77,.07],[.80,.36],[.93,.63],[.86,.83],[.64,.96],[.28,.95],[.08,.78],[.13,.54],[.30,.36]],width:'noseWidth',height:'noseLength'},
 {slot:'mouth',feature:'mouth',crop:box(490,390,89,52),points:[[.12,.27],[.49,.13],[.72,.21],[.88,.39],[.89,.76],[.66,.88],[.34,.78],[.12,.52]],width:'mouth',height:'mouth'},
];
const selectionGene:Record<PaintedFeature,FacialGene>={brows:'brow',eyes:'eyeWidth',nose:'noseWidth',mouth:'mouth'};

export function paintedFeatureVariants(genome:Genome):Record<PaintedFeature,PaintedVariant>{
 const {features}=expressGenome(genome);
 return Object.fromEntries(Object.entries(selectionGene).map(([slot,gene])=>[slot,features[gene]<.5?'a':'b'])) as Record<PaintedFeature,PaintedVariant>;
}

export function composePaintedStudy(genome:Genome,options:PaintedStudyOptions={robe:'a'}):PaintedRecipe {
 const {features}=expressGenome(genome),variants={...paintedFeatureVariants(genome),...options.features};
 if(!['a','b'].includes(options.robe)||Object.values(variants).some(v=>v!=='a'&&v!=='b'))throw new Error('未知立绘样板');
 const body=part('body',options.robe==='a'?'base.png':'robe-b.png',box(0,0,1024,1536));
 const head=part('head','base.png',box(0,0,1024,560));head.mask={kind:'bottom-fade',start:500/560};
 const parts=[body,head,...registrations.map(reg=>{
  const layer=part(reg.slot,`features-${variants[reg.feature]}.png`,reg.crop);
  layer.mask={kind:'polygon',points:reg.points.map(([x,y])=>[x,y]),softness:.045};
  return adjustPaintedFeature(layer,features[reg.width],features[reg.height]);
 })];
 const recipe:PaintedRecipe={version:1,...paintedStudySpec,parts};
 validatePaintedRecipe(recipe);return recipe;
}

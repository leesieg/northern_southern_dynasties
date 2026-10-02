import {expressGenome,type FacialGene} from '../core/genetics';
import {paintedRig,paintedBounds,paintedRosterRigs,paintedFemaleRigs,type PaintedRigId} from '../data/paintedRoster';
import {adjustPaintedFeature,validatePaintedRecipe,type PaintedPart,type PaintedRecipe,type PaintedSlot} from './paintedLayers';
import type {PortraitContext} from './composition';
import {characterById} from '../data/characters';
import {expandedPersonById} from '../data/expandedPeople';

export function rosterRigId(id:string|undefined,context:PortraitContext):PaintedRigId {
 if((context.life?.age??18)<16)return 'child';
 let assigned=id?paintedRosterRigs[id]:undefined;
 if(assigned==='child'&&(context.life?.age??0)>=16)assigned=context.identity.culture==='southern'?'fictional':'yuan-qin';
 if(context.identity.sex==='female')return assigned&&paintedFemaleRigs.has(assigned)?assigned:context.identity.culture==='northern'?'female-north':'female';
 if(assigned&&!paintedFemaleRigs.has(assigned))return assigned;
 if((context.maturity??.35)>.7)return 'xiao-yan';
 // A new commission changes clothing, never the person's underlying face rig.
 if(id&&(characterById[id]?.role??expandedPersonById[id]?.role)==='commander')return context.identity.culture==='southern'?'chen-baxian':'dugu-xin';
 if(context.beard==='long')return context.identity.culture==='southern'?'xiao-yi':'yuwen-tai';
 return context.identity.culture==='southern'?'fictional':'yuan-qin';
}
const featureSlots:PaintedSlot[]=['brow-left','brow-right','eye-left','eye-right','nose','mouth'];
const parameters:[FacialGene,FacialGene][]=[['brow','brow'],['brow','brow'],['eyeWidth','eyeTilt'],['eyeWidth','eyeTilt'],['noseWidth','noseLength'],['mouth','mouth']];
export function composePaintedRoster(id:string|undefined,context:PortraitContext):PaintedRecipe{
 const rig=paintedRig(rosterRigId(id,context)),features=expressGenome(context.identity.genome).features;
 const spec={rig:'c-roster-'+rig.id+'-v1',view:'three-quarter-right',palette:'authored-'+rig.id};
 const common={...spec,source:rig.source};
 const body:PaintedPart={...common,id:rig.id+':body',slot:'body',crop:{x:rig.baseX,y:0,width:rig.width,height:rig.height},place:{x:0,y:0,width:1,height:1}};
 const headHeight=Math.min(rig.height,Math.max(...paintedBounds[rig.id].map(b=>b[1]+b[3]))+50);
 const head:PaintedPart={...common,id:rig.id+':head',slot:'head',crop:{x:rig.baseX,y:0,width:rig.width,height:headHeight},place:{x:0,y:0,width:1,height:headHeight/rig.height}};
 const parts=[body,head,...paintedBounds[rig.id].map(([x,y,width,height],i)=>{
  const part:PaintedPart={...spec,id:rig.id+':'+featureSlots[i],slot:featureSlots[i],source:rig.faceSource,crop:{x,y,width,height},place:{x:x/rig.width,y:y/rig.height,width:width/rig.width,height:height/rig.height},
   mask:{kind:'polygon',points:[[.1,.09],[.86,.09],[.96,.26],[.96,.76],[.84,.94],[.15,.94],[.04,.75],[.04,.28]],softness:.045}};
  return adjustPaintedFeature(part,features[parameters[i][0]],features[parameters[i][1]]);
 })];
 const recipe:PaintedRecipe={version:1,...spec,thumbnail:rig.thumbnail,parts};validatePaintedRecipe(recipe);return recipe;
}

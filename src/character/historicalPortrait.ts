import {expressGenome,founderGenome,type FacialGene} from '../core/genetics';
import {applyPortraitProfile} from '../data/portraitProfiles';
import type {PortraitContext,PortraitOffice} from './composition';
import {adjustPaintedFeature,validatePaintedRecipe,type PaintedPart,type PaintedRecipe,type PaintedRect,type PaintedSlot} from './paintedLayers';

type Bounds=readonly [x:number,y:number,width:number,height:number];
type Face=readonly [Bounds,Bounds,Bounds,Bounds,Bounds,Bounds];
interface Registration {native:PortraitOffice;face:Face;thumbnail:Bounds;outfits:readonly [Face,Face,Face,Face]}
/** Observed against the approved 1024×1536 originals and EACH 512×768 outfit cell.
 * Left/right are image coordinates. These are art anchors, never inherited genes.
 * Outfit order: civilian, official, commander, sovereign. Original art remains the
 * native look; its coordinates are independent of the smaller wardrobe paintings. */
export const historicalPortraitRegistration={
 'yuwen-tai':{native:'governor',thumbnail:[325,130,300,300],face:[[433,193,85,31],[528,205,55,27],[442,214,60,26],[533,220,47,26],[491,236,59,54],[455,286,105,49]],outfits:[
  [[250,119,45,17],[303,126,28,15],[257,134,33,15],[307,136,23,14],[286,144,30,32],[268,171,51,28]],
  [[206,119,44,17],[258,126,29,15],[214,134,32,15],[260,137,23,14],[242,145,30,32],[224,171,51,28]],
  [[257,102,44,18],[309,110,27,16],[265,115,32,15],[312,116,22,14],[290,126,29,31],[272,153,50,25]],
  [[232,100,43,18],[281,110,26,15],[238,115,31,14],[284,117,21,14],[264,126,28,30],[245,152,48,25]],
 ]},
 'gao-huan':{native:'governor',thumbnail:[400,205,300,300],face:[[480,278,101,33],[585,280,56,33],[492,306,77,30],[596,305,43,31],[556,324,70,68],[518,392,110,53]],outfits:[
  [[277,142,49,15],[332,145,28,14],[284,157,36,14],[336,158,22,14],[316,169,35,35],[291,202,56,26]],
  [[247,142,49,15],[300,145,28,14],[255,157,36,14],[305,158,22,14],[285,169,35,35],[260,202,56,26]],
  [[274,126,49,15],[331,130,28,14],[281,140,36,14],[335,140,22,14],[315,153,35,35],[291,185,56,26]],
  [[249,126,49,15],[304,130,28,14],[256,140,36,14],[308,140,22,14],[288,153,35,35],[264,185,56,26]],
 ]},
 'xiao-yan':{native:'ruler',thumbnail:[340,265,285,285],face:[[376,313,58,28],[449,305,91,33],[387,344,43,25],[460,340,67,28],[410,357,70,69],[400,420,108,58]],outfits:[
  [[216,141,31,16],[256,137,49,19],[224,155,25,16],[265,153,34,16],[238,169,38,34],[230,203,57,30]],
  [[145,143,31,16],[185,138,49,19],[152,156,25,16],[193,153,34,16],[168,170,38,34],[160,204,57,30]],
  [[194,97,31,16],[233,94,49,19],[202,111,25,16],[242,108,34,16],[215,125,38,34],[208,157,57,30]],
  [[166,117,31,16],[205,114,49,19],[174,132,25,16],[214,128,34,16],[187,144,38,34],[180,177,57,30]],
 ]},
 'hou-jing':{native:'commander',thumbnail:[392,205,300,300],face:[[490,238,86,35],[588,265,47,28],[497,264,67,32],[584,282,43,26],[537,290,61,66],[464,350,121,50]],outfits:[
  [[276,128,49,24],[332,148,31,19],[283,147,36,18],[333,158,24,17],[309,163,35,36],[270,192,66,29]],
  [[245,128,49,24],[301,148,31,19],[252,147,36,18],[302,158,24,17],[278,163,35,36],[239,192,66,29]],
  [[259,116,47,23],[313,132,30,18],[266,133,35,17],[314,143,23,16],[291,148,34,35],[253,180,64,28]],
  [[246,122,47,23],[300,138,30,18],[253,139,35,17],[301,149,23,16],[278,154,34,35],[240,186,64,28]],
 ]},
 'chen-baxian':{native:'commander',thumbnail:[360,235,285,285],face:[[445,280,85,33],[529,303,40,28],[455,306,61,25],[535,317,32,24],[500,327,50,46],[467,370,88,43]],outfits:[
  [[285,126,43,21],[332,140,25,18],[292,141,31,15],[334,150,21,15],[317,157,27,30],[293,179,50,27]],
  [[257,126,43,21],[304,140,25,18],[264,141,31,15],[306,150,21,15],[289,157,27,30],[265,179,50,27]],
  [[278,128,43,21],[325,142,25,18],[285,143,31,15],[327,152,21,15],[310,159,27,30],[286,182,50,27]],
  [[250,125,43,21],[297,139,25,18],[257,140,31,15],[299,149,21,15],[282,156,27,30],[258,179,50,27]],
 ]},
} as const satisfies Record<string,Registration>;
export type HistoricalPortraitId=keyof typeof historicalPortraitRegistration;
const offices:PortraitOffice[]=['civilian','governor','commander','ruler'];
const slots:PaintedSlot[]=['brow-left','brow-right','eye-left','eye-right','nose','mouth'];
const parameters:readonly (readonly [FacialGene,FacialGene])[]=[['brow','brow'],['brow','brow'],['eyeWidth','eyeTilt'],['eyeWidth','eyeTilt'],['noseWidth','noseLength'],['mouth','mouth']];
const baselines=new Map<HistoricalPortraitId,ReturnType<typeof expressGenome>['features']>();
const rect=([x,y,width,height]:Bounds):PaintedRect=>({x,y,width,height});

/** Same eight-layer contract, cache, health wash and cutout as every other person.
 * Only these five adult male identities opt in; no other person borrows their art. */
export function historicalPaintedRecipe(id:string|undefined,context:PortraitContext):PaintedRecipe|undefined {
 if(!id||!Object.hasOwn(historicalPortraitRegistration,id)||context.identity.sex!=='male'||(context.life?.age??18)<16)return;
 const person=id as HistoricalPortraitId,registration:Registration=historicalPortraitRegistration[person];
 const native=context.office===registration.native,index=offices.indexOf(context.office),width=native?1024:512,height=native?1536:768;
 const cellX=native?0:index%2*width,cellY=native?0:Math.floor(index/2)*height;
 const bounds=native?registration.face:registration.outfits[index];
 const prefix=import.meta.env.BASE_URL+'art/portraits/painted-c/historical-five-v1/'+person+(native?'-canonical':'');
 const source=prefix+'-faces.png',palette='historical-five-v1:'+person+':'+context.office;
 const common={rig:'c-historical-'+person+'-v1',view:'authored-three-quarter',palette};
 const features=expressGenome(context.identity.genome).features;
 let baseline=baselines.get(person);if(!baseline){baseline=expressGenome(applyPortraitProfile(founderGenome(person),person)).features;baselines.set(person,baseline);}
 // Approved art represents the founder's existing genes. Only a real difference
 // in the stored genes changes its proportions; never write a new founder genome.
 const changed=parameters.some(pair=>pair.some(g=>Math.abs(features[g]-baseline![g])>1e-9));
 const normalized=(b:PaintedRect):PaintedRect=>({x:b.x/width,y:b.y/height,width:b.width/width,height:b.height/height});
 const crop=(b:PaintedRect):PaintedRect=>({...b,x:b.x+cellX,y:b.y+cellY});
 const body:PaintedPart={...common,id:palette+':body',slot:'body',source,crop:{x:cellX,y:cellY,width,height},place:{x:0,y:0,width:1,height:1}};
 const padding=native?14:8,minX=Math.min(...bounds.map(b=>b[0]))-padding,minY=Math.min(...bounds.map(b=>b[1]))-padding;
 const maxX=Math.max(...bounds.map(b=>b[0]+b[2]))+padding,maxY=Math.max(...bounds.map(b=>b[1]+b[3]))+padding;
 const headBox={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
 const head:PaintedPart={...common,id:palette+':head',slot:'head',source:changed?prefix+'-base.png':source,crop:crop(headBox),place:normalized(headBox),mask:{kind:'polygon',points:[[.04,0],[.96,0],[1,.04],[1,.96],[.96,1],[.04,1],[0,.96],[0,.04]],softness:.025}};
 const parts=[body,head,...bounds.map((b,i)=>adjustPaintedFeature({...common,id:palette+':'+slots[i],slot:slots[i],source,crop:crop(rect(b)),place:normalized(rect(b)),mask:{kind:'polygon',points:[[.04,.04],[.96,.04],[.99,.2],[.99,.8],[.96,.96],[.04,.96],[.01,.8],[.01,.2]],softness:.025}},.5+features[parameters[i][0]]-baseline![parameters[i][0]],.5+features[parameters[i][1]]-baseline![parameters[i][1]]))];
 const side=Math.max(maxX-minX,maxY-minY)*1.55;
 const thumbnail=native?normalized(rect(registration.thumbnail)):normalized({x:Math.max(0,(minX+maxX-side)/2),y:Math.max(0,(minY+maxY-side)/2),width:side,height:side});
 const recipe:PaintedRecipe={version:1,...common,parts,thumbnail,facialHair:true};validatePaintedRecipe(recipe);return recipe;
}

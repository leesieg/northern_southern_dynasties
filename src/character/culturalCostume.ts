import type {PortraitContext} from './composition';
import type {PaintedRecipe,PaintedPart,PaintedRect} from './paintedLayers';
import {headRegistration,costumeRegistration,bodyRegistration} from './costumeRegistration';
type Point=[number,number];
type Pair=[Point,Point];
type Transform={scale:number;x:number;y:number};
const pair=(p:[number,number,number,number],width:number,height:number):Pair=>[[p[0]/width,p[1]/height],[p[2]/width,p[3]/height]];
const point=([x,y]:Point,t:Transform):Point=>[x*t.scale+t.x,y*t.scale+t.y];
const midpoint=([a,b]:Pair):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const span=([a,b]:Pair)=>Math.abs(b[0]-a[0]);
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** Source collar pairs have different slopes: use width for size and centre for placement,
 * never the diagonal's height (a shallow collar would otherwise enlarge the entire robe). */
function centered(from:Pair,to:Point,scale:number):Transform {
 const [x,y]=midpoint(from);
 return {scale,x:to[0]-x*scale,y:to[1]-y*scale};
}
function box(b:PaintedRect,t:Transform):PaintedRect{return {x:b.x*t.scale+t.x,y:b.y*t.scale+t.y,width:b.width*t.scale,height:b.height*t.scale};}
/** Crop any off-canvas translation, rather than stretching or changing aspect ratio. */
function placed(part:PaintedPart,t:Transform):PaintedPart {
 const b=box(part.place,t);if(b.x>=0&&b.y>=0&&b.x+b.width<=1&&b.y+b.height<=1)return {...part,place:b};
 const x=Math.max(0,b.x),y=Math.max(0,b.y),width=Math.min(1,b.x+b.width)-x,height=Math.min(1,b.y+b.height)-y;
 const l=(x-b.x)/b.width,top=(y-b.y)/b.height,w=width/b.width,h=height/b.height;
 const mask=part.mask?.kind==='polygon'?{...part.mask,points:part.mask.points.map(([px,py]):Point=>[Math.max(0,Math.min(1,(px-l)/w)),Math.max(0,Math.min(1,(py-top)/h))])}:part.mask;
 return {...part,crop:{x:part.crop.x+l*part.crop.width,y:part.crop.y+top*part.crop.height,width:part.crop.width*w,height:part.crop.height*h},place:{x,y,width,height},mask};
}
/** All garments register to one neck per sex/age; changing outfit never shifts the face. */
export function culturalCostume(recipe:PaintedRecipe,context:PortraitContext):PaintedRecipe {
 const culture=context.identity.cultureId;
 if(context.office==='ruler'||culture!=='han'&&culture!=='xianbei')return recipe;
 const original=recipe.parts.find(p=>p.slot==='body')!,head=recipe.parts.find(p=>p.slot==='head')!,features=recipe.parts.filter(p=>p.slot!=='head'&&p.slot!=='body');
 const rig=recipe.rig.replace(/^c-roster-/,'').replace(/-v1$/,'');
 const registration=headRegistration[recipe.rig]??headRegistration[rig];if(!registration)return recipe;
 const young=(context.life?.age??18)<16,sex=context.identity.sex,kind=young?'child':sex,office=young?'civilian':context.office;
 const column=office==='commander'?2:office==='governor'?1:0,row=culture==='han'?0:1,index=young?row:row*3+column;
 const size=young?{width:724,height:1086}:{width:418,height:627},cell={x:(young?row:column)*size.width,y:(young?0:row)*size.height,...size};
 const garment=costumeRegistration[kind][index],source=import.meta.env.BASE_URL+'art/portraits/painted-c/costumes/'+kind+'-v1.png';
 const neck:Pair=young?[[.42,.35],[.57,.45]]:sex==='female'?[[.40,.285],[.56,.375]]:[[.40,.26],[.56,.35]];
 const sourceNeck=pair(registration.neck,original.crop.width,original.crop.height),sourceRim=pair(registration.rim,original.crop.width,original.crop.height);
 // Keep the same apparent head width across the 1024px study and 724px roster rigs.
 const headFit=centered(sourceNeck,midpoint(neck),(young?.27:sex==='male'?.25:office==='commander'?.235:.245)/span(sourceRim));
 const rim=sourceRim.map(p=>point(p,headFit)) as Pair;
 // Preserve women's authored hair ornaments in civilian/official dress; a second cap would sit on the bun.
 const useHeadwear=!young&&(sex==='male'||office==='commander');
 const capFit=(g:typeof garment)=>useHeadwear&&g.rim?centered(pair(g.rim,size.width,size.height),midpoint(rim),span(rim)/span(pair(g.rim,size.width,size.height))):null;
 // Reserve space for every hat in this rig, so rank/culture switches share the same head transform.
 const top=Math.min(0,headFit.y,...costumeRegistration[kind].map(g=>capFit(g)?.y??0));
 const offset=Math.max(0,.006-top),headTransform={...headFit,y:headFit.y+offset};
 const portraitBody=bodyRegistration[kind][index];
 const collar=pair(portraitBody?.neck??garment.neck,size.width,size.height);
 // Enlarge adult heads independently of the robe, so correcting proportions does not enlarge the body too.
 const bodyHeadWidth=young?.27:sex==='female'&&office!=='commander'?.23:.215;
 const preferredDressScale=clamp(span(sourceNeck)*bodyHeadWidth/span(sourceRim)/span(collar),young?.94:sex==='female'?.80:.90,1.06);
 // Taller adult crowns need more room above the collar. Fit the complete hands below it without stretching.
 const handBottom=sex==='female'?558:row?561:583;
 const dressScale=young?preferredDressScale:Math.min(preferredDressScale,(.98-midpoint(neck)[1]-offset)/(handBottom/cell.height-midpoint(collar)[1]));
 const dressFit=centered(collar,midpoint(neck),dressScale),dressTransform={...dressFit,y:dressFit.y+offset};
 const [back,front]=pair(registration.neck,original.crop.width,original.crop.height),[left,right]=pair(registration.rim,original.crop.width,original.crop.height);
 // Keep the original face AND neck; remove the old garment along its authored neck seam.
 const keepHair=young||sex==='female'&&!useHeadwear,points:Point[]=[
  [left[0]-(keepHair?.16:.005),keepHair?0:left[1]-.012],[right[0]+.025,keepHair?0:right[1]-.012],
  [right[0]+.025,back[1]-.025],[front[0]+.07,front[1]-.065],
  [front[0],front[1]-.018],[back[0]-.006,back[1]-.008],[back[0]-(keepHair?.16:.012),back[1]-.03],
 ];
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 const face:PaintedPart={...head,id:head.id+':costume-v4',crop:{x:original.crop.x+minX*original.crop.width,y:original.crop.y+minY*original.crop.height,width:(maxX-minX)*original.crop.width,height:(maxY-minY)*original.crop.height},place:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},mask:{kind:'polygon',points:points.map(([x,y])=>[(x-minX)/(maxX-minX),(y-minY)/(maxY-minY)]),softness:.006},removePaper:true};
 const part=(slot:'body'|'headwear',start:number,end:number):PaintedPart=>({...original,id:`costume-v4:${sex}:${culture}:${office}:${slot}`,slot,source,crop:{x:cell.x,y:cell.y+start,width:cell.width,height:end-start},place:{x:0,y:start/cell.height,width:1,height:(end-start)/cell.height}});
 const seam=garment.seam??[[0,garment.bodyTop],[cell.width,garment.bodyTop]];
 const topY=Math.min(...seam.map(p=>p[1])),bottomY=Math.max(...seam.map(p=>p[1]));
 // Both masks use the SAME authored boundary. No cap fragment remains on the robe.
 const garmentPart=(slot:'body'|'headwear'):PaintedPart=>{
  const isBody=slot==='body',start=isBody?topY:0,end=isBody?cell.height:bottomY;
  const outline:Point[]=isBody?[...seam,[cell.width,cell.height],[0,cell.height]]:[[0,0],[cell.width,0],...seam.slice().reverse()];
  return {...part(slot,start,end),mask:{kind:'polygon',points:outline.map(([x,y])=>[x/cell.width,(y-start)/(end-start)]),softness:0}};
 };
 const torso=portraitBody?{...part('body',portraitBody.top,cell.height),id:`costume-body-v2:${kind}:${culture}:${office}`,source:source.replace('-v1.png','-v2.png')}:garmentPart('body');
 // The adjacent long sleeve reaches into the left edge of the women's armor cells.
 // Exclude that isolated strip below the shoulder, retaining the actual armor silhouette.
 if(portraitBody&&sex==='female'&&office==='commander')torso.mask={kind:'polygon',points:[[0,0],[1,0],[1,1],[.06,1],[.06,(300-portraitBody.top)/(cell.height-portraitBody.top)],[0,(240-portraitBody.top)/(cell.height-portraitBody.top)]],softness:0};
 const body=placed(torso,dressTransform),newHead=placed(face,headTransform),newFeatures=features.map(p=>placed(p,headTransform));
 const hat=capFit(garment);
 const headwear=hat?placed(garmentPart('headwear'),{...hat,y:hat.y+offset}):null;
 const thumbnail=recipe.thumbnail?box(recipe.thumbnail,headTransform):box({x:310/1024,y:180/1536,width:360/1024,height:360/1536},headTransform);
 return {...recipe,thumbnail,parts:[body,newHead,...newFeatures,...headwear?[headwear]:[]]};
}

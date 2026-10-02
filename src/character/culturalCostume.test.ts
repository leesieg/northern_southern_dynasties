import {describe,it,expect} from 'vitest';
import {portraitContext} from './composition';
import {approvedPaintedRecipe} from './paintedSelection';
import {validatePaintedRecipe} from './paintedLayers';
import {headRegistration,costumeRegistration} from './costumeRegistration';
import {composePaintedRoster} from './paintedRoster';
import {composePaintedStudy} from './paintedStudy';
import {removeConnectedPaper} from './paintedRenderer';
const face=(r:ReturnType<typeof approvedPaintedRecipe>)=>r.parts.filter(p=>!['body','headwear'].includes(p.slot));
describe('文化服饰共用真实面部与素材',()=>{
 it('头部底图边缘相连的白纸会清除，人物和封闭的亮色细节保留',()=>{
  const width=5,height=5,data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<width*height;i++)data.set([249,248,246,255],i*4);
  for(let y=1;y<4;y++)for(let x=1;x<4;x++)data.set([220,180,150,255],(y*width+x)*4);
  data.set([250,250,248,255],(2*width+2)*4);
  removeConnectedPaper(data,width,height);
  expect(data[3]).toBe(0);expect(data[(2*width+1)*4+3]).toBe(255);
  expect(data[(2*width+2)*4+3]).toBe(255);
  const isolated=new Uint8ClampedArray([240,240,238,255,0,0,0,0,220,180,150,255]);
  removeConnectedPaper(isolated,3,1);
  expect(isolated[3]).toBe(0);expect(isolated[7]).toBe(0);expect(isolated[11]).toBe(255);
 });
 it('独孤信的原肩甲不进入面部遮罩，纸背景单独抠除',()=>{
  const c=portraitContext('dugu-xin'),r=approvedPaintedRecipe('dugu-xin',{...c,identity:{...c.identity,cultureId:'han'},office:'commander'});
  const head=r.parts.find(p=>p.slot==='head')!,mask=head.mask;
  expect(head.removePaper).toBe(true);expect(mask?.kind).toBe('polygon');
  if(mask?.kind!=='polygon')return;
  const x=(724+295-head.crop.x)/head.crop.width,y=(310-head.crop.y)/head.crop.height;
  const inside=mask.points.filter((p,i)=>{const q=mask.points[(i+1)%mask.points.length];return (p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0];}).length%2===1;
  expect(inside).toBe(false);
 });
 it.each(['gao-huan','su-chuo','dugu-xin','wang-lingbin','guest-west','xiao-fangzhi','yuwen-jue'])('%s 改文化衣装与当前职位保留面部和五官',id=>{const c=portraitContext(id),genome=structuredClone(c.identity.genome);const recipes=['han','xianbei'].map(cultureId=>approvedPaintedRecipe(id,{...c,identity:{...c.identity,cultureId: cultureId as 'han'|'xianbei'},office:'civilian'}));expect(face(recipes[0])).toEqual(face(recipes[1]));expect(recipes[0].parts[0].crop).not.toEqual(recipes[1].parts[0].crop);const officer=approvedPaintedRecipe(id,{...c,identity:{...c.identity,cultureId:'han'},office:'governor'});expect(face(officer)).toEqual(face(recipes[0]));expect(c.identity.genome).toEqual(genome);for(const r of [...recipes,officer])expect(()=>validatePaintedRecipe(r)).not.toThrow();});
 it('成人三类服装有各自真实衣身与冠帽，幼年不穿甲或用成人身形',()=>{const c=portraitContext('su-chuo');const recipes=['civilian','governor','commander'].map(office=>approvedPaintedRecipe('su-chuo',{...c,office:office as 'civilian'|'governor'|'commander'}));expect(new Set(recipes.map(r=>JSON.stringify(r.parts[0].crop))).size).toBe(3);for(const r of recipes)expect(r.parts.find(p=>p.slot==='headwear')?.source).toContain('male-v1');const child=approvedPaintedRecipe('yuwen-jue',{...portraitContext('yuwen-jue'),office:'commander'});expect(child.parts[0].source).toContain('child-v1');expect(child.parts.some(p=>p.slot==='headwear')).toBe(false);});
 it('君主保留原礼服，其他文化不会冒用鲜卑图集',()=>{const c=portraitContext('yuan-shanjian'),r=approvedPaintedRecipe('yuan-shanjian',{...c,office:'ruler'});expect(r.parts[0].source).toContain('base.png');const other=approvedPaintedRecipe('hulu-jin',portraitContext('hulu-jin'));expect(other.parts[0].source).not.toContain('costumes');});
 it('五官遗传极值只改对应五官，不移动领口、头部遮罩和冠帽',()=>{
  for(const id of ['su-chuo','gao-huan','wang-lingbin','guest-west','xiao-fangzhi']){
   const context=portraitContext(id),recipes=[0,100].map(value=>{const c=structuredClone(context);for(const pair of Object.values(c.identity.genome.facial!))pair.fill(value);return approvedPaintedRecipe(id,{...c,office:'governor'});});
   const frame=(r:typeof recipes[number])=>r.parts.filter(p=>['body','head','headwear'].includes(p.slot));expect(frame(recipes[0])).toEqual(frame(recipes[1]));expect(recipes[0].thumbnail).toEqual(recipes[1].thumbnail);
  }
 });
 it('原头部保留到真实颈部；各衣领注册到共同颈部，不用嘴巴边缘代替领口',()=>{
  for(const id of ['yuan-shanjian','su-chuo','gao-huan','dugu-xin','xiao-gang','xiao-yi','gao-cheng','gao-yang','yuan-baoju','yuan-qin','fictional','chen-baxian','guest-liang','guest-west','lou-zhaojun','wang-lingbin','xu-zhaopei','xiao-fangzhi'])for(const cultureId of ['han','xianbei'] as const)for(const office of ['civilian','governor','commander'] as const){
   const c={...portraitContext(id),office},raw=id==='yuan-shanjian'?composePaintedStudy(c.identity.genome,{robe:'b'}):composePaintedRoster(id,c),r=approvedPaintedRecipe(id,{...c,identity:{...c.identity,cultureId}}),body=r.parts.find(p=>p.slot==='body')!,head=r.parts.find(p=>p.slot==='head')!,original=raw.parts[0],reg=headRegistration[raw.rig]??headRegistration[raw.rig.replace(/^c-roster-/,'').replace(/-v1$/,'')];
   const young=(c.life?.age??18)<16,kind=young?'child':c.identity.sex,row=cultureId==='han'?0:1,col=office==='commander'?2:office==='governor'?1:0,atlas=costumeRegistration[kind][young?row:row*3+col],width=young?724:418,height=young?1086:627;
   const project=(part:typeof body,x:number,y:number)=>[part.place.x+(x-part.crop.x)*part.place.width/part.crop.width,part.place.y+(y-part.crop.y)*part.place.height/part.crop.height];
   const skin=project(head,original.crop.x+(reg.neck[0]+reg.neck[2])/2,(reg.neck[1]+reg.neck[3])/2),collar=project(body,(young?row:col)*width+(atlas.neck[0]+atlas.neck[2])/2,(young?0:row)*height+(atlas.neck[1]+atlas.neck[3])/2);
   expect(skin[0]).toBeCloseTo(collar[0],10);expect(skin[1]).toBeCloseTo(collar[1],10);expect(head.crop.y+head.crop.height).toBeGreaterThan(reg.neck[3]-32);
   expect(head.crop.y+head.crop.height).toBeLessThan(reg.neck[3]);
   // Shallow female collars must not magnify the robe; old diagonal fitting reached ~1.5x.
   const bodyScale=body.place.width/body.crop.width*width;
   expect(bodyScale).toBeGreaterThanOrEqual(.84-1e-9);expect(bodyScale).toBeLessThanOrEqual(1.06+1e-9);
   const rimLeft=project(head,original.crop.x+reg.rim[0],reg.rim[1]),rimRight=project(head,original.crop.x+reg.rim[2],reg.rim[3]);
   expect(rimRight[0]-rimLeft[0]).toBeCloseTo(young?.25:.24,10);
   const cap=r.parts.find(p=>p.slot==='headwear');if(cap&&atlas.rim){
    const capLeft=project(cap,(young?row:col)*width+atlas.rim[0],(young?0:row)*height+atlas.rim[1]),capRight=project(cap,(young?row:col)*width+atlas.rim[2],(young?0:row)*height+atlas.rim[3]);
    expect(capLeft[0]).toBeCloseTo(rimLeft[0],10);expect(capRight[0]).toBeCloseTo(rimRight[0],10);
    expect((capLeft[1]+capRight[1])/2).toBeCloseTo((rimLeft[1]+rimRight[1])/2,10);
   }
   const features=r.parts.filter(p=>!['body','head','headwear'].includes(p.slot)),scale=features[0].place.width/raw.parts[2].place.width;for(let i=0;i<features.length;i++){expect(features[i].place.width/raw.parts[i+2].place.width).toBeCloseTo(scale,10);expect(features[i].place.height/raw.parts[i+2].place.height).toBeCloseTo(scale,10);expect(features[i].crop).toEqual(raw.parts[i+2].crop);}
   expect(()=>validatePaintedRecipe(r)).not.toThrow();
  }
 });

 it('帽带与护耳完整归冠帽层，衣身不重复携带碎片，衣领不进入帽层',()=>{
  const c=portraitContext('su-chuo');
  function contains(part:ReturnType<typeof approvedPaintedRecipe>['parts'][number],x:number,y:number){
   const px=(x-part.crop.x)/part.crop.width,py=(y-part.crop.y)/part.crop.height;
   if(px<0||px>1||py<0||py>1)return false;
   if(part.mask?.kind!=='polygon')return true;
   const pts=part.mask.points;
   return pts.filter((a,i)=>{const b=pts[(i+1)%pts.length];return (a[1]>py)!==(b[1]>py)&&px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0];}).length%2===1;
  }
  for(const [office,x,y] of [['civilian',150,190],['governor',418+150,195],['commander',836+175,187]] as const){
   const r=approvedPaintedRecipe('su-chuo',{...c,office,identity:{...c.identity,cultureId:'han'}}),hat=r.parts.find(p=>p.slot==='headwear')!,body=r.parts.find(p=>p.slot==='body')!;
   expect(contains(hat,x,y)).toBe(true);expect(contains(body,x,y)).toBe(false);
   const col=office==='civilian'?0:office==='governor'?1:2;
   expect(contains(hat,col*418+245,260)).toBe(false);expect(contains(body,col*418+245,260)).toBe(true);
  }
 });

});

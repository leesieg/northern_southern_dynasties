import {clamp,noise,smooth,type Point} from './layout';

export interface RiverSection extends Point {nx:number;nz:number;distance:number;level:number;left:number;right:number;leftBank:number;rightBank:number;bend:number}
export interface RiverSample {distance:number;signed:number;width:number;bank:number;level:number;edge:number;flow:number;inner:number}
/** Display widths and bank profiles follow the source corridor; source coordinates are never rewritten. */
export function riverShape(lines:Point[][],measured:(x:number,z:number)=>number){
 const profiles=lines.map(line=>{
  let distance=0;
  const raw=line.map((p,i)=>{const a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=-(b.z-a.z)/len,nz=(b.x-a.x)/len;
   if(i)distance+=Math.hypot(p.x-a.x,p.z-a.z);
   const pa=line[Math.max(0,i-6)],pb=line[Math.min(line.length-1,i+6)],before={x:p.x-pa.x,z:p.z-pa.z},after={x:pb.x-p.x,z:pb.z-p.z},turn=clamp((before.x*after.z-before.z*after.x)/(Math.hypot(before.x,before.z)*Math.hypot(after.x,after.z)||1)*2.2,-1,1);
   const width=.85+noise(p.x*.045,p.z*.045)*.65+noise(p.x*.15+8,p.z*.15)*.24;
   // Measured low points across the existing corridor suppress spurious banks from the coarse centreline.
   let level=Infinity;for(let k=-4;k<=4;k++)level=Math.min(level,measured(p.x+nx*k*.4,p.z+nz*k*.4));
   return {...p,nx,nz,distance,level:Math.max(.03,level-.06),left:width*(1+turn*.28),right:width*(1-turn*.28),leftBank:.34+Math.max(0,-turn)*1.6+noise(p.x*.2,p.z*.2)*.20,rightBank:.34+Math.max(0,turn)*1.6+noise(p.x*.2+21,p.z*.2)*.20,bend:turn};
  });
  const levels=raw.map((_p,i)=>{let total=0,count=0;for(let j=Math.max(0,i-4);j<=Math.min(raw.length-1,i+4);j++){total+=raw[j].level;count++;}return total/count;});
  // Bound the water gradient in both directions without assuming the dataset's line direction is downstream.
  for(let i=1;i<levels.length;i++)levels[i]=Math.min(levels[i],levels[i-1]+(raw[i].distance-raw[i-1].distance)*.008);
  for(let i=levels.length-2;i>=0;i--)levels[i]=Math.min(levels[i],levels[i+1]+(raw[i+1].distance-raw[i].distance)*.008);
  raw.forEach((p,i)=>p.level=levels[i]);return raw;
 });
 const cells=new Map<string,[RiverSection,RiverSection][]>();
 for(const line of profiles)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor((Math.min(a.x,b.x)-7)/8);x<=Math.floor((Math.max(a.x,b.x)+7)/8);x++)for(let z=Math.floor((Math.min(a.z,b.z)-7)/8);z<=Math.floor((Math.max(a.z,b.z)+7)/8);z++){const key=x+','+z,items=cells.get(key)??[];items.push([a,b]);cells.set(key,items);}}
 function sample(x:number,z:number):RiverSample|undefined{
  let nearest:RiverSample|undefined;
  for(const [a,b] of cells.get(Math.floor(x/8)+','+Math.floor(z/8))??[]){const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(length*length)),px=a.x+dx*t,pz=a.z+dz*t,distance=Math.hypot(x-px,z-pz);
   if(nearest&&nearest.distance<=distance)continue;
   const signed=((x-px)*(-dz)+(z-pz)*dx)/length,lerp=(key:'left'|'right'|'leftBank'|'rightBank'|'level'|'distance'|'bend')=>a[key]+(b[key]-a[key])*t,width=lerp(signed<0?'left':'right'),bank=lerp(signed<0?'leftBank':'rightBank');
   nearest={distance,signed,width,bank,level:lerp('level'),edge:distance-width,flow:lerp('distance'),inner:Math.max(0,lerp('bend')*(signed<0?-1:1))};
  }return nearest;
 }
 function carve(base:number,p:RiverSample|undefined){
  if(!p||p.edge>=p.bank)return base;
  if(p.edge<0)return p.level-.05-.52*(1-smooth(0,1,p.distance/p.width));
  const t=smooth(0,p.bank,p.edge),shelf=p.level+.035+p.edge*.055,inner=p.inner*(1-smooth(p.bank*.35,p.bank,p.edge));return (p.level-.05)*(1-t)+(base*(1-inner)+shelf*inner)*t;
 }
 return {profiles,sample,carve};
}

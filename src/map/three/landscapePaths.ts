/** Display geometry only: keeps route endpoints and bounds every rounded corner. */
export interface GroundPoint{x:number;z:number;}
const mix=(a:GroundPoint,b:GroundPoint,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
export function smoothGroundPath(input:GroundPoint[],step=.6,radius=6):GroundPoint[]{
 const p=input.filter((v,i)=>!i||Math.hypot(v.x-input[i-1].x,v.z-input[i-1].z)>.00001);
 if(p.length<2)return p.map(v=>({...v}));
 const out:GroundPoint[]=[{...p[0]}];
 const line=(b:GroundPoint)=>{const a=out[out.length-1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/step));for(let i=1;i<=n;i++)out.push(mix(a,b,i/n));};
 for(let i=1;i<p.length-1;i++){
  const a=p[i-1],b=p[i],c=p[i+1],ab=Math.hypot(b.x-a.x,b.z-a.z),bc=Math.hypot(c.x-b.x,c.z-b.z),r=Math.min(radius,ab*.3,bc*.3),entry=mix(b,a,r/ab),exit=mix(b,c,r/bc);
  line(entry);const n=Math.max(4,Math.ceil(2*r/step));for(let j=1;j<=n;j++){const t=j/n;out.push(mix(mix(entry,b,t),mix(b,exit,t),t));}
 }
 line(p[p.length-1]);return out;
}
/** Shared section normals make adjoining strips meet without gaps or crossed mitres. */
export function pathSections(points:GroundPoint[]){let distance=0;return points.map((p,i)=>{if(i)distance+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z)||1;return {...p,nx:-(b.z-a.z)/l,nz:(b.x-a.x)/l,distance};});}
export function nearestOnSegment(p:GroundPoint,a:GroundPoint,b:GroundPoint){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));const q=mix(a,b,t);return {...q,distance:Math.hypot(p.x-q.x,p.z-q.z),dx,dz};}
export interface RiverSegment{a:GroundPoint;b:GroundPoint;}
/** An exaggerated city is a display symbol. Its conservative bounding circle must stay on one bank. */
export function riverSafeCity(p:GroundPoint,radius:number,segments:RiverSegment[],southBank=false){
 const local=segments.filter(s=>Math.min(s.a.x,s.b.x)<p.x+radius*4&&Math.max(s.a.x,s.b.x)>p.x-radius*4&&Math.min(s.a.z,s.b.z)<p.z+radius*4&&Math.max(s.a.z,s.b.z)>p.z-radius*4);
 const clearance=(q:GroundPoint)=>Math.min(Infinity,...local.map(s=>nearestOnSegment(q,s.a,s.b).distance));
 const closest=local.map(s=>nearestOnSegment(p,s.a,s.b)).sort((a,b)=>a.distance-b.distance)[0];
 if(!closest||closest.distance>radius+1.2)return {...p,scale:1,radius,clearance:clearance(p)};
 const scale=.55,r=radius*scale,side=(q:GroundPoint)=>!southBank||((q.x-closest.x)*(-closest.dz)+(q.z-closest.z)*closest.dx)*Math.sign(closest.dx||1)>0;
 let best:GroundPoint|undefined;
 for(let d=0;d<=radius*3&&!best;d+=.5)for(let i=0;i<48;i++){const q={x:p.x+Math.cos(i*Math.PI/24)*d,z:p.z+Math.sin(i*Math.PI/24)*d};if(side(q)&&clearance(q)>=r+1.2){best=q;break;}}
 // No safe placement: keep the nameplate, never put a city back into the water.
 return {...(best??p),scale:best?scale:0,radius:best?r:0,clearance:clearance(best??p)};
}

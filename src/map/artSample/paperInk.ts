import type {Point} from './layout';
/** Decorative edge, bounded to 1.1 map units. Canonical direction keeps shared edges identical. */
export function inkEdge(a:Point,b:Point):Point[]{
 const reverse=a.x>b.x||(a.x===b.x&&a.z>b.z),start=reverse?b:a,end=reverse?a:b;
 const dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz);
 if(length<.001)return [{...a},{...b}];
 const steps=Math.max(1,Math.ceil(length/.55)),amplitude=Math.min(1.1,length*.07),points:Point[]=[];
 for(let i=0;i<=steps;i++){const t=i/steps,x=start.x+dx*t,z=start.z+dz*t;
  const wobble=(Math.sin(x*.38+z*.31)*.68+Math.sin(x*.91-z*.57)*.23+Math.sin(x*1.7+z*1.3)*.09)*Math.sin(Math.PI*t)*amplitude;
  points.push({x:x-dz/length*wobble,z:z+dx/length*wobble});}
 points[0]={...start};points[steps]={...end};return reverse?points.reverse():points;
}

/** Broad atlases need fewer ridge glyphs; preserve the approved local sheet unchanged. */
export function paperRidgeLod(span:number){const regional=Math.max(1,Math.min(3,Math.sqrt(span/840)));return {spacing:regional,opacity:1/Math.sqrt(regional)};}

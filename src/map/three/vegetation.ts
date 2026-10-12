import {forestCover} from '../artSample/layout';
export function woodlandCover(x:number,z:number){return forestCover(x,z,0);}
/** Stable, geographically distributed candidates; budget never starts in a map corner. */
export function vegetationCandidates(cx:number,cz:number,range:number){
 const points:{x:number;z:number;scale:number;rotation:number;priority:number;variant:number}[]=[],cell=3;
 for(let x=Math.floor((cx-range)/cell);x<=Math.ceil((cx+range)/cell);x++)for(let z=Math.floor((cz-range)/cell);z<=Math.ceil((cz+range)/cell);z++)for(let i=0;i<10;i++){
  let seed=Math.imul(x+9187,374761393)^Math.imul(z+411,668265263)^Math.imul(i+3,1274126177);
  const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return (seed>>>0)/4294967296;};
  const px=(x+rand())*cell,pz=(z+rand())*cell;
  if(Math.hypot(px-cx,pz-cz)>range||woodlandCover(px,pz)<.22||rand()>woodlandCover(px,pz))continue;
  points.push({x:px,z:pz,scale:.5+woodlandCover(px,pz)*.65+rand()*.95,rotation:rand()*Math.PI*2,priority:rand(),variant:Math.floor(rand()*3)});
 }
 // Interleave spatial sectors so a dense grove cannot spend the entire visible budget.
 // Species and transforms remain world-anchored; only visibility priority follows the view.
 const sectors=Array.from({length:4},()=>[] as typeof points);
 for(const p of points)sectors[Number(p.x>cx)*2+Number(p.z>cz)].push(p);
 for(const sector of sectors)sector.sort((a,b)=>a.priority-b.priority);
 const ordered:typeof points=[];
 for(let i=0;i<Math.max(...sectors.map(s=>s.length));i++)for(const sector of sectors)if(sector[i])ordered.push(sector[i]);
 return ordered;
}

/** Stable, geographically distributed candidates; budget never starts in a map corner. */
export function vegetationCandidates(cx:number,cz:number,range:number){
 const points:{x:number;z:number;scale:number;rotation:number;priority:number}[]=[],cell=12;
 for(let x=Math.floor((cx-range)/cell);x<=Math.ceil((cx+range)/cell);x++)for(let z=Math.floor((cz-range)/cell);z<=Math.ceil((cz+range)/cell);z++)for(let i=0;i<7;i++){
  let seed=Math.imul(x+9187,374761393)^Math.imul(z+411,668265263)^Math.imul(i+3,1274126177);
  const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)|0;return (seed>>>0)/4294967296;};
  const px=(x+rand())*cell,pz=(z+rand())*cell;
  if(Math.hypot(px-cx,pz-cz)>range)continue;
  points.push({x:px,z:pz,scale:.45+rand()*.8,rotation:rand()*Math.PI*2,priority:rand()});
 }
 return points.sort((a,b)=>a.priority-b.priority);
}

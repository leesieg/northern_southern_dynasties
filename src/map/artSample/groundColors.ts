import {Color,type BufferGeometry} from 'three';
import {palettes,forestCover,cityClearance,noise,smooth,type SampleSeason,type Point} from './layout';
import type {riverShape} from './riverShape';
/** Shared albedo, evaluated on real surface vertices in the sample's geographic frame. */
export function groundColors(geometry:BufferGeometry,season:SampleSeason,channel:ReturnType<typeof riverShape>|undefined,cities:Point[],origin:Point={x:0,z:0}){
 const p=palettes[season],base=new Color(p.ground),grass=new Color(p.grass),wood=new Color(p.forest),rock=new Color(p.rock),sand=new Color(season==='winter'?'#a5ad99':'#b4b290'),wet=new Color('#62785d');
 const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),color=geometry.getAttribute('color'),c=new Color();
 for(let i=0;i<position.count;i++){
  const wx=position.getX(i),wz=position.getZ(i),x=wx-origin.x,z=wz-origin.z,h=position.getY(i),cover=forestCover(x,z,h)*smooth(7,13,cityClearance(wx,wz,cities));
  const exposed=smooth(.045,.23,1-normal.getY(i))*(.2+.8*smooth(.36,.66,noise(x*.22+4,z*.22)));
  c.copy(base).lerp(grass,noise(x*.21,z*.21)*.7).lerp(wood,cover*.8).lerp(rock,exposed*.84).multiplyScalar(.88+noise(x*.065,z*.065)*.22);
  const bank=channel?.sample(wx,wz);if(bank&&bank.edge<bank.bank){const edge=Math.max(0,bank.edge),shoreWidth=.16+bank.inner*.85;c.lerp(sand,(1-smooth(shoreWidth*.35,shoreWidth,edge))*(.60+bank.inner*.35));c.lerp(wet,(1-smooth(0,.12,edge))*.45);}
  color.setXYZ(i,c.r,c.g,c.b);
 }color.needsUpdate=true;
}

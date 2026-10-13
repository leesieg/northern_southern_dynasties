import {useArtwork} from './artworkLoading';
import {useId,type CSSProperties} from 'react';
import type {CityBuilding} from '../core/construction';

/** One shared atlas; crop coordinates describe artwork, never game state. */
export function BuildingArtwork({building,level=1,className='',paper=false}:{building:CityBuilding;level?:number;className?:string;paper?:boolean}){
 const clipId=useId();
 const art=useArtwork(paper?'art/territory/buildings-paper-atlas-v1.png':'art/territory/buildings-atlas.png');
 const row={market:0,granary:1,hostel:2}[building],col=Math.max(0,Math.min(2,level-1));
 if(paper){
  const bounds=[[[0,0,365,400],[365,0,432,400],[797,0,457,400]],[[0,410,375,365],[380,410,420,365],[800,410,454,365]],[[0,780,375,420],[380,780,420,420],[800,780,454,420]]][row][col];
  return <svg aria-hidden="true" className={'building-artwork building-artwork--paper '+className+' is-'+art.state} viewBox={bounds.join(' ')} style={{backgroundImage:'none'}} overflow="hidden"><defs><clipPath id={clipId}><rect x={bounds[0]} y={bounds[1]} width={bounds[2]} height={bounds[3]}/></clipPath></defs><image clipPath={`url(#${clipId})`} href={art.url} width="1254" height="1254"/></svg>;
 }
 return <span aria-hidden="true" className={'building-artwork '+className+' is-'+art.state} style={{backgroundImage:`url(${art.url})`,'--art-x':`${col*50}%`,'--art-y':`${row*50}%`} as CSSProperties}/>;
}

/** Illustrative county-seat artwork selected by terrain, not a map reconstruction. */
export function CountyArtwork({terrain}:{terrain?:string}){
 const art=useArtwork('art/territory/counties-atlas.png');
 const tile=terrain==='河谷'?0:terrain==='丘陵'?1:terrain==='平原'?2:3;
 return <span aria-hidden="true" className={"county-artwork is-"+art.state} style={{backgroundImage:`url(${art.url})`,backgroundPosition:(tile%2)*100+'% '+Math.floor(tile/2)*100+'%'}}/>;
}

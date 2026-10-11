import {useArtwork} from './artworkLoading';
import type {CSSProperties} from 'react';
import type {CityBuilding} from '../core/construction';

/** One shared atlas; crop coordinates describe artwork, never game state. */
export function BuildingArtwork({building,level=1,className=''}:{building:CityBuilding;level?:number;className?:string}){
 const art=useArtwork('art/territory/buildings-atlas.png');
 const row={market:0,granary:1,hostel:2}[building],col=Math.max(0,Math.min(2,level-1));
 return <span aria-hidden="true" className={'building-artwork '+className+' is-'+art.state} style={{backgroundImage:`url(${art.url})`,'--art-x':`${col*50}%`,'--art-y':`${row*50}%`} as CSSProperties}/>;
}

/** Illustrative county-seat artwork selected by terrain, not a map reconstruction. */
export function CountyArtwork({terrain}:{terrain?:string}){
 const art=useArtwork('art/territory/counties-atlas.png');
 const tile=terrain==='河谷'?0:terrain==='丘陵'?1:terrain==='平原'?2:3;
 return <span aria-hidden="true" className={"county-artwork is-"+art.state} style={{backgroundImage:`url(${art.url})`,backgroundPosition:(tile%2)*100+'% '+Math.floor(tile/2)*100+'%'}}/>;
}

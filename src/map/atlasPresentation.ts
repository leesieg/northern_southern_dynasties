/** Presentation only: no world state or geographic coordinates are changed. */
export const PAPER_ZOOM = 4.8;
export const LANDSCAPE_ZOOM = 6.2;
export const CITY_VIEW_ZOOM = 11.7;
export type CameraAction='home'|'player'|'selected'|'in'|'out'|'left'|'right'|'north';
export function atlasPresentation(zoom:number,tilted:boolean){
  const landscape=Math.max(0,Math.min(1,(zoom-PAPER_ZOOM)/(LANDSCAPE_ZOOM-PAPER_ZOOM)));
  const close=Math.max(0,Math.min(1,(zoom-8.2)/(CITY_VIEW_ZOOM-8.2)));
  return {paper:1-landscape,strategic:zoom<=PAPER_ZOOM,terrain:tilted&&landscape>0,pitch:zoom<2.2?40*Math.min(1,(2.2-zoom)/1.1):tilted?44*landscape+22*close:0};
}

/** Paper gives way to real relief before the middle campaign view. */
export function atlasPaperStrength(zoom:number,flat=false){
  if(flat)return 1;
  const t=Math.max(0,Math.min(1,(zoom-PAPER_ZOOM)/(LANDSCAPE_ZOOM-PAPER_ZOOM)));
  return 1-t*t*(3-2*t);
}

/** Stronger rock/grass separation in the regional view, fading before close inspection. */
export function atlasRegionalStrength(zoom:number,flat=false){
 const close=Math.max(0,Math.min(1,(zoom-9.4)/.8));
 return (1-atlasPaperStrength(zoom,flat))*(1-close*close*(3-2*close));
}

/** Avoid the look-at pole and enter the strategic atlas with north at the top. */
export function normalizeAtlasCamera<T extends {zoom?:number;pitch?:number;bearing?:number}>(options:T,currentZoom:number):T{
 let result={...options};
 if(options.zoom!==undefined&&options.zoom<=PAPER_ZOOM&&currentZoom>PAPER_ZOOM)result={...result,bearing:0};
 if(options.pitch===0)result={...result,pitch:.06,bearing:0};
 return result;
}

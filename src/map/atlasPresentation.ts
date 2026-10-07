/** Presentation only: no world state or geographic coordinates are changed. */
export const PAPER_ZOOM = 4.8;
export const LANDSCAPE_ZOOM = 6.2;
export const CITY_VIEW_ZOOM = 11.3;
export type CameraAction='home'|'player'|'selected'|'in'|'out'|'left'|'right'|'north';
export function atlasPresentation(zoom:number,tilted:boolean){
  const landscape=Math.max(0,Math.min(1,(zoom-PAPER_ZOOM)/(LANDSCAPE_ZOOM-PAPER_ZOOM)));
  const close=Math.max(0,Math.min(1,(zoom-8.2)/(CITY_VIEW_ZOOM-8.2)));
  return {paper:1-landscape,strategic:zoom<=PAPER_ZOOM,terrain:tilted&&landscape>0,pitch:tilted?44*landscape+8*close:0};
}

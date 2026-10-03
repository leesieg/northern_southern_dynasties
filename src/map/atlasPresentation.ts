/** Presentation only: no world state or geographic coordinates are changed. */
export const PAPER_ZOOM = 4.8;
export const LANDSCAPE_ZOOM = 6.2;
export function atlasPresentation(zoom:number,tilted:boolean){
  const landscape=Math.max(0,Math.min(1,(zoom-PAPER_ZOOM)/(LANDSCAPE_ZOOM-PAPER_ZOOM)));
  return {paper:1-landscape,strategic:zoom<=PAPER_ZOOM,terrain:tilted&&landscape>0,pitch:tilted?44*landscape:0};
}

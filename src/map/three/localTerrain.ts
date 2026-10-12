import type {ElevationManifest} from './elevationTiles';
import type {DEMGrid} from './geography';
/** Source extent of the packaged z12 Terrarium samples, not invented relief. */
export const yubiTerrain:ElevationManifest={zoom:12,west:3309,east:3312,north:1613,south:1616,tileSize:256};
export function usesYubiTerrain(lon:number,lat:number){return lon>=110.90&&lon<=111.01&&lat>=35.52&&lat<=35.62;}
/** A small local DEM must replace whole coarse cells, otherwise their faces cover it.
 * Source samples remain untouched; only the rendered mesh is padded and resampled. */
export function localTerrainMesh(source:DEMGrid,coarse:DEMGrid,step=8):DEMGrid{
 const dx=coarse.width/Math.ceil(coarse.columns/step),dy=coarse.height/Math.ceil(coarse.rows/step);
 const west=coarse.west+Math.floor((source.west-coarse.west)/dx)*dx,north=coarse.north+Math.floor((source.north-coarse.north)/dy)*dy;
 const east=coarse.west+Math.ceil((source.west+source.width-coarse.west)/dx)*dx,south=coarse.north+Math.ceil((source.north+source.height-coarse.north)/dy)*dy;
 return {west,north,width:east-west,height:south-north,columns:Math.min(1024,Math.ceil((east-west)/source.width*source.columns)),rows:Math.min(1024,Math.ceil((south-north)/source.height*source.rows))};
}

export const jiankangTerrain:ElevationManifest={zoom:11,west:1698,east:1701,north:830,south:833,tileSize:256};
export function usesJiankangTerrain(lon:number,lat:number){return lon>=118.55&&lon<=118.95&&lat>=31.93&&lat<=32.23;}

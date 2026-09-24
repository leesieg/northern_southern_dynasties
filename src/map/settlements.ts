import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { sites } from '../data/scenario';

// Symbolic settlement miniatures, not measured ancient city footprints.
export function settlements():FeatureCollection<Polygon>{
  const features:Feature<Polygon>[]=[];
  for(const site of sites){
    const half=site.capital?3200:site.rank==='county'?600:1800;
    function block(x:number,y:number,w:number,h:number,base:number,height:number,color:string){
      const dx=1/(111320*Math.cos(site.lat*Math.PI/180)),dy=1/111320;
      const ring=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>[site.lon+(x+a*w/2)*dx,site.lat+(y+b*h/2)*dy]);
      features.push({type:'Feature',properties:{site:site.id,color,base,height},geometry:{type:'Polygon',coordinates:[ring]}});
    }
    block(0,0,half*2,half*2,0,24,'#b5aa89');
    // Enclosure walls, four gate towers and tiered roofs.
    for(const sign of [-1,1]){
      block(sign*half,0,half*.075,half*2,0,200,'#706f5d');
      block(0,sign*half,half*2,half*.075,0,200,'#706f5d');
      for(const [x,y] of [[sign*half,0],[0,sign*half]]){
        block(x,y,half*.3,half*.22,0,360,'#9d8b68');
        block(x,y,half*.39,half*.32,360,425,'#545b51');
        block(x,y,half*.29,half*.21,425,465,'#62685a');
      }
    }
    const rows=site.capital?3:2;
    for(let row=0;row<rows;row++)for(let col=0;col<3;col++){
      const x=(col-1)*half*.54,y=(row-(rows-1)/2)*half*.55;
      block(x,y,half*.32,half*.24,0,160,'#b8a481');
      block(x,y,half*.4,half*.33,160,210,'#645d4d');
      block(x,y,half*.28,half*.17,210,235,'#7c7560');
    }
    if(site.capital){
      block(0,half*.25,half*.6,half*.45,0,410,'#b49c74');
      block(0,half*.25,half*.72,half*.56,410,475,'#695849');
      block(0,half*.25,half*.5,half*.32,475,560,'#80694f');
    }
  }
  return {type:'FeatureCollection',features};
}

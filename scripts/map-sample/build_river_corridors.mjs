/** Build the bundled display-water network; never used as historical borders or travel rules.
 * Source: Natural Earth 1:10m rivers/lake centerlines, public domain, v5.0.0.
 * node scripts/map-sample/build_river_corridors.mjs <downloaded GeoJSON>
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const input=readFileSync(process.argv[2]),data=JSON.parse(input),features=[];
const bounds=[56,11,146,62];
const inside=p=>p[0]>=bounds[0]&&p[0]<=bounds[2]&&p[1]>=bounds[1]&&p[1]<=bounds[3];
for(const feature of data.features){
 const rank=Number(feature.properties.scalerank);if(rank>6)continue;
 const paths=feature.geometry.type==='MultiLineString'?feature.geometry.coordinates:[feature.geometry.coordinates];
 for(const path of paths){let run=[];
  const flush=()=>{if(run.length>1)features.push({type:'Feature',properties:{name:feature.properties.name,scalerank:rank},geometry:{type:'LineString',coordinates:run}});run=[];};
  for(let i=0;i<path.length;i++){const p=path[i];if(inside(p)){if(!run.length&&i)run.push(path[i-1]);run.push(p);}else if(run.length){run.push(p);flush();}}
  flush();
 }
}
const result={type:'FeatureCollection',source:'Natural Earth 1:10m rivers and lake centerlines v5.0.0',url:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/',license:'Public domain',sourceSHA256:createHash('sha256').update(input).digest('hex'),description:'Modern generalized water centerlines. Display reference, not a reconstruction of sixth-century channels.',features};
writeFileSync('public/art/campaign/river-corridors.geojson',JSON.stringify(result));
console.log({features:features.length,points:features.reduce((n,f)=>n+f.geometry.coordinates.length,0),bytes:JSON.stringify(result).length,sourceSHA256:result.sourceSHA256});

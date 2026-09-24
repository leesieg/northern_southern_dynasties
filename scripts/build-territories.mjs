import { territoryNodes, descendantSites } from '../src/data/territorialHierarchy.ts';
// Offline design geometry, NOT reconstructed historical counties.
// Shared Voronoi edges are subdivided identically before clipping to Natural Earth land.
import fs from 'node:fs';
import clipping from 'polygon-clipping';
import { administration } from '../src/data/administration.ts';
import { sites, polities } from '../src/data/scenario.ts';
const bounds=[[73,18],[125,18],[125,44],[73,44]];
const domain=[[[73,38],[81,39],[90,40],[94,38],[100,36],[99,29],[101,22],[108,19],[116,19],[123,25],[123,35],[125,40],[123,43],[115,43],[109,42],[100,43],[91,44],[82,44],[73,41],[73,38]]];
const land=JSON.parse(fs.readFileSync('public/data/land.geojson','utf8'));
const polygons=land.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]);
const mask=clipping.intersection(polygons,domain);
function clipHalfPlane(ring,a,b,c){
  const out=[];
  for(let i=0;i<ring.length;i++){
    const p=ring[i],q=ring[(i+1)%ring.length],u=a*p[0]+b*p[1]-c,v=a*q[0]+b*q[1]-c;
    if(u<=1e-9)out.push(p);
    if((u<0&&v>0)||(u>0&&v<0)){const t=u/(u-v);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }
  return out;
}
function contour(ring){
  return ring.flatMap((p,i)=>{
    const q=ring[(i+1)%ring.length];
    // Canonical direction makes both sides of a shared edge exactly coincident.
    const forward=p[0]<q[0]-1e-8||(Math.abs(p[0]-q[0])<1e-8&&p[1]<q[1]);
    const a=forward?p:q,b=forward?q:p,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<1e-8)return [p];
    const n=Math.max(2,Math.ceil(length/.16)),amplitude=Math.min(.07,length*.035);
    const points=Array.from({length:n+1},(_,k)=>{const t=k/n,offset=Math.sin(t*Math.PI)*Math.sin(t*Math.PI*4)*amplitude;return [a[0]+dx*t-dy/length*offset,a[1]+dy*t+dx/length*offset].map(v=>Math.round(v*1e8)/1e8);});
    return (forward?points:points.reverse()).slice(0,-1);
  });
}
const features=sites.map((site,index)=>{
  let ring=bounds;
  for(const other of sites){if(other===site)continue;
    // Longitude weighting approximates distances at the mid-latitudes of this scenario.
    const a=(other.lon-site.lon)*.67,b=other.lat-site.lat;
    const c=(.67*(other.lon**2-site.lon**2)+other.lat**2-site.lat**2)/2;
    ring=clipHalfPlane(ring,a,b,c);
  }
  ring=contour(ring);ring.push(ring[0]);
  const coordinates=clipping.intersection([ring],mask);
  if(!coordinates.length)throw new Error(`Empty territory: ${site.id}`);
  return {type:'Feature',id:site.id,properties:{id:site.id,name:site.name,polity:site.polity,prefecture:administration[site.id]?.prefecture??'',group:administration[site.id]?.group??'',color:polities[site.polity].color,tone:index%3},geometry:{type:'MultiPolygon',coordinates}};
});
const realms=Object.keys(polities).map(id=>({type:'Feature',properties:{id,color:polities[id].color},geometry:{type:'MultiPolygon',coordinates:clipping.union(...features.filter(f=>f.properties.polity===id).map(f=>f.geometry.coordinates))}}));
fs.writeFileSync('src/data/territories.json',JSON.stringify({type:'FeatureCollection',features}));
fs.writeFileSync('src/data/territory-realms.json',JSON.stringify({type:'FeatureCollection',features:realms}));
const groups=[...new Set(Object.values(administration).map(a=>a.group))];
const prefectures=groups.map(group=>{const cells=features.filter(f=>f.properties.group===group);return {type:'Feature',properties:{group,name:cells[0].properties.prefecture},geometry:{type:'MultiPolygon',coordinates:clipping.union(...cells.map(f=>f.geometry.coordinates))}};});
fs.writeFileSync('src/data/prefectures.json',JSON.stringify({type:'FeatureCollection',features:prefectures}));
console.log(`Generated ${features.length} land-clipped design territories and ${realms.length} realm outlines.`);

const hierarchy=Object.values(territoryNodes).filter(n=>n.level!=='city').map(node=>{
  const ids=descendantSites(node.id),cells=features.filter(f=>ids.includes(f.properties.id));
  return {type:'Feature',properties:{id:node.id,name:node.name,level:node.level,geometryStatus:'schematic'},geometry:{type:'MultiPolygon',coordinates:clipping.union(...cells.map(f=>f.geometry.coordinates))}};
});
fs.writeFileSync('src/data/hierarchy-geometry.json',JSON.stringify({type:'FeatureCollection',features:hierarchy}));

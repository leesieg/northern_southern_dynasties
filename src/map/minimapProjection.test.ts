import {it,expect} from 'vitest';
import type {FeatureCollection,MultiPolygon} from 'geojson';
import {minimapProjection,minimapPoint} from './minimapProjection';
const regions:FeatureCollection<MultiPolygon>={type:'FeatureCollection',features:[{type:'Feature',properties:{id:'liang'},geometry:{type:'MultiPolygon',coordinates:[[[[105,25],[121,25],[121,38],[105,38],[105,25]],[[110,30],[110,31],[111,31],[111,30],[110,30]]]]}}]};
it('fits modeled territory in the circle and roundtrips geographic clicks without changing source data',()=>{
 const original=JSON.stringify(regions),p=minimapProjection(regions);
 for(const ll of regions.features[0].geometry.coordinates.flat(2)){const pixel=p.project(ll[0],ll[1]),back=p.unproject(pixel.x,pixel.y);expect(Math.hypot(pixel.x-100,pixel.y-100)).toBeLessThan(100);expect(back.lng).toBeCloseTo(ll[0],8);expect(back.lat).toBeCloseTo(ll[1],8);}
 expect(p.path(regions.features[0].geometry).match(/Z/g)).toHaveLength(2);expect(JSON.stringify(regions)).toBe(original);
});
it('handles CSS-scaled hit areas and rejects clicks outside the circular chart',()=>{
 const r={left:100,top:200,width:168,height:168};expect(minimapPoint(184,284,r)).toEqual({x:100,y:100});expect(minimapPoint(100,200,r)).toBeNull();expect(minimapPoint(268,284,r)).toEqual({x:200,y:100});
 const p=minimapProjection({type:'FeatureCollection',features:[]});expect(Number.isFinite(p.project(118.78,32.05).x)).toBe(true);
});
it('rejects zero-size hit regions and filters invalid geometry while a save is changing',()=>{
 expect(minimapPoint(0,0,{left:0,top:0,width:0,height:0})).toBeNull();
 const broken=structuredClone(regions);broken.features[0].geometry.coordinates[0][0].push([NaN,Infinity]);const p=minimapProjection(broken);expect(p.path(broken.features[0].geometry)).not.toMatch(/NaN|Infinity/);expect(Object.values(p.paper).every(Number.isFinite)).toBe(true);
});

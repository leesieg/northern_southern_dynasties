import { describe,expect,it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { atlasStyle, DEM_TILES, POLITICAL_LAYERS, ROAD_LAYERS } from './atlasStyle';
import { activeRoute, previewArmyRoute, roadFeatures, siteFeatures,routeCoordinates } from './geography';
import { territories, territoryRealms } from './territories';
import { sites, roads } from '../data/scenario';
import { act,advance,newWorld,planRoute,position } from '../core/world';
import { mapResourceUrl } from './mapResources';

describe('atlas data and style contracts (no UI)',()=>{
  it('starts a retarget preview at the army actual position on its current road',()=>{const first=planRoute('jiankang','jingkou')!,next=planRoute('jingkou','pengcheng')!,army={realm:'liang' as const,location:'jiankang',troops:600,morale:80,supply:200,siege:0,journey:{route:first.route,durations:first.durations,leg:0,elapsed:1,started:0}},coordinates=previewArmyRoute(army,next.route).features[0].geometry.coordinates;expect(coordinates[0]).not.toEqual([sites.find(s=>s.id==='jiankang')!.lon,sites.find(s=>s.id==='jiankang')!.lat]);expect(coordinates.at(-1)).toEqual([sites.find(s=>s.id==='pengcheng')!.lon,sites.find(s=>s.id==='pengcheng')!.lat]);});
  it('relays only the two public tile providers in local previews',()=>{
    expect(mapResourceUrl('https://tiles.mapterhorn.com/3/6/2.webp','http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173/__atlas/dem/3/6/2.webp');
    expect(mapResourceUrl('https://tiles.openfreemap.org/planet/20260913_164504_pt/4/12/6.pbf','http://localhost:4173')).toBe('http://localhost:4173/__atlas/vector/planet/20260913_164504_pt/4/12/6.pbf');
    expect(mapResourceUrl('https://other.example/private','http://localhost:5173')).toBe('https://other.example/private');
    expect(mapResourceUrl('/data/land.geojson','http://localhost:5173')).toBe('/data/land.geojson');
    expect(mapResourceUrl(DEM_TILES,'https://game.example')).toBe(DEM_TILES);
  });
  it('passes the official style specification, including hillshade and elevation colors',()=>{
    const style=atlasStyle();
    expect(validateStyleMin(style).map(error=>error.message)).toEqual([]);
    expect(style.sources['dem-visual']).toMatchObject({type:'raster-dem',encoding:'terrarium',tiles:[DEM_TILES]});
    expect(style.sources['dem-terrain']).toMatchObject({encoding:'terrarium'});
    const ids=style.layers.map(layer=>layer.id);expect(new Set(ids).size).toBe(ids.length);
    for(const id of [...POLITICAL_LAYERS,...ROAD_LAYERS])expect(ids).toContain(id);
    expect(ids.indexOf('ocean')).toBeGreaterThan(ids.indexOf('realm-tint'));
    expect(ids.indexOf('route-gold')).toBeGreaterThan(ids.indexOf('rivers-major'));
  });
  it('includes local fallback geometry and source attribution without modern labels or roads',()=>{
    const style=atlasStyle();expect(style.sources.land).toMatchObject({type:'geojson',data:'/data/land.geojson'});
    for(const id of ['land','natural','dem-visual'])expect(style.sources[id]).toHaveProperty('attribution');
    const sources=style.layers.filter(layer=>'source-layer' in layer).map(layer=>(layer as {'source-layer':string})['source-layer']);
    expect(sources.every(source=>['water','waterway','landcover'].includes(source))).toBe(true);
    expect(JSON.stringify(style)).not.toContain('eox');
  });
  it('preserves the same journey position and destination in rendered route data',()=>{
    const world=newWorld(),preview=planRoute('jiankang','changan')!;
    expect(activeRoute(world,preview.route).features[0].geometry.coordinates).toEqual(routeCoordinates(preview.route));
    act(world,{type:'travel',destination:'changan'});advance(world,3);
    const pos=position(world.people[0]),route=activeRoute(world,[]).features[0].geometry.coordinates;
    expect(route[0]).toEqual([pos.lon,pos.lat]);expect(route.at(-1)).toEqual([108.94,34.27]);
    const snapshot=structuredClone(world);activeRoute(world,[]);expect(world).toEqual(snapshot);
  });
  it('keeps overlays geographically valid and matches every travel node',()=>{
    expect(siteFeatures.features).toHaveLength(sites.length);expect(roadFeatures.features).toHaveLength(roads.filter(r=>!r.legacyOnly).length);
    const coordinates=[...territories.features,...territoryRealms.features].flatMap(f=>f.geometry.coordinates.flat(2));
    for(const [lon,lat] of coordinates){expect(Number.isFinite(lon)&&Number.isFinite(lat)).toBe(true);expect(lon).toBeGreaterThan(70);expect(lon).toBeLessThan(138);expect(lat).toBeGreaterThan(15);expect(lat).toBeLessThan(55);}
  });
  it('retires legacy extrusion so zoom and loading cannot reactivate a second city representation',()=>{
    const style=atlasStyle();expect(style.sources).not.toHaveProperty('settlements');expect(style.layers.some(layer=>layer.id==='settlement-buildings')).toBe(false);
  });
});

it('keeps canopy and water pigments inside their source masks and supplies bounded static RGBA tiles',async()=>{
 const {ATLAS_MATERIALS,atlasMaterial}=await import('./atlasMaterials');
 const layers=atlasStyle().layers;
 expect(layers.find(layer=>layer.id==='woodland-canopy')).toMatchObject({source:'natural','source-layer':'landcover',filter:['==',['get','class'],'wood']});
 expect(layers.find(layer=>layer.id==='water-silk')).toMatchObject({source:'natural','source-layer':'water'});
 const patterns=layers.flatMap(layer=>layer.type==='fill'&&typeof layer.paint?.['fill-pattern']==='string'?[layer.paint['fill-pattern']]:[]);
 expect(new Set(patterns)).toEqual(new Set(ATLAS_MATERIALS));
 for(const name of ATLAS_MATERIALS){
  const image=atlasMaterial(name);
  expect(image.data.length).toBe(image.width*image.height*4);
  expect(image.width&(image.width-1)).toBe(0);expect(image.height&(image.height-1)).toBe(0);
  const alpha=image.data.filter((_,i)=>i%4===3);
  expect(Math.max(...alpha)).toBeGreaterThan(0);expect(Math.max(...alpha)).toBeLessThan(200);
  expect(atlasMaterial(name).data).toEqual(image.data);
 }
});

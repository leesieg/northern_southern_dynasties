import {PAPER_ZOOM, LANDSCAPE_ZOOM} from './atlasPresentation';
import hierarchyGeometry from '../data/hierarchy-geometry.json';
import type { StyleSpecification } from 'maplibre-gl';
import { emptyCollection, roadFeatures, siteFeatures } from './geography';
import prefectures from '../data/prefectures.json';
import type { FeatureCollection } from 'geojson';
import { territories, territoryRealms } from './territories';

// Palette/layering adapted from MapStage's antique preset (MIT).
// See public/licenses/MapStage-LICENSE.txt and THIRD_PARTY_NOTICES.md.
export const DEM_TILES='https://tiles.mapterhorn.com/{z}/{x}/{y}.webp';
export const VECTOR_TILEJSON='https://tiles.openfreemap.org/planet';

export function atlasStyle():StyleSpecification {
  const dem={type:'raster-dem' as const,tiles:[DEM_TILES],tileSize:512,encoding:'terrarium' as const,attribution:'<a href="https://mapterhorn.com/attribution/" target="_blank" rel="noopener">© Mapterhorn</a>'};
  return {
    version:8,
    name:'风云南北朝 · 山河舆图',
    projection:{type:'mercator'},
    light:{anchor:'map',color:'#fff0ce',intensity:.55,position:[1.5,315,42]},
    sky:{'sky-color':'#aebfb7','horizon-color':'#e3d8b8','fog-color':'#d0cdb3','sky-horizon-blend':.8,'horizon-fog-blend':.65,'fog-ground-blend':['interpolate',['linear'],['zoom'],PAPER_ZOOM,1,LANDSCAPE_ZOOM,.88],'atmosphere-blend':0},
    sources:{
      land:{type:'geojson',data:import.meta.env.BASE_URL+'data/land.geojson',attribution:'<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>'},
      'local-rivers':{type:'geojson',data:import.meta.env.BASE_URL+'data/rivers.geojson'},
      'dem-visual':{...dem,maxzoom:12},
      'dem-terrain':{...dem,maxzoom:12},
      natural:{type:'vector',url:VECTOR_TILEJSON,attribution:'<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'},
      realms:{type:'geojson',data:territoryRealms},frontiers:{type:'geojson',data:territoryRealms},
      hierarchy:{type:'geojson',data:hierarchyGeometry as FeatureCollection},
      'history-event':{type:'geojson',data:emptyCollection()},
      prefectures:{type:'geojson',data:prefectures as FeatureCollection},
      territories:{type:'geojson',data:territories,promoteId:'id'},
      roads:{type:'geojson',data:roadFeatures},sites:{type:'geojson',data:siteFeatures},
      route:{type:'geojson',data:emptyCollection()},selection:{type:'geojson',data:emptyCollection()},
    },
    layers:[
      {id:'background',type:'background',paint:{'background-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#b9b19a',LANDSCAPE_ZOOM,'#527e80']}},
      {id:'land-fallback',type:'fill',source:'land',paint:{'fill-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#e0d1ad',LANDSCAPE_ZOOM,'#b8bf93']}},
      {id:'elevation-colors',type:'color-relief',source:'dem-visual',paint:{'color-relief-opacity':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.08,LANDSCAPE_ZOOM,1],'color-relief-color':['interpolate',['linear'],['elevation'],-5000,'#456b75',-1,'#7d9b95',0,'#c9c49b',100,'#bcc496',350,'#a4b282',750,'#909f77',1300,'#a5a680',2100,'#b7aa87',3000,'#a29d8a',4000,'#b7b1a0',5000,'#d1cdbd',6000,'#e4e2d7',7500,'#f2f0e8']}},
      {id:'earth-grain',type:'fill',source:'land',paint:{'fill-pattern':'atlas-earth-grain','fill-opacity':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.18,LANDSCAPE_ZOOM,.65]}},
      {id:'grassland',type:'fill',source:'natural','source-layer':'landcover',minzoom:5,filter:['==',['get','class'],'grass'],paint:{'fill-color':'#b1b783','fill-opacity':['interpolate',['linear'],['zoom'],5,0,7,.16,10,.23]}},
      {id:'dry-ground',type:'fill',source:'natural','source-layer':'landcover',minzoom:5,filter:['==',['get','class'],'sand'],paint:{'fill-color':'#d3ba88','fill-opacity':['interpolate',['linear'],['zoom'],5,0,7,.25,10,.36]}},
      {id:'woodland',type:'fill',source:'natural','source-layer':'landcover',minzoom:5,filter:['==',['get','class'],'wood'],paint:{'fill-color':'#506e4e','fill-opacity':['interpolate',['linear'],['zoom'],5,.06,7,.23,10,.35]}},
      {id:'woodland-canopy',type:'fill',source:'natural','source-layer':'landcover',minzoom:6,filter:['==',['get','class'],'wood'],paint:{'fill-pattern':'atlas-canopy','fill-opacity':['interpolate',['linear'],['zoom'],6,0,7,.42,9,.65]}},
      {id:'realm-tint',type:'fill',source:'realms',paint:{'fill-color':['get','color'],'fill-opacity':['interpolate',['linear'],['zoom'],3,.22,5,.16,8,.035]}},
      {id:'territory-fill',type:'fill',source:'territories',paint:{'fill-color':['get','color'],'fill-opacity':0}},
      {id:'territory-tone',type:'fill',source:'territories',paint:{'fill-color':['match',['get','tone'],0,'#fff0c6',1,'#314832','#d4c492'],'fill-opacity':['interpolate',['linear'],['zoom'],4,0,6,.12,9,.04]}},
      {id:'territory-border',type:'line',source:'territories',paint:{'line-color':'#534d39','line-width':['interpolate',['linear'],['zoom'],4,.3,6,.8,9,1.2],'line-opacity':['interpolate',['linear'],['zoom'],4,0,5,.45,8,.65]}},
      {id:'prefecture-boundary',type:'line',source:'prefectures',layout:{visibility:'none'},paint:{'line-color':'#e8d7a5','line-width':2.5,'line-opacity':.85}},
      {id:'territory-hover',type:'fill',source:'territories',paint:{'fill-color':'#fff1c2','fill-opacity':['case',['boolean',['feature-state','hover'],false],.22,0]}},
      {id:'territory-selected',type:'fill',source:'territories',paint:{'fill-color':'#f5db88','fill-opacity':['case',['boolean',['feature-state','selected'],false],.2,0]}},
      {id:'territory-selected-shadow',type:'line',source:'territories',paint:{'line-color':'#52432a','line-width':5,'line-opacity':['case',['boolean',['feature-state','selected'],false],.65,0]}},
      {id:'territory-selected-edge',type:'line',source:'territories',paint:{'line-color':'#ffe5a1','line-width':2,'line-opacity':['case',['boolean',['feature-state','selected'],false],1,0]}},
      // Quiet administrative seams sit below the relief; selection remains the visual anchor.
      {id:'hierarchy-seam',type:'line',source:'hierarchy',layout:{visibility:'none','line-cap':'round','line-join':'round'},filter:['==',['get','level'],'realm'],paint:{'line-color':'#e6dbb4','line-width':['interpolate',['linear'],['zoom'],4,1.3,7,2.6,10,3.2],'line-opacity':['interpolate',['linear'],['zoom'],4,.2,7,.3,10,.2],'line-blur':.6}},
      {id:'hierarchy-lines',type:'line',source:'hierarchy',layout:{visibility:'none','line-cap':'round','line-join':'round'},filter:['==',['get','level'],'realm'],paint:{'line-color':'#746b4d','line-width':['interpolate',['linear'],['zoom'],4,.45,7,.8,10,1],'line-opacity':['interpolate',['linear'],['zoom'],4,.35,7,.48,10,.32]}},
      {id:'hierarchy-selected',type:'fill',source:'hierarchy',filter:['==',['get','id'],''],paint:{'fill-color':'#f0d287','fill-opacity':['interpolate',['linear'],['zoom'],4,.12,7,.055,10,.025]}},
      {id:'hierarchy-selected-edge',type:'line',source:'hierarchy',filter:['==',['get','id'],''],paint:{'line-color':'#ead49b','line-width':['interpolate',['linear'],['zoom'],4,1.4,7,2,10,2.4],'line-opacity':.9}},
      {id:'mountain-shadow',type:'hillshade',source:'dem-visual',paint:{'hillshade-exaggeration':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.16,LANDSCAPE_ZOOM,.8],'hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map','hillshade-shadow-color':'#2d473e','hillshade-highlight-color':'#f7e4b4','hillshade-accent-color':'#8b8062'}},
      {id:'fallback-rivers',type:'line',source:'local-rivers',maxzoom:6,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#517f86','line-width':['interpolate',['linear'],['zoom'],3,.6,6,1.2],'line-opacity':.55}},
      {id:'frontier-shadow',type:'line',source:'frontiers',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#403f35','line-width':['interpolate',['linear'],['zoom'],3,2,7,4],'line-opacity':.22,'line-blur':1}},
      {id:'frontier-ink',type:'line',source:'frontiers',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#756348','line-width':['interpolate',['linear'],['zoom'],3,.9,7,1.5],'line-opacity':.75}},
      {id:'frontier-thread',type:'line',source:'frontiers',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ece0b8','line-width':.6,'line-opacity':.8,'line-dasharray':[3,3]}},
      {id:'ocean',type:'fill',source:'natural','source-layer':'water',filter:['==',['get','class'],'ocean'],paint:{'fill-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#b9b19a',LANDSCAPE_ZOOM,'#537f82'],'fill-opacity':1}},
      {id:'inland-water',type:'fill',source:'natural','source-layer':'water',filter:['!=',['get','class'],'ocean'],paint:{'fill-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#a4afa0',LANDSCAPE_ZOOM,'#628e89'],'fill-opacity':1}},
      {id:'water-silk',type:'fill',source:'natural','source-layer':'water',paint:{'fill-pattern':'atlas-water-silk','fill-opacity':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.12,LANDSCAPE_ZOOM,.65,9,.8]}},
      {id:'water-bank',type:'line',source:'natural','source-layer':'water',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#53684e','line-width':['interpolate',['linear'],['zoom'],4,1,7,3.5,10,5],'line-blur':1,'line-opacity':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.12,LANDSCAPE_ZOOM,.36]}},
      {id:'water-coast',type:'line',source:'natural','source-layer':'water',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#8c8161',LANDSCAPE_ZOOM,'#d7d8b9'],'line-width':['interpolate',['linear'],['zoom'],3,.5,7,1,10,1.7],'line-opacity':.75}},
      {id:'river-banks',type:'line',source:'natural','source-layer':'waterway',minzoom:5,filter:['==',['get','class'],'river'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c1c7a2','line-opacity':.52,'line-width':['interpolate',['linear'],['zoom'],5,1.9,8,3.4,11,5.2]}},
      {id:'rivers-major',type:'line',source:'natural','source-layer':'waterway',filter:['==',['get','class'],'river'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#4b7a7d','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],3,.5,5,.9,8,1.7,11,2.6]}},
      {id:'rivers-minor',type:'line',source:'natural','source-layer':'waterway',minzoom:8,filter:['==',['get','class'],'stream'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#668e8b','line-opacity':.65,'line-width':['interpolate',['linear'],['zoom'],8,.4,12,1.1]}},
      {id:'campaign-trails',type:'line',source:'roads',minzoom:6.2,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c7b68e','line-opacity':['interpolate',['linear'],['zoom'],6.2,0,8,.5,10,.72],'line-width':['interpolate',['linear'],['zoom'],6.2,.6,9,1.8,11,3]}},
      {id:'road-casing',type:'line',source:'roads',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#eee0b8','line-opacity':.5,'line-width':3}},
      {id:'road-ink',type:'line',source:'roads',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#796346','line-opacity':.75,'line-width':1,'line-dasharray':[4,3]}},
      {id:'route-shadow',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#493d2e','line-opacity':.6,'line-width':5,'line-blur':1}},
      {id:'route-gold',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fae5a4','line-width':2.4}},
      {id:'site-halo',type:'circle',source:'sites',paint:{'circle-radius':['case',['get','capital'],5,3.5],'circle-color':'#f2e5c5','circle-stroke-color':'#746748','circle-stroke-width':1}},
      {id:'site-heart',type:'circle',source:'sites',paint:{'circle-radius':['case',['get','capital'],2,1.3],'circle-color':'#63523b'}},
      {id:'history-event-ring',type:'circle',source:'history-event',paint:{'circle-radius':22,'circle-color':'#a73c2f','circle-opacity':.25,'circle-stroke-width':3,'circle-stroke-color':'#a73c2f'}},
      {id:'selected-ring',type:'circle',source:'selection',paint:{'circle-radius':13,'circle-color':'#e2c885','circle-opacity':.14,'circle-stroke-color':'#f4dfa1','circle-stroke-width':2,'circle-pitch-alignment':'map'}},
    ],
  };
}

export const POLITICAL_LAYERS=['territory-tone','realm-tint','frontier-shadow','frontier-ink','frontier-thread'];
export const ROAD_LAYERS=['road-casing','road-ink'];

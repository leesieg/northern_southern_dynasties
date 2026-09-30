import {PAPER_ZOOM, LANDSCAPE_ZOOM} from './atlasPresentation';
import hierarchyGeometry from '../data/hierarchy-geometry.json';
import type { StyleSpecification } from 'maplibre-gl';
import { emptyCollection, roadFeatures, siteFeatures } from './geography';
import prefectures from '../data/prefectures.json';
import type { FeatureCollection } from 'geojson';
import { territories, territoryRealms } from './territories';
import { settlements } from './settlements';

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
    light:{anchor:'viewport',color:'#fff4d8',intensity:.42,position:[1.5,315,45]},
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
      settlements:{type:'geojson',data:settlements()},
    },
    layers:[
      {id:'background',type:'background',paint:{'background-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#b9b19a',LANDSCAPE_ZOOM,'#789491']}},
      {id:'land-fallback',type:'fill',source:'land',paint:{'fill-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#e0d1ad',LANDSCAPE_ZOOM,'#bac29e']}},
      {id:'elevation-colors',type:'color-relief',source:'dem-visual',paint:{'color-relief-opacity':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.08,LANDSCAPE_ZOOM,1],'color-relief-color':['interpolate',['linear'],['elevation'],-5000,'#6e9194',-1,'#94afaa',0,'#c3c8aa',100,'#c3c8aa',350,'#b2bea0',750,'#a4b192',1300,'#b2b495',2100,'#c1b693',3000,'#bbae92',4000,'#c9bd9f',5000,'#d7cfb9',6000,'#e2dfd0',7500,'#f1eee5']}},
      {id:'woodland',type:'fill',source:'natural','source-layer':'landcover',minzoom:5,filter:['==',['get','class'],'wood'],paint:{'fill-color':'#6e856c','fill-opacity':['interpolate',['linear'],['zoom'],5,.06,8,.16,12,.2]}},
      {id:'realm-tint',type:'fill',source:'realms',paint:{'fill-color':['get','color'],'fill-opacity':['interpolate',['linear'],['zoom'],3,.22,5,.18,8,.07]}},
      {id:'territory-fill',type:'fill',source:'territories',paint:{'fill-color':['get','color'],'fill-opacity':0}},
      {id:'territory-tone',type:'fill',source:'territories',paint:{'fill-color':['match',['get','tone'],0,'#fff0c6',1,'#314832','#d4c492'],'fill-opacity':['interpolate',['linear'],['zoom'],4,0,6,.12,9,.04]}},
      {id:'territory-border',type:'line',source:'territories',paint:{'line-color':'#534d39','line-width':['interpolate',['linear'],['zoom'],4,.3,6,.8,9,1.2],'line-opacity':['interpolate',['linear'],['zoom'],4,0,5,.45,8,.65]}},
      {id:'prefecture-boundary',type:'line',source:'prefectures',layout:{visibility:'none'},paint:{'line-color':'#e8d7a5','line-width':2.5,'line-opacity':.85}},
      {id:'territory-hover',type:'fill',source:'territories',paint:{'fill-color':'#fff1c2','fill-opacity':['case',['boolean',['feature-state','hover'],false],.22,0]}},
      {id:'territory-selected',type:'fill',source:'territories',paint:{'fill-color':'#f5db88','fill-opacity':['case',['boolean',['feature-state','selected'],false],.2,0]}},
      {id:'territory-selected-shadow',type:'line',source:'territories',paint:{'line-color':'#52432a','line-width':5,'line-opacity':['case',['boolean',['feature-state','selected'],false],.65,0]}},
      {id:'territory-selected-edge',type:'line',source:'territories',paint:{'line-color':'#ffe5a1','line-width':2,'line-opacity':['case',['boolean',['feature-state','selected'],false],1,0]}},
      {id:'hierarchy-lines',type:'line',source:'hierarchy',filter:['==',['get','level'],'realm'],paint:{'line-color':'#605238','line-width':1.8,'line-opacity':.7}},
      {id:'hierarchy-selected',type:'fill',source:'hierarchy',filter:['==',['get','id'],''],paint:{'fill-color':'#f0d287','fill-opacity':.18}},
      {id:'hierarchy-selected-edge',type:'line',source:'hierarchy',filter:['==',['get','id'],''],paint:{'line-color':'#ffe2a0','line-width':3,'line-opacity':.95}},
      {id:'mountain-shadow',type:'hillshade',source:'dem-visual',paint:{'hillshade-exaggeration':['interpolate',['linear'],['zoom'],PAPER_ZOOM,.16,LANDSCAPE_ZOOM,.55],'hillshade-illumination-direction':315,'hillshade-illumination-anchor':'map','hillshade-shadow-color':'#393c30','hillshade-highlight-color':'#f2eedc','hillshade-accent-color':'#777158'}},
      {id:'fallback-rivers',type:'line',source:'local-rivers',maxzoom:6,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#517f86','line-width':['interpolate',['linear'],['zoom'],3,.6,6,1.2],'line-opacity':.55}},
      {id:'frontier-shadow',type:'line',source:'frontiers',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#403f35','line-width':['interpolate',['linear'],['zoom'],3,2,7,4],'line-opacity':.22,'line-blur':1}},
      {id:'frontier-ink',type:'line',source:'frontiers',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#756348','line-width':['interpolate',['linear'],['zoom'],3,.9,7,1.5],'line-opacity':.75}},
      {id:'frontier-thread',type:'line',source:'frontiers',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ece0b8','line-width':.6,'line-opacity':.8,'line-dasharray':[3,3]}},
      {id:'ocean',type:'fill',source:'natural','source-layer':'water',filter:['==',['get','class'],'ocean'],paint:{'fill-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#b9b19a',LANDSCAPE_ZOOM,'#789c99'],'fill-opacity':1}},
      {id:'water-coast',type:'line',source:'natural','source-layer':'water',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#796f54',LANDSCAPE_ZOOM,'#c6d2bc'],'line-width':['interpolate',['linear'],['zoom'],3,1,8,2.2],'line-opacity':.8}},
      {id:'inland-water',type:'fill',source:'natural','source-layer':'water',filter:['!=',['get','class'],'ocean'],paint:{'fill-color':['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#a4afa0',LANDSCAPE_ZOOM,'#739996'],'fill-opacity':1}},
      {id:'rivers-major',type:'line',source:'natural','source-layer':'waterway',filter:['==',['get','class'],'river'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#507d82','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],3,.5,5,.9,8,1.7,11,2.6]}},
      {id:'rivers-minor',type:'line',source:'natural','source-layer':'waterway',minzoom:8,filter:['==',['get','class'],'stream'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#668e8b','line-opacity':.65,'line-width':['interpolate',['linear'],['zoom'],8,.4,12,1.1]}},
      {id:'road-casing',type:'line',source:'roads',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#eee0b8','line-opacity':.5,'line-width':3}},
      {id:'road-ink',type:'line',source:'roads',layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#796346','line-opacity':.75,'line-width':1,'line-dasharray':[4,3]}},
      {id:'route-shadow',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#493d2e','line-opacity':.6,'line-width':5,'line-blur':1}},
      {id:'route-gold',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fae5a4','line-width':2.4}},
      {id:'settlement-buildings',type:'fill-extrusion',source:'settlements',minzoom:6.4,paint:{'fill-extrusion-color':['get','color'],'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','height'],'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':true}},
      {id:'site-halo',type:'circle',source:'sites',paint:{'circle-radius':['case',['get','capital'],5,3.5],'circle-color':'#f2e5c5','circle-stroke-color':'#746748','circle-stroke-width':1}},
      {id:'site-heart',type:'circle',source:'sites',paint:{'circle-radius':['case',['get','capital'],2,1.3],'circle-color':'#63523b'}},
      {id:'history-event-ring',type:'circle',source:'history-event',paint:{'circle-radius':22,'circle-color':'#a73c2f','circle-opacity':.25,'circle-stroke-width':3,'circle-stroke-color':'#a73c2f'}},
      {id:'selected-ring',type:'circle',source:'selection',paint:{'circle-radius':13,'circle-color':'#e2c885','circle-opacity':.14,'circle-stroke-color':'#f4dfa1','circle-stroke-width':2,'circle-pitch-alignment':'map'}},
    ],
  };
}

export const POLITICAL_LAYERS=['territory-tone','realm-tint','frontier-shadow','frontier-ink','frontier-thread'];
export const ROAD_LAYERS=['road-casing','road-ink'];

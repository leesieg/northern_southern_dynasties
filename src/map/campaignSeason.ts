import type {Map,ExpressionSpecification} from 'maplibre-gl';
import type {World} from '../core/types';
import {calendarDate} from '../core/calendar';
import {seasons,type Season} from './sample/seasons';
import {PAPER_ZOOM,LANDSCAPE_ZOOM} from './atlasPresentation';
export function campaignSeason(world:Pick<World,'day'|'scriptId'>):Season{
 const month=calendarDate(world.day,world.scriptId).getUTCMonth();
 return month<2||month===11?'winter':month<5?'spring':month<8?'summer':'autumn';
}
const relief:Record<Season,string[]>={
 spring:['#91a478','#768d64','#6d805f','#85856b','#99927e','#b3b5ac'],
 summer:['#879366','#6b815b','#596e52','#7d8067','#99927e','#b3b5ac'],
 autumn:['#b09a67','#a18e5d','#8d805b','#8b836a','#a19a88','#babcb3'],
 winter:['#929688','#8c9388','#9ea79d','#b7c1bc','#ccd5d1','#e0e5df'],
};
/** Shared sample palette with nationwide DEM; geographic heights remain authoritative. */
export function applyCampaignSeason(map:Map,value:Season){
 const p=seasons[value],c=relief[value];
 map.setPaintProperty('elevation-colors','color-relief-color',['interpolate',['linear'],['elevation'],-5000,p.water,0,c[0],350,c[1],750,c[2],1500,c[3],3000,c[4],5000,c[5]] as ExpressionSpecification);
 map.setPaintProperty('woodland','fill-color',p.pine);
 map.setPaintProperty('grassland','fill-color',value==='autumn'?'#a29359':value==='winter'?'#a7b0a2':value==='spring'?'#8ca66e':'#7e915e');
 for(const id of ['ocean','inland-water'])map.setPaintProperty(id,'fill-color',['interpolate',['linear'],['zoom'],PAPER_ZOOM,'#a8afa5',LANDSCAPE_ZOOM,p.water]);
 map.setPaintProperty('rivers-major','line-color',p.water);
 map.setPaintProperty('mountain-shadow','hillshade-highlight-color',value==='winter'?'#e2e9e5':'#ead9b2');
}

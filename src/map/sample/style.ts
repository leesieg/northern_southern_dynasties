import {atlasStyle} from '../atlasStyle';
import type {StyleSpecification} from 'maplibre-gl';

export function sampleStyle():StyleSpecification{
 const style=atlasStyle();
 const hidden=['territory','realm','prefecture','hierarchy','frontier','site-','history-event','selected-ring','route-','road-','campaign-trails'];
 style.layers=style.layers.filter(l=>!hidden.some(prefix=>l.id.startsWith(prefix)));
 const edits:Record<string,Record<string,unknown>>={
  'land-fallback':{'fill-color':'#b0b580'},
  'woodland':{'fill-color':'#4e6940','fill-opacity':.84},
  'mountain-shadow':{'hillshade-exaggeration':.72,'hillshade-shadow-color':'#304538','hillshade-highlight-color':'#f3e3ba','hillshade-accent-color':'#8f8567'},
  'inland-water':{'fill-color':'#548880'},
  'rivers-major':{'line-color':'#4e827d','line-width':['interpolate',['linear'],['zoom'],5,1,8,2,12,5]},
  'water-silk':{'fill-opacity':.25},
 };
 for(const layer of style.layers)if(edits[layer.id])Object.assign(layer.paint??={},edits[layer.id]);
 return style;
}

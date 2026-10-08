import {atlasStyle} from '../atlasStyle';
import type {StyleSpecification} from 'maplibre-gl';

export function sampleStyle():StyleSpecification{
 const style=atlasStyle();
 const hidden=['territory','realm','prefecture','hierarchy','frontier','site-','history-event','selected-ring','route-','road-','campaign-trails'];
 style.layers=style.layers.filter(l=>!hidden.some(prefix=>l.id.startsWith(prefix)));
 // Hidden gameplay layers must not leave their nationwide GeoJSON workers loading.
 const used=new Set(style.layers.flatMap(layer=>'source' in layer?[layer.source]:[]));
 used.add('dem-terrain');
 style.sources=Object.fromEntries(Object.entries(style.sources).filter(([id])=>used.has(id)));
 const edits:Record<string,Record<string,unknown>>={
  'land-fallback':{'fill-color':'#92905f'},
  'elevation-colors':{'color-relief-color':['interpolate',['linear'],['elevation'],0,'#9c996b',200,'#929561',450,'#858e54',700,'#647648',1000,'#536644',1500,'#77806b',2200,'#a4a18a',3500,'#c5c1ac',5000,'#e2ddcb']},
  'woodland':{'fill-color':'#4e6940','fill-opacity':.84},
  'mountain-shadow':{'hillshade-exaggeration':.92,'hillshade-shadow-color':'#243d32','hillshade-highlight-color':'#ffe5ad','hillshade-accent-color':'#857b60'},
  'inland-water':{'fill-color':'#548880'},
  'rivers-major':{'line-color':'#4e827d','line-width':['interpolate',['linear'],['zoom'],5,1,8,2,12,5]},
  'water-silk':{'fill-opacity':.25},
  'water-coast':{'line-color':'#8b976f','line-width':.5,'line-opacity':.5},
  'river-banks':{'line-color':'#989f76','line-opacity':.3},
 };
 for(const layer of style.layers)if(edits[layer.id])Object.assign(layer.paint??={},edits[layer.id]);
 return style;
}

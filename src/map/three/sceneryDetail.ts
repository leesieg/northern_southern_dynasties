import type {CityDetail} from '../campaignScenery';
/** Display-only LOD. Hysteresis prevents rebuilding at every small wheel reversal. */
export function cityDetailForPixels(pixels:number,previous:CityDetail='regional'):CityDetail{
 return pixels>=(previous==='close'?110:150)?'close':'regional';
}
export type SceneryTier='far'|'middle'|'near';
export function sceneryTier(zoom:number,previous:SceneryTier='far'):SceneryTier{
 if(zoom>=(previous==='near'?9.8:10.2))return 'near';
 if(zoom>=(previous!=='far'?6:6.4))return 'middle';
 return 'far';
}
export const sceneryBudgets={far:{trees:0,shadows:false},middle:{trees:1000,shadows:false},near:{trees:2400,shadows:true}};

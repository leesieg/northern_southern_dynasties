import {expect,it} from 'vitest';
import {campaignUnitPixels,CAMPAIGN_BODY_SCALE} from './unitScale';
import {anchoredArmyModels,armyMarkerFootprint} from './armyMapPresentation';
it('changes projected targets with depth while preserving world body size and geographic anchor',()=>{
 const point={x:400,y:350},position={lon:118.78,lat:32.04};
 const near=campaignUnitPixels(.04),middle=campaignUnitPixels(.1);
 expect(near*.04).toBe(CAMPAIGN_BODY_SCALE);expect(middle*.1).toBe(CAMPAIGN_BODY_SCALE);
 for(const pixels of [near,middle]){const size=armyMarkerFootprint(true,false,pixels),placement=anchoredArmyModels([{key:'1',point,position,pixels}],[],{width:1000,height:800}).get('1')!;
 expect(placement.offset).toEqual({x:0,y:0});expect(placement.bounds.bottom-size.bottom).toBe(point.y);expect(size.width).toBeGreaterThanOrEqual(94);expect(size.height-size.bottom).toBeGreaterThan(110);}
 expect(armyMarkerFootprint(true,false,middle).height).toBeLessThan(armyMarkerFootprint(true,false,near).height);
});

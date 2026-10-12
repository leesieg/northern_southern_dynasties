import {expect,it} from 'vitest';
import {armyMarkerAppearance} from './armyMarkerAppearance';
import {armyMarkerFootprint,anchoredArmyModels,layoutArmyCards,screenOverlap} from './armyMapPresentation';
it('shows only a military pennant when strength and commander are not public',()=>{
 expect(armyMarkerAppearance({exact:false,strength:'兵力未详'},'hidden-commander')).toEqual({commander:undefined,compact:true,strength:''});
});
it('keeps estimates labelled and does not turn them into exact intelligence',()=>{
 expect(armyMarkerAppearance({exact:false,strength:'区域情报 1000–2000'})).toEqual({commander:undefined,compact:true,strength:'估 1000–2000'});
});
it('distinguishes an actual commander from an unfilled command while preserving zero troops',()=>{
 expect(armyMarkerAppearance({exact:true,strength:'0'},'general')).toEqual({commander:'general',compact:false,strength:'0'});
 expect(armyMarkerAppearance({exact:true,strength:'1600'})).toEqual({commander:undefined,compact:true,strength:'1600'});
});
it('uses the compact footprint for card collisions without moving model coordinates',()=>{
 const point={x:250,y:220},view={width:600,height:450},entries=[{key:'unknown',point,compact:true},{key:'known',point,compact:false}];
 const cards=layoutArmyCards(entries,[],view),a=cards.get('unknown')!,b=cards.get('known')!;
 expect(a.bounds.bottom-a.bounds.top).toBe(70);expect(b.bounds.bottom-b.bounds.top).toBe(110);expect(screenOverlap(a.bounds,b.bounds)).toBe(0);
 const position={lon:118.78,lat:32.04},models=anchoredArmyModels([{...entries[0],position,pixels:12}],[],view),model=models.get('unknown')!,size=armyMarkerFootprint(true,false,12,true);
 expect(model.offset).toEqual({x:0,y:0});expect(model.bounds.bottom-size.bottom).toBe(point.y);expect((model.bounds.left+model.bounds.right)/2).toBe(point.x);
});

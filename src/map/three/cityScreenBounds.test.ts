import {expect,it} from 'vitest';
import {Box3,PerspectiveCamera,Vector3} from 'three';
import {cityAnnotationOffset,cityScreenBounds} from './cityScreenBounds';
import {dockMapMarker,screenOverlap} from '../armyMapPresentation';
it('keeps a label below the rendered city at near, middle and distant camera distances',()=>{
 for(const distance of [40,95,200]){
  const camera=new PerspectiveCamera(39,1.4,1,1000);camera.position.set(distance*.4,distance*.4,distance*.8);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const box=new Box3(new Vector3(-5,0,-4),new Vector3(5,3,4));const rect=cityScreenBounds(box,camera,1000,714)!;
  expect(rect.right).toBeGreaterThan(rect.left);expect(rect.bottom).toBeGreaterThan(rect.top);
  const anchor=new Vector3().project(camera),anchorY=(.5-anchor.y*.5)*714,offset=cityAnnotationOffset(anchorY,rect,74);
  const label={left:440,right:560,top:anchorY+offset[1]-74,bottom:anchorY+offset[1]};
  expect(label.top).toBeGreaterThanOrEqual(rect.bottom+7.99);expect(screenOverlap(label,rect)).toBe(0);
  expect(dockMapMarker(label,[rect],[],{width:1000,height:714}).offset).toEqual({x:0,y:0});
 }
});
it('centres paper annotations and rejects models behind the camera',()=>{
 expect(cityAnnotationOffset(300,null,74)).toEqual([0,37]);
 const camera=new PerspectiveCamera(39,1,1,100);camera.updateMatrixWorld();
 expect(cityScreenBounds(new Box3(new Vector3(-1,-1,4),new Vector3(1,1,6)),camera,600,600)).toBeNull();
});
it('docks a city annotation clear of both its model and the minimap without moving their bounds',()=>{
 const city={left:240,top:350,right:480,bottom:480},hud={left:340,top:545,right:620,bottom:850};
 const label={left:320,top:505,right:465,bottom:585};
 const placed=dockMapMarker(label,[city,hud],[],{width:623,height:853});
 expect(screenOverlap(placed.bounds,city)).toBe(0);expect(screenOverlap(placed.bounds,hud)).toBe(0);
 expect(placed.bounds.left).toBeGreaterThanOrEqual(8);expect(placed.bounds.right).toBeLessThanOrEqual(615);
});

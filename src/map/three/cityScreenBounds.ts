import {Vector3,type Box3,type Camera} from 'three';
import type {ScreenRect} from '../armyMapPresentation';
/** Project the actual placed model, including its roof and foundation; never move geography. */
export function cityScreenBounds(box:Box3,camera:Camera,width:number,height:number):ScreenRect|null{
 const p=new Vector3(),rect={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  p.set(x,y,z).project(camera);if(p.z< -1||p.z>1)return null;
  const sx=(p.x*.5+.5)*width,sy=(.5-p.y*.5)*height;
  rect.left=Math.min(rect.left,sx);rect.right=Math.max(rect.right,sx);rect.top=Math.min(rect.top,sy);rect.bottom=Math.max(rect.bottom,sy);
 }
 return rect;
}
export function cityAnnotationOffset(anchorY:number,bounds:ScreenRect|null,labelHeight:number):[number,number]{
 return [0,bounds?Math.max(0,bounds.bottom-anchorY)+labelHeight+8:labelHeight*.5];
}

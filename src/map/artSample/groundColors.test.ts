import {expect,it} from 'vitest';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {groundColors} from './groundColors';
import {riverShape} from './riverShape';

it('preserves terrain, shore and seasonal albedo when the sample is placed on the world map',()=>{
 const origin={x:1024,z:-512},towns=[{x:0,z:8}],line=[{x:-40,z:0},{x:0,z:0},{x:40,z:0}];
 const local=new BufferGeometry();
 local.setAttribute('position',new Float32BufferAttribute([0,.3,0,8,.8,1.5,18,4,12,30,1,20],3));
 local.setAttribute('normal',new Float32BufferAttribute([0,1,0,0,1,0,.6,.8,0,0,1,0],3));
 local.setAttribute('color',new Float32BufferAttribute(new Float32Array(12),3));
 const world=local.clone();world.translate(origin.x,0,origin.z);
 const sampleRiver=riverShape([line],()=>.3),worldRiver=riverShape([line.map(p=>({x:p.x+origin.x,z:p.z+origin.z}))],()=>.3,origin);
 const colors:number[][]=[];
 for(const season of ['summer','autumn','winter'] as const){
  groundColors(local,season,sampleRiver,towns);
  groundColors(world,season,worldRiver,towns.map(p=>({x:p.x+origin.x,z:p.z+origin.z})),origin);
  expect(Array.from(world.getAttribute('color').array)).toEqual(Array.from(local.getAttribute('color').array));
  colors.push(Array.from(local.getAttribute('color').array));
 }
 expect(colors[0]).not.toEqual(colors[1]);expect(colors[1]).not.toEqual(colors[2]);
 local.dispose();world.dispose();
});

import {describe,expect,it} from 'vitest';
import {removePortraitBackdrop} from './portraitCutout';

describe('audience portrait cutout',()=>{
 it('removes edge-connected paper while preserving pale pixels inside the figure',()=>{
  const width=7,height=7,pixels=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<width*height;i++)pixels.set([250,248,244,255],i*4);
  for(let y=1;y<=5;y++)for(let x=1;x<=5;x++)pixels.set([35,42,39,255],(y*width+x)*4);
  pixels.set([250,248,244,255],(3*width+3)*4);
  removePortraitBackdrop(pixels,width,height);
  expect(pixels[3]).toBe(0);
  expect(pixels[(3*width+3)*4+3]).toBe(255);
 expect(pixels[(2*width+2)*4+3]).toBe(255);
 });
 it('feathers a light outline next to the removed paper',()=>{
  const width=5,height=3,pixels=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<width*height;i++)pixels.set([250,248,244,255],i*4);
  pixels.set([190,188,184,255],(width+1)*4);
  pixels.set([35,42,39,255],(width+2)*4);
  removePortraitBackdrop(pixels,width,height);
  expect(pixels[3]).toBe(0);
  expect(pixels[(width+1)*4+3]).toBeGreaterThan(0);
  expect(pixels[(width+1)*4+3]).toBeLessThan(255);
  expect(pixels[(width+2)*4+3]).toBe(255);
 });
});

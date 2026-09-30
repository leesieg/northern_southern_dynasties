import {describe,expect,it} from 'vitest';
import {BufferGeometry,DoubleSide,Group,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {buildMilitaryFace,militaryHeadGeometry,militaryNoseGeometry} from './militaryFace';

function front(geometry:BufferGeometry,x:number,y:number){const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide})),hit=new Raycaster(new Vector3(x,y,1),new Vector3(0,0,-1)).intersectObject(mesh)[0];mesh.material.dispose();expect(hit).toBeDefined();return hit.point.z;}

describe('human miniature face geometry (no GPU or UI)',()=>{
 it('has a closed head mesh with finite unit normals and no split seam across the face',()=>{
  const geometry=militaryHeadGeometry(),edges=new Map<string,number>(),index=geometry.getIndex()!,normal=geometry.getAttribute('normal');
  for(let i=0;i<index.count;i+=3)for(const [a,b] of [[index.getX(i),index.getX(i+1)],[index.getX(i+1),index.getX(i+2)],[index.getX(i+2),index.getX(i)]]){const key=Math.min(a,b)+':'+Math.max(a,b);edges.set(key,(edges.get(key)??0)+1);}
  expect([...edges.values()].every(count=>count===2)).toBe(true);for(let i=0;i<normal.count;i++)expect(new Vector3().fromBufferAttribute(normal,i).length()).toBeCloseTo(1,5);geometry.dispose();
 });
 it('tapers the jaw and chin while recessing eyes under the brow',()=>{
  const geometry=militaryHeadGeometry(),position=geometry.getAttribute('position'),width=(y:number)=>{let value=0;for(let i=0;i<position.count;i++)if(Math.abs(position.getY(i)-y)<1e-6)value=Math.max(value,Math.abs(position.getX(i)));return value;};
  expect(width(-.103)).toBeLessThan(width(0)*.5);for(const side of [-1,1])expect(front(geometry,side*.032,.029)).toBeLessThan(front(geometry,side*.032,.051));geometry.dispose();
 });
 it('keeps the nose bridge and tip narrow instead of using a round bead',()=>{
  const geometry=militaryNoseGeometry();geometry.computeBoundingBox();const bounds=geometry.boundingBox!;expect(bounds.max.x-bounds.min.x).toBeLessThan(.04);expect(bounds.max.y-bounds.min.y).toBeGreaterThan(.07);expect(bounds.max.z-bounds.min.z).toBeGreaterThan(.03);const normal=geometry.getAttribute('normal');for(let i=0;i<normal.count;i++)expect(new Vector3().fromBufferAttribute(normal,i).length()).toBeCloseTo(1,5);geometry.dispose();
 });
 it('embeds almond eyes into the sockets and keeps the lip line within human proportions',()=>{
  const pool=new Map<string,BufferGeometry>(),material=new MeshBasicMaterial(),head=buildMilitaryFace(new Group(),{skin:material,white:material,iris:material,lip:material,hair:material},(key,create)=>{if(!pool.has(key))pool.set(key,create());return pool.get(key)!;}),skin=(head.getObjectByName('head-skin') as Mesh).geometry;
  for(const object of head.children.filter(c=>c.name==='eye-white') as Mesh[]){object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox!,surface=front(skin,object.position.x,object.position.y);expect(bounds.min.z+object.position.z).toBeLessThan(surface);expect(bounds.max.z+object.position.z).toBeGreaterThan(surface);expect(bounds.max.z+object.position.z-surface).toBeLessThan(.015);expect((bounds.max.x-bounds.min.x)/(bounds.max.y-bounds.min.y)).toBeGreaterThan(2);}
  for(const name of ['upper-lip','lower-lip']){const geometry=(head.getObjectByName(name) as Mesh).geometry;geometry.computeBoundingBox();expect(geometry.boundingBox!.max.x-geometry.boundingBox!.min.x).toBeLessThan(.05);}
  pool.forEach(geometry=>geometry.dispose());material.dispose();
 });
 it('shares face geometry between soldiers without sharing their transforms',()=>{
  const pool=new Map<string,BufferGeometry>(),material=new MeshBasicMaterial(),cache=(key:string,create:()=>BufferGeometry)=>{if(!pool.has(key))pool.set(key,create());return pool.get(key)!;},materials={skin:material,white:material,iris:material,lip:material,hair:material},first=buildMilitaryFace(new Group(),materials,cache),second=buildMilitaryFace(new Group(),materials,cache);
  expect((first.getObjectByName('head-skin') as Mesh).geometry).toBe((second.getObjectByName('head-skin') as Mesh).geometry);first.position.x=2;expect(second.position.x).toBe(0);pool.forEach(geometry=>geometry.dispose());material.dispose();
 });
});

import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('ships a bounded Blender room with an open live-map surface and no external dependencies',()=>{
 const b=readFileSync('public/art/campaign/atlas-study.glb');expect(b.toString('ascii',0,4)).toBe('glTF');
 const doc=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 expect(doc.meshes.length).toBeLessThanOrEqual(12);
 const triangles=doc.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+doc.accessors[p.indices].count/3,0);
 expect(triangles).toBeGreaterThan(20000);expect(triangles).toBeLessThan(60000);
 expect(doc.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!==undefined))).toBe(true);
 expect(doc.materials.map(m=>m.name)).toContain('Study screen silk');
 expect(doc.buffers.every(b=>!b.uri)).toBe(true);
 expect(doc.materials.map(m=>m.name)).toContain('Study celadon');
 expect(b.length).toBeLessThan(5000000);
});
it('keeps decorative hidden-region art separate from geographic paper',()=>{
 const a=readFileSync('public/art/campaign/national-parchment.webp'),b=readFileSync('public/art/campaign/hidden-shanshui-v2.png');
 expect(b.toString('ascii',1,4)).toBe('PNG');expect(a.equals(b)).toBe(false);expect(b.length).toBeLessThan(4000000);
});

it('exports a top-oriented panoramic screen and nonuniform baked contact shading',()=>{
 const b=readFileSync('public/art/campaign/atlas-study.glb'),jsonLength=b.readUInt32LE(12),doc=JSON.parse(b.toString('utf8',20,20+jsonLength)),binStart=28+jsonLength;
 const values=id=>{const a=doc.accessors[id],v=doc.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5126:4,5123:2,5121:1}[a.componentType],out=[];
  for(let i=0;i<a.count;i++)for(let j=0;j<width;j++){const offset=binStart+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??width*bytes)+j*bytes;out.push(a.componentType===5126?b.readFloatLE(offset):a.componentType===5123?b.readUInt16LE(offset)/(a.normalized?65535:1):b.readUInt8(offset)/(a.normalized?255:1));}return out;};
 const p=doc.meshes.flatMap(m=>m.primitives).find(p=>doc.materials[p.material].name==='Study screen silk');
 const pos=values(p.attributes.POSITION),uv=values(p.attributes.TEXCOORD_0),maxY=Math.max(...pos.filter((_,i)=>i%3===1));
 for(let i=0;i<pos.length/3;i++)if(Math.abs(pos[i*3+1]-maxY)<.001)expect(uv[i*2+1]).toBeCloseTo(0,3);
 const floor=doc.meshes.flatMap(m=>m.primitives).find(p=>doc.materials[p.material].name==='Study floor'),colors=values(floor.attributes.COLOR_0);
 expect(colors.reduce((a,b)=>Math.min(a,b),1)).toBeLessThan(.85);expect(colors.reduce((a,b)=>Math.max(a,b),0)).toBe(1);
});

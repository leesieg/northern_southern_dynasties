import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {xianbeiWholeRigs} from './wholePortrait';
it('君主与官员完整朝服覆盖所有原画模板，图集尺寸符合配方',()=>{
 const metadata=JSON.parse(readFileSync('src/data/paintedAssetMetadata.json','utf8'));
 const sizes=JSON.parse(readFileSync('src/data/courtAssetSizes.json','utf8'));
 for(const rig of [...Object.keys(metadata),'c-young-adult-v1']){
  const path=`public/art/portraits/painted-c/court/${rig}-court-v2.png`;
  expect(existsSync(path),path).toBe(true);const b=readFileSync(path);
  expect([b.readUInt32BE(16),b.readUInt32BE(20)],path).toEqual(sizes[rig]);
 }
});
it('全部非甲胄成人模板都有完整文化变体',()=>{const metadata=JSON.parse(readFileSync('src/data/paintedAssetMetadata.json','utf8'));const expected=Object.keys(metadata).filter(id=>!['child','dugu-xin','chen-baxian'].includes(id));expect([...xianbeiWholeRigs].sort()).toEqual(expected.sort());});
it('完整文化肖像均有对应的二比三底图',()=>{for(const rig of xianbeiWholeRigs){const path=`public/art/portraits/painted-c/cultures/${rig}-xianbei-v1.png`;expect(existsSync(path),path).toBe(true);const b=readFileSync(path);expect(b.readUInt32BE(16),path).toBe(1024);expect(b.readUInt32BE(20),path).toBe(1536);}});
it('图集路径、尺寸、透明通道与选择裁切相符',()=>{for(const version of ['v1','v2'])for(const [file,w,h] of [['male',1254,1254],['female',1254,1254],['child',1448,1086]]){const path='public/art/portraits/painted-c/costumes/'+file+'-'+version+'.png';expect(existsSync(path)).toBe(true);const b=readFileSync(path);expect(b.readUInt32BE(16)).toBe(w);expect(b.readUInt32BE(20)).toBe(h);expect(b[25]).toBe(6);}});

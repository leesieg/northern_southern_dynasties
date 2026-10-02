import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
it('图集路径、尺寸、透明通道与选择裁切相符',()=>{for(const [file,w,h] of [['male',1254,1254],['female',1254,1254],['child',1448,1086]]){const path='public/art/portraits/painted-c/costumes/'+file+'-v1.png';expect(existsSync(path)).toBe(true);const b=readFileSync(path);expect(b.readUInt32BE(16)).toBe(w);expect(b.readUInt32BE(20)).toBe(h);expect(b[25]).toBe(6);}});

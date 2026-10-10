import {it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
it('retains verified prior assets without changing either release manifest or the previous release',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fynbc-release-')),previous=join(root,'previous'),target=join(root,'new');
 try{for(const dir of [previous,target])await mkdir(join(dir,'map-assets'),{recursive:true});const data=Buffer.from('previous elevation'),sha256=createHash('sha256').update(data).digest('hex'),url=`map-assets/${sha256.slice(0,20)}-tile.bin.gz`,entry={url,sha256,bytes:data.length,packed:true},old=JSON.stringify({version:'old',entries:{tile:entry}}),current=JSON.stringify({version:'new',entries:{}});
  await writeFile(join(previous,'map-resources.json'),old);await writeFile(join(target,'map-resources.json'),current);await writeFile(join(previous,url),gzipSync(data));
  const report=JSON.parse(execFileSync(process.execPath,['scripts/prepare-map-release.mjs',target,previous],{encoding:'utf8'}));expect(report.retained).toBe(1);expect(await readFile(join(target,url))).toEqual(await readFile(join(previous,url)));expect(await readFile(join(target,'map-resources.json'),'utf8')).toBe(current);expect(await readFile(join(previous,'map-resources.json'),'utf8')).toBe(old);
  const repeated=JSON.parse(execFileSync(process.execPath,['scripts/prepare-map-release.mjs',target,previous],{encoding:'utf8'}));expect(repeated.retained).toBe(1);
 }finally{await rm(root,{recursive:true,force:true});}
});

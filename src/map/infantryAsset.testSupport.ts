import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
/** Actual shipping mesh, rig and clips; omit only image decoding unavailable in Node. */
export async function readInfantryTestAsset(){
 // Match other CPU fixtures without adding Node declarations to the browser project.
 const filesystemModule='node:fs/promises';
 const {readFile}=await import(/* @vite-ignore */ filesystemModule) as {readFile(path:string):Promise<Uint8Array<ArrayBuffer>>};
 const bytes=await readFile('public/art/military/infantry-rigged-v1.glb'),header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=header.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+length)));
 delete doc.materials;delete doc.textures;delete doc.images;
 for(const mesh of doc.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const json=new TextEncoder().encode(JSON.stringify(doc)),padded=new Uint8Array(Math.ceil(json.length/4)*4).fill(32);padded.set(json);
 const data=new Uint8Array(20+padded.length+bytes.length-20-length),view=new DataView(data.buffer);
 data.set(bytes.subarray(0,12));view.setUint32(8,data.length,true);view.setUint32(12,padded.length,true);view.setUint32(16,0x4e4f534a,true);data.set(padded,20);data.set(bytes.subarray(20+length),20+padded.length);
 return new GLTFLoader().parseAsync(data.buffer,'');
}

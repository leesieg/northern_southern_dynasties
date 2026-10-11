import {afterEach,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';

const fixture=vi.hoisted(()=>({files:new Map()}));
vi.mock('node:fs',()=>({
 readFileSync(path){const key=path.startsWith(process.cwd())?relative(process.cwd(),path):path;return fixture.files.get(key)??Buffer.from('source');},
 readdirSync(path){
  const key=path.startsWith(process.cwd())?relative(process.cwd(),path):path;
  return ({'public/art/campaign':['tile.bin'],'public/art/military':['unit.glb'],src:['map.ts']}[key]??[]).map(name=>({name,isDirectory:()=>false}));
 },
}));
vi.mock('node:child_process',()=>({execFileSync:()=> 'test-revision'}));
import {mapResourcesPlugin} from './mapResourcesPlugin.mjs';

afterEach(()=>{vi.useRealTimers();fixture.files.clear();});
function setup(){
 vi.useFakeTimers();fixture.files.set('public/art/military/unit.glb',Buffer.from('old model'));
 let plugin=mapResourcesPlugin();const watcher=new EventEmitter(),httpServer=new EventEmitter();
 const server={watcher,httpServer,middlewares:{use:vi.fn()},config:{base:'/',logger:{error:vi.fn()}},restart:vi.fn(async()=>{httpServer.emit('close');plugin=mapResourcesPlugin();plugin.configureServer(server);})};
 plugin.configureServer(server);
 return {server,manifest:()=>JSON.parse(plugin.config().define.__MAP_RESOURCE_MANIFEST__)};
}

it('rebuilds the resource URL and digest together after a debounced model export',async()=>{
 const {server,manifest}=setup(),before=manifest(),file=join(process.cwd(),'public/art/military/unit.glb'),bytes=Buffer.from('new model');
 fixture.files.set('public/art/military/unit.glb',bytes);
 server.watcher.emit('change',file);await vi.advanceTimersByTimeAsync(700);server.watcher.emit('change',file);await vi.advanceTimersByTimeAsync(999);
 expect(server.restart).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);
 expect(server.restart).toHaveBeenCalledTimes(1);expect(manifest().version).not.toBe(before.version);
 const current=manifest().entries['art/military/unit.glb'];expect(current.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));expect(current.url).not.toBe(before.entries['art/military/unit.glb'].url);
 // A subsequent export must still be watched after the first restart.
 server.watcher.emit('change',file);await vi.advanceTimersByTimeAsync(1000);expect(server.restart).toHaveBeenCalledTimes(2);
});

it('refreshes on asset additions and removals but ignores documentation and unrelated files',async()=>{
 const {server}=setup();
 for(const path of ['public/art/military/SOURCES.md','public/art/campaign/README.txt','src/map.ts','art/military/unit.blend'])server.watcher.emit('change',join(process.cwd(),path));
 await vi.advanceTimersByTimeAsync(1100);expect(server.restart).not.toHaveBeenCalled();
 server.watcher.emit('add',join(process.cwd(),'public/art/military/new.glb'));await vi.advanceTimersByTimeAsync(1000);
 server.watcher.emit('unlink',join(process.cwd(),'public/art/campaign/tile.bin'));await vi.advanceTimersByTimeAsync(1000);expect(server.restart).toHaveBeenCalledTimes(2);
});

it('cancels a queued restart when the development server closes',async()=>{
 const {server}=setup();server.watcher.emit('change',join(process.cwd(),'public/data/land.geojson'));server.httpServer.emit('close');
 await vi.advanceTimersByTimeAsync(1100);expect(server.restart).not.toHaveBeenCalled();expect(server.watcher.listenerCount('change')).toBe(0);
});

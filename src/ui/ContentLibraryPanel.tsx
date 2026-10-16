import {useEffect,useRef,useState} from 'react';
import {decodePackageFile,packageInfo,type InstalledContent} from '../persistence/contentLibrary';
import type {ContentPackage} from '../core/contentPackage';
import {getContentContext,LAUNCH_KEY} from '../host/contentContext';
import {probePackage} from '../host/packageProbe';
import {listSaves,readSaveFile} from '../persistence/saveFiles';
import {inspectSaveLock} from '../persistence/contentLibrary';
import './contentLibrary.css';
export function ContentLibraryPanel({onSelect,pending=false}:{onSelect:(digest:string)=>Promise<unknown>;pending?:boolean}){
 const ctx=getContentContext(),[items,setItems]=useState<InstalledContent[]>([]),[candidate,setCandidate]=useState<ContentPackage|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[removing,setRemoving]=useState(''),[launches,setLaunches]=useState<{id:string;digest:string}[]>([]),upload=useRef<HTMLInputElement>(null);
 const refresh=async()=>{setItems(await ctx.library.list());setLaunches(await ctx.library.pending());};
 useEffect(()=>{void refresh().catch(e=>setError(String(e)));},[]);
 async function work(run:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await run();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 const disabled=busy||pending;
 function download(p:ContentPackage){const url=URL.createObjectURL(new Blob([JSON.stringify(p)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=p.packageId+'-'+p.digest.slice(0,12)+'.content.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="content-vault" aria-label="剧本藏库"><header><h2>剧本藏库</h2><p>导入创作台内容，在此选择时代。现有行记按原包恢复。</p><button disabled={disabled} onClick={()=>upload.current?.click()}>导入内容包</button></header><input ref={upload} hidden type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void work(async()=>{setCandidate(null);if(f.size>16*1024*1024)throw new Error('内容文件超过 16 MiB。');const p=await decodePackageFile(await f.text(),ctx.environment);await probePackage(p);setCandidate(p);});}}/>
 {candidate&&<aside className="content-import"><h3>{packageInfo(candidate).name}</h3><p>{candidate.packageId} · {candidate.digest.slice(0,12)} · 已校验实际开局，尚未安装</p><button disabled={disabled} onClick={()=>void work(async()=>{await ctx.library.install(candidate);setCandidate(null);await refresh();setNotice('内容已安装，现有进度未改变。');})}>确认安装</button><button disabled={disabled} onClick={()=>setCandidate(null)}>取消</button></aside>}
 <div className="content-vault-list">{items.map(p=><article key={p.digest}><div><h3>{p.name}</h3><p>{p.scripts.map(s=>s.year+' 年').join('／')} · {p.packageId}</p><small>{p.digest.slice(0,12)}{p.digest===ctx.content.digest?' · 当前内容':''}</small></div><div className="content-vault-actions"><button disabled={disabled||p.digest===ctx.content.digest} onClick={()=>void work(async()=>{await onSelect(p.digest);})}>选择此内容</button><button disabled={disabled} onClick={()=>void work(async()=>download(await ctx.library.get(p.digest)))}>导出原包</button><button disabled={disabled||p.installedAt===0||p.digest===ctx.content.digest} onClick={()=>setRemoving(p.digest)}>移除</button></div>{removing===p.digest&&<div className="content-remove"><p>移除浏览器中的此版本。仍被行记或当前窗口引用时会拒绝，请先保留原包与行记备份。</p><button disabled={disabled} onClick={()=>void work(async()=>{const refs=[ctx.content.digest,...(await ctx.library.pending()).map(l=>l.digest)];for(const slot of await listSaves()){const text=await readSaveFile(slot.id);if(text){try{const lock=inspectSaveLock(text);if(lock)refs.push(lock.digest);}catch{throw new Error('有存档无法核对内容引用，请先导出并修复该存档。');}}}await ctx.library.remove(p.digest,refs);setRemoving('');await refresh();})}>确认移除</button><button disabled={disabled} onClick={()=>setRemoving('')}>取消</button></div>}</article>)}</div>
 {launches.filter(l=>l.id!==sessionStorage.getItem(LAUNCH_KEY)).map(l=><p key={l.id}>未完成的内容切换 {l.digest.slice(0,12)} <button disabled={disabled} onClick={()=>void work(async()=>{await ctx.library.clearLaunch(l.id);await refresh();})}>取消此切换</button></p>)}
 {error&&<p role="alert" className="content-error">{error}</p>}{notice&&<p role="status">{notice}</p>}{busy&&<p role="status">正在校验或整理内容，请稍候…</p>}
 </section>;
}

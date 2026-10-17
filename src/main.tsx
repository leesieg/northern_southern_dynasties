import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import bundle from 'virtual:official-content-package';
import {installContentPackage} from './core/contentPackage';
import {createContentLibrary} from './persistence/contentLibrary';
import {prepareStorage,readSaveFile,listSaves,storageScope} from './persistence/saveFiles';
import {getContentContext,setContentContext,LAUNCH_KEY} from './host/contentContext';
import {ContentLibraryPanel} from './ui/ContentLibraryPanel';
import {useEffect,useState} from 'react';
import {cancelContentLaunch} from './host/contentTransfer';
import {copySaveDiagnostics} from './host/saveDiagnostics';
import {loadGameSkin,reportGameSkinFailure} from './host/gameSkin';

if (import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/')) {
  let owner: string | undefined;
  const checkAccount=async()=>{
    try {
      const response=await fetch('/agent-api/account',{credentials:'same-origin',cache:'no-store'});
      const current=response.ok?(await response.json() as {user?:{id?:string}}).user?.id??'':'';
      if(owner===undefined)owner=current;
      else if(owner!==current)window.location.replace('/games/');
    } catch { /* A temporary network error must not discard a game in progress. */ }
  };
  void checkAccount();
  window.addEventListener('focus',()=>void checkAccount());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkAccount();});
  window.setInterval(()=>void checkAccount(),15000);
}

const root=createRoot(document.getElementById('root')!),library=createContentLibrary(bundle.content,bundle.environment);
function Recovery({error}:{error:string}){const [slots,setSlots]=useState<{id:string;characterName?:string}[]>([]),[selected,setSelected]=useState(''),[message,setMessage]=useState(error);useEffect(()=>{void listSaves().then(setSlots).catch(e=>setMessage(String(e)));},[]);
 async function choose(digest:string){const id=crypto.randomUUID();await library.stage({id,digest});sessionStorage.setItem(LAUNCH_KEY,id);location.reload();}
 return <main className="content-recovery"><h1>行记暂未展开</h1><p role="alert">{message}</p><p>原行记仍保留。可导入它绑定的原内容包，再重试；也可导出备份或选择另一份行记。</p><button onClick={()=>location.reload()}>重试恢复</button><button onClick={()=>void copySaveDiagnostics().then(()=>setMessage('存档版本信息已复制，不含存档正文。')).catch(e=>setMessage(String(e)))}>复制存档版本信息</button><button onClick={()=>void cancelContentLaunch(getContentContext()).then(()=>location.reload()).catch(e=>setMessage(String(e)))}>取消未完成切换</button><select aria-label="选择行记" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">选择行记</option>{slots.map(s=><option key={s.id} value={s.id}>{s.characterName??s.id} · {s.id}</option>)}</select><button disabled={!selected} onClick={()=>void (async()=>{const text=await readSaveFile(selected);if(!text)throw new Error('存档不存在');const p=await library.resolve(text),id=crypto.randomUUID();await library.stage({id,digest:p.digest,request:{type:'import',text}});sessionStorage.setItem(LAUNCH_KEY,id);location.reload();})().catch(e=>setMessage(String(e)))}>恢复所选行记</button><button disabled={!selected} onClick={()=>void readSaveFile(selected).then(text=>{if(!text)throw new Error('存档不存在');const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=selected+'.save.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}).catch(e=>setMessage(String(e)))}>导出所选备份</button><ContentLibraryPanel onSelect={choose}/></main>;
}
async function boot(){
 await prepareStorage();const id=sessionStorage.getItem(LAUNCH_KEY),launch=id?await library.launch(id):undefined;if(id&&!launch)throw new Error('未完成的内容切换记录缺失，请取消切换并恢复原行记。');
 const text=launch?null:await readSaveFile(),content=launch?await library.get(launch.digest):text?await library.resolve(text):bundle.content;
 setContentContext({content,environment:bundle.environment,library,launch,scope:storageScope()});await installContentPackage(content,bundle.environment);
 const {App}=await import('./ui/App');
 // Load the final skin after App's component CSS, as before content-aware boot.
 await loadGameSkin();root.render(<StrictMode><App/></StrictMode>);
}
void boot().catch(async error=>{
 try{await loadGameSkin();}catch(styleError){reportGameSkinFailure({cause:error,styles:styleError});return;}
 setContentContext({content:bundle.content,environment:bundle.environment,library});root.render(<Recovery error={error instanceof Error?error.message:String(error)}/>);
});

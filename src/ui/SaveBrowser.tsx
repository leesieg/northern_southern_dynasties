import {useRef,useState} from 'react';
import type {Request,SaveInfo} from '../core/types';
import {latestSaveInfo} from '../core/storage';
import {SAVE_MAX_BYTES,saveSizeError} from '../core/saveCapacity';
import {dateLabel} from '../core/world';
import {scriptLabel} from '../data/scripts';
import {ConfirmAction} from './ConfirmAction';
import './saveBrowser.css';
export const saveLabel=(id:string)=>id==='manual'?'手动行记':id==='previous-run'?'切换前备份':'自动行记 '+id.slice(-1);
const accountSaves=import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/');
interface Props {slots:SaveInfo[];pending:boolean;inGame?:boolean;send:(request:Request)=>void;notify:(text:string,error?:boolean)=>void}
export function SaveBrowser({slots,pending,inGame=false,send,notify}:Props){
 const [selected,setSelected]=useState(''),[reading,setReading]=useState(false),[confirmation,setConfirmation]=useState<{title:string;detail:string;label:string;request:Request;danger?:boolean}|null>(null),upload=useRef<HTMLInputElement>(null);
 const active=slots.find(s=>s.id===selected)??latestSaveInfo(slots),busy=pending||reading;
 const switchNote='将替换手动行记并暂停进入所选进度。当前已载入的进度会保留为“切换前备份”，更新已有切换备份；三份自动行记不受此次切换影响。';
 return <section className="save-browser" aria-label="存档管理" aria-busy={busy}>
  <header className="save-vault-heading"><span className="save-vault-seal" aria-hidden="true">记</span><div><h3>山河行记</h3><p>{accountSaves?'当前账号保存':'此浏览器本地保存'} · 一份手动行记 · 三份自动行记 · 一份切换备份</p></div></header>
  <div className="save-vault-tools">{inGame&&<><button className="primary" disabled={busy} onClick={()=>slots.some(s=>s.id==='manual')?setConfirmation({title:'更新手动行记？',detail:'将用当前进度覆盖已有手动行记。自动行记与切换备份保持不变。',label:'确认保存',request:{type:'save'}}):send({type:'save'})}>保存当前进度</button><button disabled={busy} onClick={()=>send({type:'export'})}>导出当前进度</button></>}<button disabled={busy} onClick={()=>upload.current?.click()}>{reading?'读取文件中…':'导入文件'}</button></div>
  <div className="save-vault-body"><div className="save-vault-list" aria-label="可用存档">{!slots.length&&<p className="empty-state">尚无行记。{inGame?'保存当前进度，留下这一程。':'开始新局，或导入已有存档。'}</p>}{(['manual','auto','backup'] as const).map(kind=>{const group=slots.filter(s=>kind==='manual'?s.id==='manual':kind==='backup'?s.id==='previous-run':s.id.startsWith('auto-')).sort((a,b)=>b.savedAt-a.savedAt);return group.length>0&&<section key={kind}><h4>{kind==='manual'?'亲录':kind==='auto'?'自动留存':'切换备份'}</h4>{group.map(slot=><button key={slot.id} className="save-vault-row" disabled={busy} aria-pressed={active?.id===slot.id} onClick={()=>setSelected(slot.id)}><span className="save-spine" aria-hidden="true">{kind==='manual'?'录':kind==='auto'?'续':'备'}</span><span><strong>{slot.characterName??'旧行记'}<small>{saveLabel(slot.id)}</small></strong><span>{dateLabel(slot.day,slot.scriptId)}</span><time dateTime={new Date(slot.savedAt).toISOString()}>{new Date(slot.savedAt).toLocaleString('zh-CN')}</time></span></button>)}</section>;})}</div>
  {active&&<aside className="save-vault-preview"><span className="eyebrow">{saveLabel(active.id)}</span><h3>{active.characterName??'山河旧事'}</h3><dl><div><dt>剧本</dt><dd>{scriptLabel(active.scriptId)}</dd></div><div><dt>进度</dt><dd>{dateLabel(active.day,active.scriptId)}</dd></div><div><dt>玩法</dt><dd>{active.mode==='sandbox'?'历史沙盒':'营建教学／旧版'}</dd></div><div><dt>存于</dt><dd>{new Date(active.savedAt).toLocaleString('zh-CN')}</dd></div></dl><p>{active.id==='previous-run'?'上次开局、读取或导入前保留的进度；下一次切换会更新此备份。':'选择行记只查看摘要，确认读取后才会切换进度。'}</p><footer><button className="primary" disabled={busy} onClick={()=>setConfirmation({title:'读取'+(active.characterName??'这份行记')+'的进度？',detail:dateLabel(active.day,active.scriptId)+'。'+switchNote,label:'确认读取',request:{type:'load',slot:active.id}})}>读取此行记</button><button className="danger" disabled={busy} onClick={()=>setConfirmation({title:'删除「'+saveLabel(active.id)+'」？',detail:'此操作无法撤销。当前已载入的游玩进度不会被删除。',label:'确认删除',request:{type:'delete-save',slot:active.id},danger:true})}>删除</button></footer></aside>}</div>
  <p className="save-vault-note" role="status">{pending?'正在处理存档，请稍候…':'执行行动、手动推进、每十个游戏日及需暂停的重要事项时自动保存。导出文件可独立留存。'}</p>
  <input ref={upload} hidden type="file" accept=".json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||busy)return;if(file.size>SAVE_MAX_BYTES){notify(saveSizeError('导入'),true);return;}setReading(true);try{const text=await file.text();setConfirmation({title:'导入「'+file.name+'」？',detail:switchNote+' 文件校验失败时不会替换进度。',label:'确认导入',request:{type:'import',text}});}catch{notify('读取文件失败，请重试。',true);}finally{setReading(false);}}}/>
  {confirmation&&<ConfirmAction title={confirmation.title} detail={confirmation.detail} confirmLabel={confirmation.label} danger={confirmation.danger} pending={busy} onCancel={()=>setConfirmation(null)} onConfirm={()=>{if(busy)return;send(confirmation.request);setConfirmation(null);}}/>}
 </section>;
}

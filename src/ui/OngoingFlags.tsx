import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ongoingItems,type OngoingItem,type OngoingKind} from '../core/ongoing';
import type {GameCommand,World} from '../core/types';
import {ArtIcon,type ArtName} from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import {HoverHint} from './HoverHint';
import {ongoingQuickActions,type OngoingQuickAction} from './ongoingQuickActions';
import './ongoingFlags.css';

const designs:Record<OngoingKind,{icon:ArtName;color:string;path:string;label:string}>={
 travel:{icon:'world',color:'#53664e',path:'M2 1H70V91L36 109 2 91Z',label:'行旅'},
 activity:{icon:'person',color:'#52635c',path:'M2 1H70V96L54 109H18L2 96Z',label:'活动'},
 service:{icon:'diligent',color:'#776044',path:'M2 1H70V108L36 93 2 108Z',label:'差事'},
 petition:{icon:'influence',color:'#663e42',path:'M2 1H70V91L53 106 36 98 19 106 2 91Z',label:'奏请'},
 diplomacy:{icon:'gregarious',color:'#445e69',path:'M2 1H70V80Q70 109 36 109Q2 109 2 80Z',label:'外交'},
 construction:{icon:'estate',color:'#676141',path:'M2 1H70V105H2Z',label:'营建'},
 reform:{icon:'renown',color:'#5b4b66',path:'M2 1H70V97L53 108 36 97 19 108 2 97Z',label:'改革'},
 scheme:{icon:'wary',color:'#4a535d',path:'M2 1H70V92L36 110 26 99H2Z',label:'计谋'},
 military:{icon:'army',color:'#714a37',path:'M2 1H70V109L52 98 36 109 20 98 2 109Z',label:'军务'},
 retinue:{icon:'steadfast',color:'#456359',path:'M2 1H70V89L60 105H12L2 89Z',label:'幕职'},
};
function ongoingClock(item:OngoingItem){return item.days===null?item.clock==='estimate'?'暂缓':'待办':`${item.clock==='deadline'?'限 ':item.clock==='estimate'?'约 ':''}${item.days}日`;}
function GroupDialog({kind,items,world,pending,onClose,onOpen,onCommand}:{kind:OngoingKind;items:OngoingItem[];world:World;pending:boolean;onClose:()=>void;onOpen:(item:OngoingItem)=>void;onCommand:(command:GameCommand)=>void}){
 const ref=useRef<HTMLDialogElement>(null),restoreFocus=useRef(false),title=designs[kind].label+'列表',[confirm,setConfirm]=useState<(OngoingQuickAction&{itemId:string;subject:string})|null>(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{if(dialog.open)dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 useEffect(()=>{if(!confirm&&restoreFocus.current){restoreFocus.current=false;const next=ref.current?.querySelector<HTMLButtonElement>('.ongoing-group-actions button:not(:disabled)')??ref.current?.querySelector<HTMLButtonElement>('header button');next?.focus();}},[confirm,items]);
 return createPortal(<dialog ref={ref} className="ongoing-group-dialog" aria-label={title} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>event.stopPropagation()}>
  <header><ArtIcon name={designs[kind].icon} size={30}/><div><h2>{title}</h2><small>{items.length} 项进行中</small></div><button autoFocus aria-label="关闭事务列表" onClick={onClose}>×</button></header>
  <div className="ongoing-group-list">{items.map(item=><article key={item.id}><div className="ongoing-group-item-main"><strong>{item.title}</strong><small>{item.status}</small></div><span className="ongoing-group-clock">{ongoingClock(item)}</span>{item.progress!==null&&<progress max={1} value={item.progress} aria-label={item.title+'进度'}/>}<div className="ongoing-group-actions">{ongoingQuickActions(world,item).map(action=><HoverHint key={action.label} label={action.label} content={action.reason||action.detail}><button disabled={pending||!!action.reason} onClick={()=>setConfirm({...action,itemId:item.id,subject:item.title})}>{action.label}</button></HoverHint>)}<button aria-label={'前往'+item.title+'详情'} onClick={()=>{onClose();onOpen(item);}}>详情</button></div></article>)}</div>
  {confirm&&<ConfirmAction title={confirm.subject+' · '+confirm.label} detail={confirm.detail} confirmLabel={confirm.label} pending={pending} danger={['驳回','否决','不予准许','不予追加','婉拒','撤回'].includes(confirm.label)} onCancel={()=>setConfirm(null)} onConfirm={()=>{const item=items.find(item=>item.id===confirm.itemId),action=item&&ongoingQuickActions(world,item).find(action=>action.label===confirm.label);if(pending||!action||action.reason)return;restoreFocus.current=true;onCommand(action.command);setConfirm(null);}}/>}
 </dialog>,document.body);
}
export function OngoingFlags({world,pending,onOpen,onBrowse,onCommand}:{world:World;pending:boolean;onOpen:(item:OngoingItem)=>void;onBrowse:()=>void;onCommand:(command:GameCommand)=>void}){
 const items=ongoingItems(world),signature=items.map(i=>i.id).join('|'),[order,setOrder]=useState<string[]>(()=>items.map(i=>i.id)),[openKind,setOpenKind]=useState<OngoingKind|null>(null),ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const ids=signature?signature.split('|'):[];setOrder(old=>{const next=[...old.filter(id=>ids.includes(id)),...ids.filter(id=>!old.includes(id))];return next.join('|')===old.join('|')?old:next;});},[signature]);
 useLayoutEffect(()=>{const node=ref.current!,header=node.closest('header')!,left=header.querySelector('.sovereign-strip'),right=header.querySelector('.chronicle-control');const resize=()=>{const parent=header.getBoundingClientRect(),l=left?.getBoundingClientRect(),r=right?.getBoundingClientRect();node.style.left=`${(l?.right??parent.left)-parent.left+8}px`;node.style.right=`${parent.right-(r?.left??parent.right)+8}px`;};resize();const observer=new ResizeObserver(resize);observer.observe(header);if(left)observer.observe(left);if(right)observer.observe(right);return()=>observer.disconnect();},[]);
 const ordered=[...items].sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length:ai)-(bi<0?order.length:bi);});
 const grouped=new Map<OngoingKind,OngoingItem[]>();for(const item of ordered){const bucket=grouped.get(item.kind);if(bucket)bucket.push(item);else grouped.set(item.kind,[item]);}
 const groups=[...grouped].map(([kind,entries])=>({kind,entries})),active=groups.find(group=>group.kind===openKind);
 useEffect(()=>{if(openKind&&!active)setOpenKind(null);},[openKind,active]);
 return <div ref={ref} className="ongoing-flags" data-empty={!items.length} aria-label="进行中的事项"><div className="ongoing-flag-row">{groups.map(({kind,entries})=>{
  const design=designs[kind],single=entries.length===1,item=entries[0],progress=item.progress===null?null:Math.round(item.progress*100),clock=ongoingClock(item),label=single?item.title.split(' · ')[0]:design.label;
  return <div key={kind} className="ongoing-flag-entry" style={{'--flag-color':design.color} as CSSProperties}><HoverHint label={label} content={single?<><strong>{item.title}</strong><p>{item.status}</p><p>{progress===null?'等待进展':`当前阶段 ${progress}%`} · {item.clock==='deadline'?'距离期限':item.clock==='estimate'?'预计还需':'还需'} {item.days===null?'尚未确定':item.days+' 日'}</p></>:<><strong>{design.label} · {entries.length} 项</strong><p>点击查看各项状态与操作。</p></>}><button className="ongoing-flag" aria-label={single?`${item.title}，${item.status}，${clock}`:`${design.label}，${entries.length} 项，打开事务列表`} aria-expanded={single?undefined:openKind===kind} onClick={()=>{if(single)onOpen(item);else{onBrowse();setOpenKind(kind);}}}><svg className="ongoing-cloth" viewBox="0 0 72 112" aria-hidden="true"><path d={design.path}/><path d="M8 8H64M10 12H62" className="ongoing-embroidery"/></svg><span className="ongoing-flag-content"><ArtIcon name={design.icon} size={32}/><span className="ongoing-flag-name">{label}</span>{single&&<><span className={`ongoing-meter ${progress===null?'waiting':''}`} role="progressbar" aria-label={item.title+'进度'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress??undefined} aria-valuetext={progress===null?item.status:progress+'%'}><i style={{width:progress===null?'100%':progress+'%'}}/></span><span className="ongoing-countdown">{clock}</span></>}</span>{!single&&<span key={entries.length} className="ongoing-flag-count" aria-hidden="true">{entries.length}</span>}</button></HoverHint></div>;
 })}</div>{active&&<GroupDialog kind={active.kind} items={active.entries} world={world} pending={pending} onClose={()=>setOpenKind(null)} onOpen={onOpen} onCommand={onCommand}/>}</div>;
}

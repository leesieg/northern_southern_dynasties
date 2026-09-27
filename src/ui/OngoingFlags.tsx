import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {ongoingItems,type OngoingItem,type OngoingKind} from '../core/ongoing';
import type {World} from '../core/types';
import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import './ongoingFlags.css';
const designs:Record<OngoingKind,{icon:ArtName;color:string;path:string}>={
 travel:{icon:'world',color:'#53664e',path:'M2 1H70V91L36 109 2 91Z'},
 activity:{icon:'person',color:'#52635c',path:'M2 1H70V96L54 109H18L2 96Z'},
 service:{icon:'diligent',color:'#776044',path:'M2 1H70V108L36 93 2 108Z'},
 petition:{icon:'influence',color:'#663e42',path:'M2 1H70V91L53 106 36 98 19 106 2 91Z'},
 diplomacy:{icon:'gregarious',color:'#445e69',path:'M2 1H70V80Q70 109 36 109Q2 109 2 80Z'},
 construction:{icon:'estate',color:'#676141',path:'M2 1H70V105H2Z'},
 reform:{icon:'renown',color:'#5b4b66',path:'M2 1H70V97L53 108 36 97 19 108 2 97Z'},
 scheme:{icon:'wary',color:'#4a535d',path:'M2 1H70V92L36 110 26 99H2Z'},
 military:{icon:'army',color:'#714a37',path:'M2 1H70V109L52 98 36 109 20 98 2 109Z'},
 retinue:{icon:'steadfast',color:'#456359',path:'M2 1H70V89L60 105H12L2 89Z'},
};
function ongoingClock(item:OngoingItem){return item.days===null?item.clock==='estimate'?'暂缓':'待办':`${item.clock==='deadline'?'限 ':item.clock==='estimate'?'约 ':''}${item.days}日`;}
export function OngoingFlags({world,onOpen}:{world:World;onOpen:(item:OngoingItem)=>void}){
 const items=ongoingItems(world),signature=items.map(i=>i.id).join('|'),[order,setOrder]=useState<string[]>(()=>items.map(i=>i.id)),ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const ids=signature?signature.split('|'):[];setOrder(old=>{const next=[...old.filter(id=>ids.includes(id)),...ids.filter(id=>!old.includes(id))];return next.join('|')===old.join('|')?old:next;});},[signature]);
 useLayoutEffect(()=>{const node=ref.current!,header=node.closest('header')!,left=header.querySelector('.sovereign-strip'),right=header.querySelector('.chronicle-control');const resize=()=>{const parent=header.getBoundingClientRect(),l=left?.getBoundingClientRect(),r=right?.getBoundingClientRect();node.style.left=`${(l?.right??parent.left)-parent.left+8}px`;node.style.right=`${parent.right-(r?.left??parent.right)+8}px`;};resize();const observer=new ResizeObserver(resize);observer.observe(header);if(left)observer.observe(left);if(right)observer.observe(right);return()=>observer.disconnect();},[]);
 const ordered=[...items].sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length:ai)-(bi<0?order.length:bi);});
 return <div ref={ref} className="ongoing-flags" data-empty={!items.length} aria-label="进行中的事项"><div className="ongoing-flag-row">{ordered.map(item=>{const d=designs[item.kind],progress=item.progress===null?null:Math.round(item.progress*100);return <div key={item.id} className="ongoing-flag-entry" style={{'--flag-color':d.color} as CSSProperties}><HoverHint label={item.title} content={<><strong>{item.title}</strong><p>{item.status}</p><p>{progress===null?'等待进展':`当前阶段 ${progress}%`} · {item.clock==='deadline'?'距离期限':item.clock==='estimate'?'预计还需':'还需'} {item.days===null?'尚未确定':item.days+' 日'}</p></>}><button className="ongoing-flag" aria-label={`${item.title}，${item.status}，${ongoingClock(item)}`} onClick={()=>onOpen(item)}><svg className="ongoing-cloth" viewBox="0 0 72 112" aria-hidden="true"><path d={d.path}/><path d="M8 8H64M10 12H62" className="ongoing-embroidery"/></svg><span className="ongoing-flag-content"><ArtIcon name={d.icon} size={32}/><span className="ongoing-flag-name">{item.title.split(' · ')[0]}</span><span className={`ongoing-meter ${progress===null?'waiting':''}`} role="progressbar" aria-label={item.title+'进度'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress??undefined} aria-valuetext={progress===null?item.status:progress+'%'}><i style={{width:progress===null?'100%':progress+'%'}}/></span><span className="ongoing-countdown">{ongoingClock(item)}</span></span></button></HoverHint></div>;})}</div></div>;
}

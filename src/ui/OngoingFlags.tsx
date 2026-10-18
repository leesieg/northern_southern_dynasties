import {warTargetName} from '../core/warTerritories';
import {regimeName} from '../core/government';
import {flagLayout} from './flagLayout';
import {activeWars,warRealmSide} from '../core/wars';
import {playerRealm} from '../core/realm';
import {warScoreBreakdown} from '../core/warScoring';
import {RealmFlag} from './RealmFlag';
import {HudFlagCloth} from './HudFlagCloth';
import {HudArt} from './HudArt';
import {ReferenceHudIcon} from './ReferenceHudArt';
import {CharacterPortrait} from './CharacterPortrait';
import {getPerson} from '../core/personRegistry';
import {useEffect,useLayoutEffect,useRef,useState,useId,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {ongoingItems,type OngoingItem,type OngoingKind} from '../core/ongoing';
import type {World} from '../core/types';
import {ArtIcon,type ArtName} from './ArtIcon';
import './ongoingFlags.css';

const designs:Record<OngoingKind,{icon:ArtName;color:string;path:string;label:string}>={
 travel:{icon:'world',color:'#53664e',path:'M2 1H70V91L36 109 2 91Z',label:'行旅'},
 activity:{icon:'person',color:'#52635c',path:'M2 1H70V96L54 109H18L2 96Z',label:'活动'},
 service:{icon:'diligent',color:'#776044',path:'M2 1H70V108L36 93 2 108Z',label:'差事'},
 petition:{icon:'influence',color:'#663e42',path:'M2 1H70V91L53 106 36 98 19 106 2 91Z',label:'奏请'},
 diplomacy:{icon:'gregarious',color:'#445e69',path:'M2 1H70V80Q70 109 36 109Q2 109 2 80Z',label:'外交'},
 construction:{icon:'estate',color:'#416568',path:'M2 1H70V105H2Z',label:'营建'},
 reform:{icon:'renown',color:'#5b4b66',path:'M2 1H70V97L53 108 36 97 19 108 2 97Z',label:'改革'},
 scheme:{icon:'wary',color:'#4a535d',path:'M2 1H70V92L36 110 26 99H2Z',label:'计谋'},
 military:{icon:'army',color:'#714a37',path:'M2 1H70V109L52 98 36 109 20 98 2 109Z',label:'军务'},
 retinue:{icon:'steadfast',color:'#456359',path:'M2 1H70V89L60 105H12L2 89Z',label:'幕职'},
 focus:{icon:'diligent',color:'#89713f',path:'M2 1H70V96L36 110 2 96Z',label:'重心'},
 marriage:{icon:'gregarious',color:'#755864',path:'M2 1H70V92L54 106 36 98 18 106 2 92Z',label:'婚事'},
 education:{icon:'diligent',color:'#4e635d',path:'M2 1H70V96L36 110 2 96Z',label:'教育'},
 family:{icon:'estate',color:'#6b6045',path:'M2 1H70V95Q54 112 36 99Q18 112 2 95Z',label:'家事'},
 care:{icon:'steadfast',color:'#52644e',path:'M2 1H70V92L36 108 2 92Z',label:'养护'},
 skills:{icon:'renown',color:'#52634a',path:'M2 1H70V109L52 98 36 109 20 98 2 109Z',label:'技能'},
};
export function ongoingClock(item:OngoingItem){return item.days===null?item.clock==='estimate'?'暂缓':'待办':`${item.clock==='deadline'?'限期 ':item.clock==='estimate'?'预计 ':'还需 '}${item.days}日`;}
export function OngoingItemsDialog({title,icon,items,onClose,onOpen,world,anchor}:{title:string;icon:ArtName;items:OngoingItem[];onClose:()=>void;onOpen:(item:OngoingItem)=>void;world?:World;anchor?:{x:number;y:number}}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{if(dialog.open)dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 return createPortal(<dialog ref={ref} className="ongoing-group-dialog paper-dialog" data-anchored={!!anchor} style={anchor?{left:`clamp(12px, ${anchor.x}px, calc(100vw - min(400px, 100vw - 24px) - 12px))`,top:`min(${anchor.y}px, 35dvh)`}:undefined} aria-label={title} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>event.stopPropagation()}>
  <header><ArtIcon name={icon} size={30}/><div><h2>{title} · {items.length}项</h2></div><button autoFocus aria-label="关闭事务列表" onClick={onClose}>×</button></header>
  <div className="ongoing-group-list">{items.map(item=><article key={item.id}><div className="ongoing-group-item-main">{world&&item.target.page==='person'&&getPerson(world,item.target.person)&&<CharacterPortrait world={world} characterId={item.target.person} name={getPerson(world,item.target.person)!.name} compact/>}<strong>{item.title}</strong><small>{item.status}</small></div><span className="ongoing-group-clock">{ongoingClock(item)}</span>{item.progress!==null&&<progress max={1} value={item.progress} aria-label={item.title+'进度'}/>}<div className="ongoing-group-actions"><button aria-label={'前往'+item.title+'详情'} onClick={()=>{onClose();onOpen(item);}}>查看</button></div></article>)}</div>
 </dialog>,document.body);
}
export function OngoingFlags({world,onOpen,onBrowse,onWar}:{world:World;onOpen:(item:OngoingItem)=>void;onBrowse:()=>void;onWar:(id:number)=>void}){
 const wars=activeWars(world).filter(w=>w.id!==undefined&&!!warRealmSide(w,playerRealm(world)));
 const [available,setAvailable]=useState(600),[anchor,setAnchor]=useState<{x:number;y:number}>();
 const artId=useId().replace(/:/g,'');
 const items=ongoingItems(world),signature=items.map(i=>i.id).join('|'),[order,setOrder]=useState<string[]>(()=>items.map(i=>i.id)),[openKind,setOpenKind]=useState<OngoingKind|null>(null),ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const ids=signature?signature.split('|'):[];setOrder(old=>{const next=[...old.filter(id=>ids.includes(id)),...ids.filter(id=>!old.includes(id))];return next.join('|')===old.join('|')?old:next;});},[signature]);
 useLayoutEffect(()=>{const node=ref.current!;const resize=()=>setAvailable(Math.max(1,node.clientWidth-7));resize();const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();},[]);
 const ordered=[...items].sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length:ai)-(bi<0?order.length:bi);});
 const grouped=new Map<OngoingKind,OngoingItem[]>();for(const item of ordered){const bucket=grouped.get(item.kind);if(bucket)bucket.push(item);else grouped.set(item.kind,[item]);}
 const groups=[...grouped].map(([kind,entries])=>({kind,entries})),active=groups.find(group=>group.kind===openKind);
 useEffect(()=>{if(openKind&&!active)setOpenKind(null);},[openKind,active]);
 const count=groups.length+wars.length,{columns,slot}=flagLayout(available,count,96);
 return <div ref={ref} className="ongoing-flags" data-empty={!count} data-rows={Math.ceil(count/columns)} data-compact={slot<60} style={{'--flag-slot':slot+'px','--flag-columns':columns} as CSSProperties} aria-label="待办与进行中的事项"><div className="ongoing-flag-row">{wars.map(war=>{const side=warRealmSide(war,playerRealm(world)),score=(war.civil?war.score:warScoreBreakdown(world,war).total)*(side==='attack'?1:-1),opponent=side==='attack'?war.defender:war.attacker,label=war.civil?.name??warTargetName(war,world)+'之战';return <div className="ongoing-flag-entry ongoing-war-entry" key={'war:'+war.id}><button className="ongoing-flag ongoing-war-flag" aria-label={label+'，'+regimeName(world,war.attacker)+' 对 '+regimeName(world,war.defender)+'，我方战分 '+score+'，查看战争'} onClick={()=>onWar(war.id!)}><HudFlagCloth id={artId+'-war-'+war.id} color="#854d40" path="M2 1H70V109L36 94 2 109Z"/><span className="ongoing-flag-content"><RealmFlag realm={opponent} world={world} compact showLabel={false}/><HudArt name="spears" size={38}/><span className="ongoing-flag-name">战事</span><b className="ongoing-war-score" data-positive={score>=0}>{score>0?'+':''}{score}</b><span className="ongoing-countdown">已持续{world.day-war.started}日</span></span></button></div>;})}{groups.map(({kind,entries})=>{
  const design=designs[kind],clothId=artId+'-'+kind,single=entries.length===1,item=entries[0],progress=item.progress===null?null:Math.round(item.progress*100),clock=ongoingClock(item),label=single?item.title.split(' · ')[0]:design.label,todo=item.clock==='waiting'&&item.progress===null;
  const flag=<button className="ongoing-flag" data-kind={kind} data-todo={todo} aria-label={single?`${item.title}，${item.status}，${clock}`:`${design.label}，${entries.length} 项，打开事务列表`} aria-expanded={single?undefined:openKind===kind} onClick={event=>{if(single)onOpen(item);else{const box=event.currentTarget.getBoundingClientRect();setAnchor({x:box.right+10,y:box.top+20});onBrowse();setOpenKind(kind);}}}><HudFlagCloth id={clothId} color={design.color} path={design.path} paper={kind==='focus'}/><span className="ongoing-flag-content"><span className="ongoing-flag-seal">{kind==='focus'||kind==='marriage'?<ReferenceHudIcon name={kind}/>:<HudArt name={kind==='construction'?'scroll':design.icon} size={38}/>}</span><span className="ongoing-flag-name">{label}</span>{single&&<>{progress!==null&&<span className="ongoing-progress"><span className="ongoing-meter" role="progressbar" aria-label={item.title+'进度'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress??undefined} aria-valuetext={progress===null?item.status:progress+'%'}><i style={{width:progress+'%'}}/></span><small>{progress}%</small></span>}<span className="ongoing-countdown">{clock}</span></>}</span>{!single&&<span key={entries.length} className="ongoing-flag-count" aria-hidden="true">{entries.length}</span>}</button>;
  return <div key={kind} className="ongoing-flag-entry" style={{'--flag-color':design.color} as CSSProperties}>{flag}</div>;
 })}</div>{active&&<OngoingItemsDialog world={world} anchor={anchor} title={designs[active.kind].label} icon={designs[active.kind].icon} items={active.entries} onClose={()=>setOpenKind(null)} onOpen={onOpen}/>}</div>;
}

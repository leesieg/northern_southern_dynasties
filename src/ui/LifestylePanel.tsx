import {ActionDialog} from './ActionDialog';
import {LifestyleTree} from './LifestyleTree';
import {HoverHint} from './HoverHint';
import {useState} from 'react';
import {ArtIcon} from './ArtIcon';
import {lifestyleBranches,lifestyleFocuses,branchPerks,LIFESTYLE_XP_PER_POINT,LIFESTYLE_SWITCH_DAYS,type LifestyleBranch} from '../data/lifestyles';
import {lifestyleProgress,lifestyleLearning,lifestyleStudyXP,lifestylePoints,lifestyleReason,lifestyleMasteries,lifestylePerson,freshLifestyle,type LifestyleCommand} from '../core/lifestyle';
import type {World} from '../core/types';
import './lifestyle.css';
export function LifestyleMasteryBadges({world,id}:{world:World;id?:string}){
 const masteries=lifestyleMasteries(world,id);return masteries.length?<div className="lifestyle-masteries" aria-label="后天生活专长">{masteries.map(p=><HoverHint key={p.name} label={p.name} content={<><strong>{p.name}</strong><p>{p.effect}</p></>}><span className="trait-badge trait-icon-only"><ArtIcon name={lifestyleBranches[p.branch].icon} size={30}/></span></HoverHint>)}</div>:null;
}
export function LifestylePanel({world:w,pending,send}:{world:World;pending:boolean;send:(c:LifestyleCommand)=>void}){
 const progress=lifestyleProgress(w)??freshLifestyle(w.day),current=progress.focus?lifestyleFocuses[progress.focus]:null;
 const [expanded,setExpanded]=useState(false);
 return <div className="lifestyle-panel"><section className="lifestyle-current"><ArtIcon name={current?lifestyleBranches[current.branch].icon:'person'} size={42}/><div><small>{w.people[0].name} · 当前生活重心</small><h3>{current?`${lifestyleBranches[current.branch].name} · ${current.name}`:'选择此生所长'}</h3><p>{current?current.effect:'初次选择获得该路线 1 点入门技能点'}</p></div></section><LifestyleMasteryBadges world={w}/><button className="lifestyle-scene-entry" onClick={()=>setExpanded(true)}><span><strong>{current?'生活重心':'选择生活重心'}</strong><small>{progress.study?'有待处理的研习抉择':current?'查看修习图 · 选择重心':'选择路线与重心 · 预览后确认'}</small></span><ArtIcon name="diligent" size={34}/></button>
 {expanded&&<LifestyleDialog key={lifestylePerson(w)} world={w} pending={pending} send={send} onClose={()=>setExpanded(false)} cancelLabel="返回人物"/>}
 </div>;
}
export function LifestyleDialog({world:w,pending,send,onClose,initialBranch,cancelLabel='返回地图'}:{world:World;pending:boolean;send:(c:LifestyleCommand)=>void;onClose:()=>void;initialBranch?:LifestyleBranch;cancelLabel?:string}){
 const progress=lifestyleProgress(w)??freshLifestyle(w.day),current=progress.focus?lifestyleFocuses[progress.focus]:null;
 const [branch,setBranch]=useState<LifestyleBranch>(initialBranch??current?.branch??'stewardship'),[focusDraft,setFocusDraft]=useState<string|null>(null);
 const info=lifestyleBranches[branch],learning=lifestyleLearning(w),points=lifestylePoints(progress,branch),cap=branchPerks(branch).length*LIFESTYLE_XP_PER_POINT,ready=progress.study;
 const focusCommand:LifestyleCommand={type:'lifestyle',action:'focus',focus:focusDraft??''},focusReason=focusDraft?lifestyleReason(w,focusCommand):'请选择重心';
 return <ActionDialog title={w.people[0].name+' · 生活重心'} className="lifestyle-tree-dialog" cancelLabel={cancelLabel} onClose={onClose} actions={<><span className="lifestyle-confirm-preview" role="status">{focusDraft?focusReason||'将选择 '+lifestyleFocuses[focusDraft].name+' · '+lifestyleFocuses[focusDraft].effect+' · 确认后 '+LIFESTYLE_SWITCH_DAYS+' 日内不能更换':current?'当前 '+current.name+' · '+current.effect:'请选择重心 · 初选获得本路线 1 点技能点'}</span><button className="primary" title={focusReason||'确认后生效，已学技能保留'} disabled={pending||!!focusReason} onClick={()=>{if(pending||lifestyleReason(w,focusCommand))return;send(focusCommand);setFocusDraft(null);}}>确认重心</button></>}>
 <div className="lifestyle-scene-toolbar"><nav className="lifestyle-branches detail-tabs" aria-label="生活路线">{(Object.entries(lifestyleBranches) as [LifestyleBranch,typeof info][]).map(([key,b])=><button key={key} aria-pressed={branch===key} onClick={()=>{setBranch(key);setFocusDraft(null);}}><ArtIcon name={b.icon} size={25}/><span>{b.name}</span><small>{lifestylePoints(progress,key)} 点</small></button>)}</nav><div className="lifestyle-scene-summary"><strong>{points} 可用技能点</strong><span>{progress.xp[branch]} / {cap} 经验</span><small>每 {LIFESTYLE_XP_PER_POINT} 经验获得 1 点</small></div></div>
 <div className="lifestyle-scene-status"><span>当前：{current?current.name:'尚未选择重心'}</span>{current&&<HoverHint label="每日经验来源" content={`基础 3${learning.affinity?' · 性格契合 +1':''}${learning.diligent?' · 勤勉 +1':''}${learning.stress?' · 高压力 -1':''}；经验按当前路线随游戏日推进。`}><span tabIndex={0}>{progress.xp[current.branch]>=branchPerks(current.branch).length*LIFESTYLE_XP_PER_POINT?'当前路线经验已满':`每日 +${learning.total} 经验`}</span></HoverHint>}<span>{current&&Math.max(0,progress.changed+LIFESTYLE_SWITCH_DAYS-w.day)?`更换冷却 ${progress.changed+LIFESTYLE_SWITCH_DAYS-w.day} 日`:'可选择重心'} · 已学技能保留</span></div>
 <fieldset className="lifestyle-focus-choice"><legend>{info.name}重心 · 选择后在下方确认</legend>{Object.entries(lifestyleFocuses).filter(([,f])=>f.branch===branch).map(([id,f])=><label key={id}><input type="radio" name="lifestyle-focus" checked={(focusDraft??progress.focus)===id} disabled={pending} onChange={()=>setFocusDraft(id)}/><span><strong>{f.name}{progress.focus===id?' · 当前':''}</strong><small>{f.effect}</small></span></label>)}</fieldset>
 {ready&&<section className="lifestyle-study"><strong>研习抉择 · {lifestyleBranches[ready.branch].name}</strong>{(['practice','rest'] as const).map(choice=>{const c:LifestyleCommand={type:'lifestyle',action:'study',choice},reason=lifestyleReason(w,c);return <HoverHint key={choice} label={choice==='practice'?'潜心研习':'休整'} content={reason||'按当前状态结算，不消耗技能点。'}><button disabled={pending||!!reason} onClick={()=>{if(pending||lifestyleReason(w,c))return;send(c);}}>{choice==='practice'?`研习 · 经验 +${lifestyleStudyXP(w)}${w.social?' / 压力 +8':''}`:w.social?'休整 · 压力 -8':'暂歇'}</button></HoverHint>;})}</section>}
 <LifestyleTree key={branch} world={w} branch={branch} owned={progress.perks} pending={pending} send={send}/>
 <p className="lifestyle-boundary">已学技能更换重心后保留；继任者使用自己的成长记录。军事及公款／公粮效果需历史沙盒，军务加成需授权，税粮加成仅作用于亲治城市；新工程加成不追改在建工程。</p>
 </ActionDialog>;
}

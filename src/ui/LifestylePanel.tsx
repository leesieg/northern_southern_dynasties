import {HoverHint} from './HoverHint';
import { useState } from 'react';
import { ArtIcon } from './ArtIcon';
import { lifestyleBranches,lifestyleFocuses,lifestylePerks,branchPerks,LIFESTYLE_XP_PER_POINT,LIFESTYLE_SWITCH_DAYS,type LifestyleBranch } from '../data/lifestyles';
import { lifestyleProgress,lifestyleLearning,lifestyleStudyXP,lifestylePoints,lifestyleReason,lifestyleMasteries,freshLifestyle,type LifestyleCommand } from '../core/lifestyle';
import type { World } from '../core/types';
import './lifestyle.css';
export function LifestyleMasteryBadges({world,id}:{world:World;id?:string}){
 const masteries=lifestyleMasteries(world,id);return masteries.length?<div className="lifestyle-masteries" aria-label="后天生活专长">{masteries.map(p=><HoverHint key={p.name} label={p.name} content={<><strong>{p.name}</strong><p>{p.effect}</p></>}><span className="trait-badge trait-icon-only"><ArtIcon name={lifestyleBranches[p.branch].icon} size={30}/></span></HoverHint>)}</div>:null;
}
export function LifestylePanel({world:w,pending,send}:{world:World;pending:boolean;send:(c:LifestyleCommand)=>void}){
 const progress=lifestyleProgress(w)??freshLifestyle(w.day),current=progress.focus?lifestyleFocuses[progress.focus]:null;
 const [branch,setBranch]=useState<LifestyleBranch>(current?.branch??'stewardship');
 const info=lifestyleBranches[branch],learning=lifestyleLearning(w),points=lifestylePoints(progress,branch),cap=branchPerks(branch).length*LIFESTYLE_XP_PER_POINT;
 const command=(c:LifestyleCommand)=>send(c),ready=progress.study;
 return <div className="lifestyle-panel">
 <section className="lifestyle-current"><ArtIcon name={current?lifestyleBranches[current.branch].icon:'person'} size={52}/><div><small>{w.people[0].name} · 当前生活重心</small><h3>{current?`${lifestyleBranches[current.branch].name} · ${current.name}`:'选择此生所长'}</h3><p>{current?current.effect:'初次选择获得该路线 1 点入门技能点'}</p></div></section>
 {current&&<div className="lifestyle-learning"><strong>{current&&progress.xp[current.branch]>=600?'当前路线经验已满':`每日 +${learning.total} 经验`}</strong><span>基础 3{learning.affinity?' · 性格契合 +1':''}{learning.diligent?' · 勤勉 +1':''}{learning.stress?' · 高压力 -1':''}</span><small>{Math.max(0,progress.changed+LIFESTYLE_SWITCH_DAYS-w.day)?`更换冷却：${progress.changed+LIFESTYLE_SWITCH_DAYS-w.day} 日`:'可以更换重心'} · 经验只随游戏日推进</small></div>}
 <LifestyleMasteryBadges world={w}/>
 {ready&&<section className="lifestyle-study"><span className="eyebrow">研习抉择 · {lifestyleBranches[ready.branch].name}</span><h3>{ready.branch==='martial'?'推演一局攻守':ready.branch==='stewardship'?'复核一册账籍':'复盘一场会谈'}</h3><p>深研可积累经验；也可以暂歇，舒缓心绪。</p>{(['practice','rest'] as const).map(choice=>{const c:LifestyleCommand={type:'lifestyle',action:'study',choice},reason=lifestyleReason(w,c);return <button key={choice} disabled={pending||!!reason} title={reason} onClick={()=>command(c)}>{choice==='practice'?`潜心研习 · 经验 +${lifestyleStudyXP(w)}${w.social?' / 压力 +8':''}`:w.social?'休整身心 · 压力 -8':'暂歇 · 不获得经验'}</button>;})}</section>}
 <nav className="lifestyle-branches detail-tabs" aria-label="生活路线">{(Object.entries(lifestyleBranches) as [LifestyleBranch,typeof info][]).map(([key,b])=><button key={key} aria-pressed={branch===key} onClick={()=>setBranch(key)}><ArtIcon name={b.icon} size={32}/>{b.name}<small>{lifestylePoints(progress,key)} 技能点</small></button>)}</nav>
 <p className="lifestyle-description">{info.description}</p>{branch==='martial'&&!w.realm&&<p className="lifestyle-scope-note">本局为营建教学局，没有军队；军事技能在历史沙盒中生效。</p>}{branch==='diplomacy'&&!w.social&&<p className="lifestyle-scope-note">教学局以营建为主，建议优先修习管理。</p>}
 <div className="lifestyle-focuses">{Object.entries(lifestyleFocuses).filter(([,f])=>f.branch===branch).map(([id,f])=>{const c:LifestyleCommand={type:'lifestyle',action:'focus',focus:id},reason=lifestyleReason(w,c);return <button key={id} aria-pressed={progress.focus===id} disabled={pending||!!reason} onClick={()=>command(c)} title={reason||`选择${f.name}`}><strong>{f.name}</strong><span>{f.effect}</span><small>{progress.focus===id?'当前重心':reason||'选择重心'}</small></button>;})}</div>
 <section className="lifestyle-xp" aria-label="技能成长进度"><div><strong>{info.name}技能树</strong><span>可用 {points} 点</span></div><progress value={progress.xp[branch]} max={cap}/><small>{progress.xp[branch]} / {cap} 经验 · 每 {LIFESTYLE_XP_PER_POINT} 经验获得 1 点{progress.xp[branch]>=cap?' · 本路线经验已满':''}</small></section>
 <div className="lifestyle-tree">
 <svg viewBox="0 0 400 744" preserveAspectRatio="none" aria-hidden="true"><path d="M200 142V162H100V194M200 162H300V194M100 328V388M300 328V560H200V584M100 522V560H200"/></svg>
 {branchPerks(branch).map(([id,p])=>{const c:LifestyleCommand={type:'lifestyle',action:'unlock',perk:id},reason=lifestyleReason(w,c),owned=progress.perks.includes(id);return <article key={id} className={`lifestyle-perk ${owned?'is-owned':!reason?'is-ready':'is-locked'} ${p.tier===0||p.mastery?'is-central':''}`} style={{gridRow:p.tier+1,gridColumn:p.tier===0||p.mastery?'1 / 3':p.side+1}}><div><ArtIcon name={info.icon} size={30}/><h4>{p.name}</h4>{owned&&<span aria-label="已掌握">✓</span>}</div><p>{p.effect}</p><small>{p.requires.length?'前置：'+p.requires.map(k=>lifestylePerks[k].name).join('、'):'本路线起点'}{p.mastery?' · 获得专长特质':''}</small><HoverHint label={p.name+'学习要求'} content={reason||'消耗 1 点技能点'}><button disabled={pending||!!reason} onClick={()=>command(c)}>{owned?'已掌握':reason?'尚未解锁':'学习 · 1 点'}</button></HoverHint></article>;})}
 </div>
 <p className="lifestyle-boundary">已学技能在更换重心后保留，经验按路线分别积累；家业交接后使用继任者自己的成长记录，专长不遗传。军事和公款／公粮效果需历史沙盒；军务加成还需授权，税粮加成仅作用于亲自治理城市。新工程加成不追改在建项目。</p>
 </div>;
}

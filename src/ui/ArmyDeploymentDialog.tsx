import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {playerRealm,armyDailyFood} from '../core/realm';
import {militaryArmyView} from '../core/militaryView';
import {armyDeploymentQuote} from '../core/armyDeployment';
import {supplyReserve} from '../core/armyLogistics';
import {act} from '../core/world';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';
export function ArmyDeploymentDialog({world:w,pending,send,onClose}:{world:World;pending:boolean;send:(c:GameCommand)=>void;onClose:()=>void}){
 const armies=w.realm!.armies.filter(a=>militaryArmyView(w,a).command&&!a.journey),r=playerRealm(w),homes=Object.entries(w.realm!.cities).filter(([,c])=>c.controller===r).sort((a,b)=>(b[1].grain-supplyReserve(w,b[0],r))-(a[1].grain-supplyReserve(w,a[0],r))),[mode,setMode]=useState<'rally'|'disperse'|'custom'>('rally'),[target,setTarget]=useState(homes[0]?.[0]??''),[choices,setChoices]=useState<Record<number,string>>({});
 const selected=armies.filter(a=>Object.hasOwn(choices,a.id!)),command={type:'armyDeployment',entries:selected.map((a,i)=>({army:a.id!,site:mode==='rally'?target:mode==='disperse'?(homes.filter(([id])=>id!==a.location)[i%Math.max(1,homes.length-1)]?.[0]??target):choices[a.id!]}))} as const,q=armyDeploymentQuote(w,command,act);
 return <ActionDialog title="联合军令" onClose={onClose} actions={<button className="primary" disabled={pending||!!q.reason} onClick={()=>{if(pending||armyDeploymentQuote(w,command,act).reason)return;send(command);onClose();}}>确认部署 · {selected.length} 军</button>}><div className="military-deployment-detail">
  <fieldset className="military-choice-group"><legend>部署方式</legend>{(['rally','disperse','custom'] as const).map(value=><label className="military-choice" key={value}><input type="radio" disabled={pending} name="army-deployment-mode" checked={mode===value} onChange={()=>setMode(value)}/><span>{value==='rally'?'统一集结':value==='disperse'?'分散驻防':'逐军分路'}<small>{value==='rally'?'前往同一目标':value==='disperse'?'按可征粮分配驻地':'分别选择目的地'}</small></span></label>)}</fieldset>
  {mode==='rally'&&<label>集结地<select disabled={pending} value={target} onChange={e=>setTarget(e.target.value)}>{homes.map(([id])=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label>}
  <p>已选 {selected.length} / {armies.length} 军；选择只修改方案，确认后统一执行。</p>{!armies.length&&<p>当前没有可部署的驻留军队。</p>}<div className="military-deployment-list">{armies.map(a=><div className="military-record" key={a.id}><label><input type="checkbox" disabled={pending} checked={Object.hasOwn(choices,a.id!)} onChange={()=>setChoices(v=>{const next={...v};if(Object.hasOwn(next,a.id!))delete next[a.id!];else next[a.id!]=homes.find(([id])=>id!==a.location)?.[0]??target;return next;})}/>第 {a.id} 军 · {siteById[a.location].name} · {a.troops} 人 · 日耗 {armyDailyFood(w,a)}</label>{mode==='custom'&&Object.hasOwn(choices,a.id!)&&<label>目的地<select disabled={pending} value={choices[a.id!]} onChange={e=>setChoices(v=>({...v,[a.id!]:e.target.value}))}>{Object.keys(w.realm!.cities).map(id=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label>}</div>)}</div>
  {q.rows.map(row=><p key={row.army}>第 {row.army} 军 → {siteById[row.site].name} · 最早 {row.days} 日后抵达 · 路程耗粮 {row.food}，携粮 {row.supply}{row.food>row.supply?'，需途中补给':''}</p>)}
  <p>分散驻防按各粮仓可征粮排序分配，各军保留统帅、供饷账户和兵团忠诚。行程不含道路装运等候、战斗和补给停滞；全部军令复核成功后一次下达。</p>{q.reason&&<p className="service-warning">{q.reason}</p>}
 </div></ActionDialog>;
}

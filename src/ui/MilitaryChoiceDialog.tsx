import {afterCommand} from './actionFeedback';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {playerRealm} from '../core/realm';
import {militaryCareerReason,type MilitaryCareerCommand} from '../core/militaryCareer';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';

export type MilitaryChoice={kind:'automation'|'priority';army:number}|{kind:'supplyPolicy'};
export function MilitaryChoiceDialog({world:w,choice,pending,send,onClose}:{world:World;choice:MilitaryChoice;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onClose:()=>void}){
 const army=choice.kind==='supplyPolicy'?undefined:w.realm?.armies.find(a=>a.id===choice.army);
 const [value,setValue]=useState<string>(()=>choice.kind==='supplyPolicy'?w.realm?.supplyPolicies?.[playerRealm(w)]??'normal':choice.kind==='automation'?army?.automation??'delegated':String(army?.supplyPriority??1));
 const options=choice.kind==='automation'?[
  {id:'direct',title:'亲自下令',description:'保留当前行程；抵达后等待你的军令。'},
  {id:'delegated',title:'自主行军',description:'将领按实际战事与补给选择集结、救援或撤退；不自动追加征募或预算。'},
 ]:choice.kind==='priority'?[
  {id:'0',title:'后备',description:'先保障其他军队，再分配剩余粮源。'},
  {id:'1',title:'常规',description:'按通常次序调度，不改变每日耗粮。'},
  {id:'2',title:'前线',description:'优先分配可调粮，可能推迟其他军队获得补给。'},
 ]:[
  {id:'civilian',title:'保民优先',description:'保留三月民食；军队可调粮减少。'},
  {id:'normal',title:'常规军需',description:'保留两月民食；安全线以内沿真实道路调运。'},
  {id:'emergency',title:'紧急征发',description:'保留一月民食；突破常规两月安全线的征粮降低地方秩序。'},
 ];
 const command:MilitaryCareerCommand=choice.kind==='supplyPolicy'?{type:'militaryCareer',action:'supplyPolicy',policy:value as 'civilian'|'normal'|'emergency'}:choice.kind==='automation'?{type:'militaryCareer',action:'automation',army:choice.army,control:value as 'direct'|'delegated'}:{type:'militaryCareer',action:'priority',army:choice.army,priority:Number(value)};
 const reason=militaryCareerReason(w,command),label=options.find(option=>option.id===value)?.title??'',title=choice.kind==='supplyPolicy'?'国家征粮政策':`第 ${choice.army} 军 · ${choice.kind==='automation'?'指挥方式':'补给优先级'}`;
 return <ActionDialog title={title} onClose={onClose} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(pending||militaryCareerReason(w,command))return;void afterCommand(send(command),()=>{onClose();});}}>确认 · {label}</button>}>
  <SingleChoiceCards label="选择方案" value={value} onChange={setValue} options={options} disabled={pending}/>
  <p>{choice.kind==='supplyPolicy'?'作用于本国军需调运；不会立即增发粮食，也不改变每日军粮消耗。':'仅调整本军；兵员、将领、供饷账户与当前库存不变。'}</p>
  {reason&&<p role="status" className="military-warning">{reason}</p>}
 </ActionDialog>;
}

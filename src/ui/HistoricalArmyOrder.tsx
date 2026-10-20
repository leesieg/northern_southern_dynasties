import {px} from './peopleScale';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {realmReason} from '../core/realm';
import {playerCommandsArmy} from '../core/civilWars';
import {armyCommander} from '../core/mobility';
import {getPerson} from '../core/personRegistry';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';
export function HistoricalArmyOrder({world:w,site,pending,send,onClose,error}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onClose:()=>void;error?:string}){
 const [army,setArmy]=useState<string|null>(null),[failed,setFailed]=useState(false),armies=w.realm!.armies.filter(a=>playerCommandsArmy(w,a)),selected=armies.find(a=>String(a.id)===army);
 const command={type:'realm',action:'march',army:selected?.id,site} as const,reason=selected?realmReason(w,command):'请选择实际部队';
 return <ActionDialog title={'调遣军队 · '+siteById[site].name} art="dispatch" onClose={onClose} actions={<button className="primary" disabled={pending||!!reason} onClick={async()=>{if(!selected||pending||realmReason(w,command))return;if(await send(command))onClose();else setFailed(true);}}>确认行军</button>}>
 <p>目标：{siteById[site].name}。只下达真实行军命令，途中按军粮、通行与战斗规则推进。</p><SingleChoiceCards label="选择部队" value={army} onChange={id=>{setArmy(id);setFailed(false);}} disabled={pending} options={armies.map(a=>({id:String(a.id),title:'第 '+a.id+' 军 · '+px(a.troops)+' 人',description:(getPerson(w,armyCommander(w,a)??'')?.name??'统帅空缺')+' · '+siteById[a.location].name+' · 随军粮 '+a.supply,reason:realmReason(w,{...command,army:a.id}),art:'dispatch'}))}/>{!armies.length&&<p>当前没有可选择的本方部队。可先到军队页征募或办理指挥权。</p>}
 {selected&&<p>保持该军现有供饷来源；变更目的地不会提供额外粮饷，也不会自动击退敌军。{selected.journey?'本军已在途，确认后改写后续目的地。':''}</p>}{reason&&<p role="status">{reason}</p>}{failed&&<p role="alert">{error||'军令未能保存，原命令未改变；请重试。'}</p>}
 </ActionDialog>;
}

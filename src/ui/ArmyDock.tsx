import {ArmyOrganizationPanel} from './ArmyOrganizationPanel';
import {DetailTabs} from './DetailTabs';
import {useEffect,useState} from 'react';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {ArtIcon,Resource} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {ArmySupplyStatus} from './ArmySupplyStatus';
import {MilitaryAftermathPanel} from './MilitaryAftermathPanel';
import {armyCommander,mobilityReason} from '../core/mobility';
import {playerCommandsArmy} from '../core/civilWars';
import {armyDailyFood,realmReason} from '../core/realm';
import {relationshipPeople} from '../data/relationships';
import {allegianceRealm} from '../core/officeEligibility';
import {isAlive} from '../core/lifeState';
import {attributes} from '../core/social';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import './armyDock.css';
export type ArmyMove={army:number;site?:string}|null;
export function ArmyDock({world:w,pending,send,onPerson,onLocate,move,onMove,focus}:{focus?:{army:number;seq:number};world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void;onLocate:(site:string)=>void;move:ArmyMove;onMove:(value:ArmyMove)=>void}){
 const [detailTab,setDetailTab]=useState<'supply'|'orders'|'organization'>('supply');
 const [appoint,setAppoint]=useState<number|null>(null),[candidate,setCandidate]=useState(''),[disband,setDisband]=useState<number|null>(null),[detail,setDetail]=useState<number|null>(null);
 useEffect(()=>{if(focus?.army)setDetail(focus.army);},[focus]);
 const armies=w.realm?.armies.filter(a=>a.troops>0&&playerCommandsArmy(w,a))??[],selected=armies.find(a=>a.id===appoint),inspected=armies.find(a=>a.id===detail);
 if(!armies.length)return null;
 const action=(label:string,icon:'world'|'person',reason:string,onClick:()=>void)=><HoverHint label={label} content={reason||label}><button disabled={pending||!!reason} onClick={onClick}><ArtIcon name={icon} size={22}/>{label}</button></HoverHint>;
 return <aside className="army-dock" aria-label="军队单位">{inspected?<><header className="army-dock-heading"><button onClick={()=>setDetail(null)} aria-label="返回军队列表">←</button><strong>第 {inspected.id} 军</strong></header><DetailTabs label="军队详情" value={detailTab} onChange={setDetailTab} items={[{id:'supply',label:'军情',icon:'grain'},{id:'orders',label:'军令',icon:'army'},{id:'organization',label:'编制',icon:'person'}]}/>{detailTab==='supply'&&<ArmySupplyStatus world={w} army={inspected} pending={pending} send={send}/>} {detailTab==='orders'&&<><div className="muster-chips">{armyCommander(w,inspected)===w.characterId&&(['balanced','attack','guard'] as const).map(stance=><button key={stance} disabled={pending} aria-pressed={(w.mobility?.stance??'balanced')===stance} onClick={()=>send({type:'mobility',action:'stance',stance})}>{({balanced:'稳步',attack:'进击',guard:'固守'})[stance]}</button>)}</div><MilitaryAftermathPanel world={w} army={inspected.id!} site={move?.site??inspected.location} pending={pending} send={send}/></>} {detailTab==='organization'&&<ArmyOrganizationPanel view="organize" world={w} site={inspected.location} pending={pending} send={send}/>}</>:armies.map(a=>{const leader=armyCommander(w,a),c={type:'realm',action:'disband',army:a.id} as const,reason=realmReason(w,c),moving=move?.army===a.id,march={type:'realm',action:'march',army:a.id,site:move?.site??a.location} as const,marchReason=realmReason(w,march),food=armyDailyFood(w,a);
 return <article className="army-unit" key={a.id}><div className="army-unit-main"><PositionSeat world={w} holder={leader} title="将领" icon="army" onPerson={onPerson} onManage={()=>{setCandidate('');setAppoint(a.id!);}}/><div className="army-unit-info"><header><strong>第 {a.id} 军</strong><button onClick={()=>onLocate(a.location)} title="定位驻地"><ArtIcon name="city" size={20}/>{siteById[a.location].name}</button></header><div className="military-metrics"><Resource name="person" value={a.troops} label="现役兵员"/><Resource name="steadfast" value={a.morale} label="士气"/><HoverHint label="军粮" content={`随军粮 ${a.supply}；每日最多 ${food}，保守可用 ${Math.floor(a.supply/Math.max(1,food))} 日；缺粮每日减员 2%。`}><Resource name="grain" value={a.supply} label="随军粮"/></HoverHint></div><small>{a.journey?'行军 → '+siteById[a.journey.route.at(-1)!].name+' · '+(a.journey.durations.slice(a.journey.leg).reduce((n,d)=>n+d,0)-a.journey.elapsed)+' 日':(a.trainingUntil??0)>w.day?'集训 · '+(a.trainingUntil!-w.day)+' 日':'驻扎'}{a.supply<food*3?' · 缺粮预警':''}{a.arrears?' · 欠饷 '+a.arrears:''}</small></div></div>
 <div className="army-unit-actions"><button disabled={pending||!!a.journey} onClick={()=>{setDisband(null);onMove({army:a.id!});}}><ArtIcon name="world" size={22}/>移动</button><button onClick={()=>{setDetail(a.id!);onMove(null);}}><ArtIcon name="army" size={22}/>军情</button>{action('遣散','person',reason,()=>{onMove(null);setDisband(a.id!);})}</div>
 {moving&&<div className="army-unit-order"><span>{move?.site?'前往 '+siteById[move?.site].name:'在地图点击目的地'}</span>{move?.site&&marchReason&&<small>{marchReason}</small>}<button disabled={pending||!move?.site||!!marchReason} onClick={()=>{send(march);onMove(null);}}>行军</button><button onClick={()=>onMove(null)}>取消</button></div>}
 {disband===a.id&&<div className="army-unit-order"><small>兵员和余粮归还驻地；动员费用不退。</small><button disabled={pending||!!reason} onClick={()=>{send(c);setDisband(null);}}>确认遣散</button><button onClick={()=>setDisband(null)}>取消</button></div>}</article>;})}
 {selected&&<PersonSelectionDialog world={w} title={'第 '+selected.id+' 军 · 任命将领'} options={relationshipPeople.filter(p=>allegianceRealm(w,p.id)===selected.realm&&isAlive(w,p.id)).map(p=>({id:p.id,score:attributes(w,p.id).martial,metric:'军事',reason:mobilityReason(w,{type:'mobility',action:'command',army:selected.id,person:p.id})}))} value={candidate} onSelect={setCandidate} onClose={()=>setAppoint(null)} pending={pending} confirmLabel="任命将领" description="将领须亲赴驻地；接掌后随本军行动。" onConfirm={()=>{send({type:'mobility',action:'command',army:selected.id,person:candidate});setAppoint(null);}}>{armyCommander(w,selected)&&<HoverHint label="免任将领" content={mobilityReason(w,{type:'mobility',action:'dismiss-command',army:selected.id!})||'将领留在当前驻地，军队不解散。'}><button disabled={pending||!!mobilityReason(w,{type:'mobility',action:'dismiss-command',army:selected.id!})} onClick={()=>{send({type:'mobility',action:'dismiss-command',army:selected.id!});setAppoint(null);}}>免任将领</button></HoverHint>}</PersonSelectionDialog>}
 </aside>;
}

import {afterCommand} from './actionFeedback';
import {allPeople} from '../core/personRegistry';
import {terrainSceneStyle} from './terrainScene';
import {RegimentCards} from './RegimentCards';
import {useEffect,useState,type CSSProperties} from 'react';
import {MilitaryCampaignPanel} from './CareerSystems';
import {ArmyOrganizationPanel} from './ArmyOrganizationPanel';
import {DetailTabs} from './DetailTabs';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {ConfirmAction} from './ConfirmAction';
import {ArmySupplyStatus} from './ArmySupplyStatus';
import {MilitaryAftermathPanel} from './MilitaryAftermathPanel';
import {armyCommander,mobilityReason} from '../core/mobility';
import {playerCommandsArmy} from '../core/civilWars';
import {armyDailyFood,armyFieldStatus,realmReason} from '../core/realm';
import {readyTroops} from '../core/armyOrganization';
import {armyBatchReason} from '../core/world';

import {allegianceRealm} from '../core/officeEligibility';
import {isAlive} from '../core/lifeState';
import {attributes} from '../core/social';
import {politicalName} from '../core/government';
import {siteById} from '../data/scenario';
import {authorityGrant} from '../core/authority';
import type {ArmyBatchCommand,World,GameCommand} from '../core/types';
import './armyDock.css';

export type ArmyMove={armies:number[];site?:string}|null;
interface Props {
 focus?:{army:number;seq:number;tab?:'campaign'};
 world:World;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;
 onPerson:(id:string)=>void;onLocate:(site:string)=>void;
 selectedArmies:number[];onSelectArmy:(id:number,extend:boolean)=>void;onClearSelection:()=>void;
 move:ArmyMove;onMove:(value:ArmyMove)=>void;
}
export function ArmyDock({world:w,pending,send,onPerson,onLocate,selectedArmies,onSelectArmy,onClearSelection,move,onMove,focus}:Props){
 const [detailTab,setDetailTab]=useState<'supply'|'orders'|'organization'|'campaign'>('supply');
 const [appoint,setAppoint]=useState<number|null>(null),[candidate,setCandidate]=useState(''),[disband,setDisband]=useState<number|null>(null),[detail,setDetail]=useState<number|null>(null);
 const [batchConfirm,setBatchConfirm]=useState<'merge'|'disband'|null>(null),[mergeTarget,setMergeTarget]=useState<number|null>(null);
 useEffect(()=>{if(focus?.army){setDetail(focus.army);setDetailTab(focus.tab??'supply');}},[focus]);
 const armies=w.realm?.armies.filter(a=>a.id&&a.troops>0&&playerCommandsArmy(w,a)&&authorityGrant(w,w.characterId!,'command',{realm:a.realm,site:a.location,army:a}).allowed)??[];
 const selected=armies.find(a=>a.id===appoint),inspected=armies.find(a=>a.id===detail),retiring=armies.find(a=>a.id===disband);
 const chosen=armies.filter(a=>selectedArmies.includes(a.id!)),ids=chosen.map(a=>a.id!);
 const target=ids.includes(mergeTarget??-1)?mergeTarget!:ids[0];
 const mergeCommand:ArmyBatchCommand={type:'armyBatch',action:'merge',armies:ids,target};
 const disbandCommand:ArmyBatchCommand={type:'armyBatch',action:'disband',armies:ids};
 const batchMove=move?.armies.length===ids.length&&ids.every(id=>move.armies.includes(id))&&ids.length>1?move:null;
 const marchCommand:ArmyBatchCommand|null=batchMove?.site?{type:'armyBatch',action:'march',armies:ids,site:batchMove.site}:null;
 const mergeReason=batchConfirm==='merge'?armyBatchReason(w,mergeCommand):'';
 const disbandReason=batchConfirm==='disband'?armyBatchReason(w,disbandCommand):'';
 const marchReason=marchCommand?armyBatchReason(w,marchCommand):'';
 if(!armies.length)return null;
 const action=(label:string,icon:'world'|'person',reason:string,onClick:()=>void)=><HoverHint label={label} content={reason||label}><button aria-label={label} disabled={pending||!!reason} onClick={onClick}><ArtIcon name={icon} size={20}/></button></HoverHint>;
 return <aside className={"army-dock"+(inspected?" is-inspecting":"")} aria-label="军队单位">{inspected?<>
  <header className="army-dock-heading detail-landscape" style={terrainSceneStyle(inspected.location)}><button onClick={()=>setDetail(null)} aria-label="返回军队列表">←</button><strong>第 {inspected.id} 军</strong></header>
  <p className="army-inspected-summary">{siteById[inspected.location].name} · {inspected.troops} 人 · 士气 {inspected.morale} · 随军粮 {inspected.supply} · 已训练 {readyTroops(inspected,w.day)} 人{w.mobility?.pendingCommanders?.[inspected.id!]?' · '+politicalName(w.mobility.pendingCommanders[inspected.id!].person,w)+'待赴任':''}</p>
  <DetailTabs label="军队详情" value={detailTab} onChange={setDetailTab} items={[{id:'supply',label:'军情',icon:'grain'},{id:'orders',label:'军令',icon:'army'},{id:'organization',label:'编制',icon:'person'},{id:'campaign',label:'战役',icon:'world'}]}/>
  <div className="army-inspected-body">{detailTab!=='organization'&&<RegimentCards army={inspected} world={w}/>}
  {detailTab==='campaign'&&<MilitaryCampaignPanel key={inspected.id} world={w} armyId={inspected.id} site={inspected.location} pending={pending} send={send} onPerson={onPerson}/>}
  {detailTab==='supply'&&<ArmySupplyStatus key={inspected.id} world={w} army={inspected} pending={pending} send={send}/>}
  {detailTab==='orders'&&<><div className="muster-chips">{armyCommander(w,inspected)===w.characterId&&(['balanced','attack','guard'] as const).map(stance=><button key={stance} disabled={pending} aria-pressed={(w.mobility?.stance??'balanced')===stance} onClick={()=>send({type:'mobility',action:'stance',stance})}>{({balanced:'稳步',attack:'进击',guard:'固守'})[stance]}</button>)}</div><MilitaryAftermathPanel world={w} army={inspected.id!} site={move?.site??inspected.location} pending={pending} send={send}/></>}
  {detailTab==='organization'&&<ArmyOrganizationPanel key={inspected.id} armyId={inspected.id} view="organize" world={w} site={inspected.location} pending={pending} send={send}/>}
  </div>
 </>:<>
  <header className="army-roster-heading"><span>现役部曲</span><small>{armies.length} 军</small></header>
  {chosen.length>1&&<section className="army-batch-bar" aria-label="批量军令"><header><strong>已选 {chosen.length} 军</strong><button onClick={()=>{onClearSelection();onMove(null);}}>清除</button></header><div className="army-batch-actions"><button onClick={()=>{setMergeTarget(ids[0]);setBatchConfirm('merge');onMove(null);}}>合军</button><button onClick={()=>{setBatchConfirm('disband');onMove(null);}}>遣散</button><button onClick={()=>{setBatchConfirm(null);onMove({armies:ids});}}>移动</button></div>
   {batchMove&&<div className="army-batch-order"><span>{batchMove.site?'前往 '+siteById[batchMove.site].name:'在地图点击目的地'}</span>{marchReason&&<small role="status">{marchReason}</small>}<button className="primary" disabled={pending||!marchCommand||!!marchReason} onClick={()=>{if(!marchCommand||armyBatchReason(w,marchCommand))return;void afterCommand(send(marchCommand),()=>onMove(null));}}>行军</button><button onClick={()=>onMove(null)}>取消</button></div>}
  </section>}
  {armies.map(a=>{const leader=armyCommander(w,a),pendingLeader=w.mobility?.pendingCommanders?.[a.id!],c={type:'realm',action:'disband',army:a.id} as const,reason=realmReason(w,c),moving=move?.armies.length===1&&move.armies[0]===a.id,march={type:'realm',action:'march',army:a.id,site:move?.site??a.location} as const,singleMarchReason=realmReason(w,march),food=armyDailyFood(w,a),trained=readyTroops(a,w.day);
   const status=a.journey?'行军 → '+siteById[a.journey.route.at(-1)!].name:trained<100?'集训':armyFieldStatus(w,a);
   const warning=[a.supply<food*3?'缺粮预警':'',a.arrears?'欠饷 '+a.arrears:'',pendingLeader?politicalName(pendingLeader.person,w)+'待赴任':''].filter(Boolean).join(' · ');
   const summary=<><strong>第 {a.id} 军 · {siteById[a.location].name}</strong><p>{a.troops} 人 · 士气 {a.morale} · 随军粮 {a.supply} · 保守可用 {Math.floor(a.supply/Math.max(.001,food))} 日</p><p>{status} · 已训练 {trained} / {a.troops} 人{a.journey?' · 剩余 '+(a.journey.durations.slice(a.journey.leg).reduce((n,d)=>n+d,0)-a.journey.elapsed)+' 日':''}</p>{warning&&<p>{warning}</p>}</>;
   const openDetails=()=>{setDetail(a.id!);setDetailTab('supply');onMove(null);};
   return <div className="army-strip-entry" key={a.id}><article className="army-unit army-unit--strip" style={{'--formation-columns':Math.ceil((a.regiments?.length??0)/2)} as CSSProperties} data-selected={selectedArmies.includes(a.id!)} data-army-id={a.id} aria-label={'第 '+a.id+' 军'} onClick={event=>{if((event.target as HTMLElement).closest('button,input,a,select,label'))return;onSelectArmy(a.id!,event.shiftKey);}}>
    <div className="army-unit-main"><PositionSeat world={w} holder={leader} title="将领" icon="army" onPerson={onPerson} onManage={()=>{setCandidate('');setAppoint(a.id!);}}/><RegimentCards army={a} world={w}/></div>
    <label className="army-unit-check"><input type="checkbox" aria-label={`选择第 ${a.id} 军`} checked={selectedArmies.includes(a.id!)} onChange={()=>onSelectArmy(a.id!,true)}/><span className="army-unit-check-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span></label>
    <div className="army-strip-label"><HoverHint label={'第 '+a.id+' 军军情'} content={summary}><button onClick={openDetails}>{a.id} 军</button></HoverHint></div>
    <div className="army-strip-state"><HoverHint label={status+(warning?' · '+warning:'')} content={summary}><button className={warning?'has-warning':''} onClick={openDetails}>{warning?'! ':''}{a.journey?'行军':trained<100?'集训':a.troops+' 人'}</button></HoverHint></div>
    <div className="army-unit-actions"><button aria-label={'移动第 '+a.id+' 军'} title="移动或改令" disabled={pending} onClick={()=>{setDisband(null);onSelectArmy(a.id!,false);onMove({armies:[a.id!]});}}><ArtIcon name="world" size={18}/></button><button aria-label="定位军队驻地" title={siteById[a.location].name+' · 定位驻地'} onClick={()=>onLocate(a.location)}><ArtIcon name="city" size={18}/></button>{action('遣散','person',reason,()=>{onMove(null);onSelectArmy(a.id!,false);setDisband(a.id!);})}</div>
   </article>{moving&&<div className="army-strip-order" aria-label={'第 '+a.id+' 军行军指令'}><span>第 {a.id} 军 · {move?.site?'前往 '+siteById[move.site].name:'在地图点击目的地'}</span>{move?.site&&singleMarchReason&&<small role="status">{singleMarchReason}</small>}<button disabled={pending||!move?.site||!!singleMarchReason} onClick={()=>{if(pending||!move?.site||realmReason(w,march))return;void afterCommand(send(march),()=>onMove(null));}}>确认行军</button><button onClick={()=>onMove(null)}>取消</button></div>}</div>;})}
 </>}
 {retiring&&<ConfirmAction title={'遣散第 '+retiring.id+' 军？'} detail={'兵员按兵团原籍返乡，在途有损耗；原籍失守或无安全道路时在驻地安置。'+(retiring.owner?'私人部曲携粮 '+retiring.supply+' 无偿交给驻地公仓，属于本次遣散的财产处置。':'余粮归还驻地粮仓。')+'动员费用不退。'} confirmLabel='确认遣散' danger pending={pending||!!realmReason(w,{type:'realm',action:'disband',army:retiring.id})} onCancel={()=>setDisband(null)} onConfirm={()=>{if(pending||realmReason(w,{type:'realm',action:'disband',army:retiring.id}))return;void afterCommand(send({type:'realm',action:'disband',army:retiring.id}),()=>{setDisband(null);});}}/>}
 {batchConfirm==='merge'&&<ConfirmAction title={`合并 ${ids.length} 支军队？`} detail={<div className="army-batch-confirm"><label>保留军队<select value={target} onChange={event=>setMergeTarget(Number(event.target.value))}>{chosen.map(a=><option key={a.id} value={a.id}>第 {a.id} 军 · {siteById[a.location].name}</option>)}</select></label><p>其余军队的兵员、随军粮和欠饷并入保留军队；须同城停驻、同一公库供饷，其他将领先交接。</p><p>合军后 {chosen.reduce((sum,a)=>sum+a.troops,0)} 人、随军粮 {chosen.reduce((sum,a)=>sum+a.supply,0)}。</p>{mergeReason&&<p className="military-warning" role="status">{mergeReason}</p>}</div>} confirmLabel="确认合军" pending={pending||!!mergeReason} onCancel={()=>setBatchConfirm(null)} onConfirm={()=>{if(pending||armyBatchReason(w,mergeCommand))return;void afterCommand(send(mergeCommand),()=>{setBatchConfirm(null);});}}/>}
 {batchConfirm==='disband'&&<ConfirmAction title={`遣散 ${ids.length} 支军队？`} detail={<div className="army-batch-confirm"><p>共 {chosen.reduce((sum,a)=>sum+a.troops,0)} 名兵员，按各兵团原籍返乡，在途有损耗；失守或无路可归者在驻地安置。余粮返仓，私人携粮也无偿交给驻地公仓，超仓损耗。动员费用不退。</p>{disbandReason&&<p className="military-warning" role="status">{disbandReason}</p>}</div>} confirmLabel="确认遣散" danger pending={pending||!!disbandReason} onCancel={()=>setBatchConfirm(null)} onConfirm={()=>{if(pending||armyBatchReason(w,disbandCommand))return;void afterCommand(send(disbandCommand),()=>{setBatchConfirm(null);});}}/>}
  {selected&&<PersonSelectionDialog world={w} context={{realm:selected.realm,site:selected.location}} title={'第 '+selected.id+' 军 · 任命将领'} options={allPeople(w).filter(p=>allegianceRealm(w,p.id)===selected.realm&&isAlive(w,p.id)).map(p=>({id:p.id,score:attributes(w,p.id).martial,metric:'军事',reason:mobilityReason(w,{type:'mobility',action:'command',army:selected.id,person:p.id})}))} value={candidate} onSelect={setCandidate} onClose={()=>setAppoint(null)} pending={pending} confirmLabel="任命将领" description="异地任命后自动赴营；抵达军队实际驻地才获得统帅加成。" onConfirm={()=>{if(pending||mobilityReason(w,{type:'mobility',action:'command',army:selected.id,person:candidate}))return;void afterCommand(send({type:'mobility',action:'command',army:selected.id,person:candidate}),()=>{setAppoint(null);});}}>{w.mobility?.pendingCommanders?.[selected.id!]&&<button disabled={pending} onClick={()=>{void afterCommand(send({type:'mobility',action:'cancel-command',army:selected.id!}),()=>{setAppoint(null);});}}>撤销待赴任</button>}{armyCommander(w,selected)&&<HoverHint label="免任将领" content={mobilityReason(w,{type:'mobility',action:'dismiss-command',army:selected.id!})||'将领留在当前驻地，军队不解散。'}><button disabled={pending||!!mobilityReason(w,{type:'mobility',action:'dismiss-command',army:selected.id!})} onClick={()=>{void afterCommand(send({type:'mobility',action:'dismiss-command',army:selected.id!}),()=>{setAppoint(null);});}}>免任将领</button></HoverHint>}</PersonSelectionDialog>}
 </aside>;
}

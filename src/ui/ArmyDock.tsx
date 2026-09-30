import {useEffect,useState} from 'react';
import {MilitaryCampaignPanel} from './CareerSystems';
import {ArmyOrganizationPanel} from './ArmyOrganizationPanel';
import {DetailTabs} from './DetailTabs';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {ArtIcon,Resource} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {ConfirmAction} from './ConfirmAction';
import {ArmySupplyStatus} from './ArmySupplyStatus';
import {MilitaryAftermathPanel} from './MilitaryAftermathPanel';
import {armyCommander,mobilityReason} from '../core/mobility';
import {playerCommandsArmy} from '../core/civilWars';
import {armyDailyFood,armyFieldStatus,realmReason} from '../core/realm';
import {readyTroops} from '../core/armyOrganization';
import {armyBatchReason} from '../core/world';
import {relationshipPeople} from '../data/relationships';
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
 world:World;pending:boolean;send:(c:GameCommand)=>void;
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
 return <aside className="army-dock" aria-label="军队单位">{inspected?<>
  <header className="army-dock-heading"><button onClick={()=>setDetail(null)} aria-label="返回军队列表">←</button><strong>第 {inspected.id} 军</strong></header>
  <DetailTabs label="军队详情" value={detailTab} onChange={setDetailTab} items={[{id:'supply',label:'军情',icon:'grain'},{id:'orders',label:'军令',icon:'army'},{id:'organization',label:'编制',icon:'person'},{id:'campaign',label:'战役',icon:'world'}]}/>
  {detailTab==='campaign'&&<MilitaryCampaignPanel key={inspected.id} world={w} armyId={inspected.id} site={inspected.location} pending={pending} send={send} onPerson={onPerson}/>}
  {detailTab==='supply'&&<ArmySupplyStatus key={inspected.id} world={w} army={inspected} pending={pending} send={send}/>}
  {detailTab==='orders'&&<><div className="muster-chips">{armyCommander(w,inspected)===w.characterId&&(['balanced','attack','guard'] as const).map(stance=><button key={stance} disabled={pending} aria-pressed={(w.mobility?.stance??'balanced')===stance} onClick={()=>send({type:'mobility',action:'stance',stance})}>{({balanced:'稳步',attack:'进击',guard:'固守'})[stance]}</button>)}</div><MilitaryAftermathPanel world={w} army={inspected.id!} site={move?.site??inspected.location} pending={pending} send={send}/></>}
  {detailTab==='organization'&&<ArmyOrganizationPanel key={inspected.id} armyId={inspected.id} view="organize" world={w} site={inspected.location} pending={pending} send={send}/>}
 </>:<>
  {chosen.length>1&&<section className="army-batch-bar" aria-label="批量军令"><header><strong>已选 {chosen.length} 军</strong><button onClick={()=>{onClearSelection();onMove(null);}}>清除</button></header><div className="army-batch-actions"><button onClick={()=>{setMergeTarget(ids[0]);setBatchConfirm('merge');onMove(null);}}>合军</button><button onClick={()=>{setBatchConfirm('disband');onMove(null);}}>遣散</button><button onClick={()=>{setBatchConfirm(null);onMove({armies:ids});}}>移动</button></div>
   {batchMove&&<div className="army-batch-order"><span>{batchMove.site?'前往 '+siteById[batchMove.site].name:'在地图点击目的地'}</span>{marchReason&&<small role="status">{marchReason}</small>}<button className="primary" disabled={pending||!marchCommand||!!marchReason} onClick={()=>{if(!marchCommand||armyBatchReason(w,marchCommand))return;send(marchCommand);onMove(null);}}>行军</button><button onClick={()=>onMove(null)}>取消</button></div>}
  </section>}
  {armies.map(a=>{const leader=armyCommander(w,a),pendingLeader=w.mobility?.pendingCommanders?.[a.id!],c={type:'realm',action:'disband',army:a.id} as const,reason=realmReason(w,c),moving=move?.armies.length===1&&move.armies[0]===a.id,march={type:'realm',action:'march',army:a.id,site:move?.site??a.location} as const,singleMarchReason=realmReason(w,march),food=armyDailyFood(w,a);
   return <article className="army-unit" key={a.id} data-selected={selectedArmies.includes(a.id!)} data-army-id={a.id} onClick={event=>{if((event.target as HTMLElement).closest('button,input,a,select,label'))return;onSelectArmy(a.id!,event.shiftKey);}}><label className="army-unit-check"><input type="checkbox" aria-label={`选择第 ${a.id} 军`} checked={selectedArmies.includes(a.id!)} onChange={()=>onSelectArmy(a.id!,true)}/><span className="army-unit-check-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span></label><div className="army-unit-main"><PositionSeat world={w} holder={leader} title="将领" icon="army" onPerson={onPerson} onManage={()=>{setCandidate('');setAppoint(a.id!);}}/><div className="army-unit-info"><header><strong>第 {a.id} 军</strong><button onClick={()=>onLocate(a.location)} title="定位驻地"><ArtIcon name="city" size={20}/>{siteById[a.location].name}</button></header><div className="military-metrics"><Resource name="person" value={a.troops} label="现役兵员"/><Resource name="steadfast" value={a.morale} label="士气"/><HoverHint label="军粮" content={`随军粮 ${a.supply}；每日最多 ${food}，保守可用 ${Math.floor(a.supply/Math.max(1,food))} 日；缺粮每日减员 2%。`}><Resource name="grain" value={a.supply} label="随军粮"/></HoverHint></div><small>{a.journey?'行军 → '+siteById[a.journey.route.at(-1)!].name+' · '+(a.journey.durations.slice(a.journey.leg).reduce((n,d)=>n+d,0)-a.journey.elapsed)+' 日':readyTroops(a,w.day)<100?'集训 · 尚不可出征':armyFieldStatus(w,a)}{readyTroops(a,w.day)<a.troops?' · 待训 '+(a.troops-readyTroops(a,w.day))+' 人':''}{pendingLeader?' · '+politicalName(pendingLeader.person)+'待赴任':''}{a.supply<food*3?' · 缺粮预警':''}{a.arrears?' · 欠饷 '+a.arrears:''}</small></div></div>
   <div className="army-unit-actions"><button aria-label="移动军队" title="移动或改令：在地图选择目的地" disabled={pending} onClick={()=>{setDisband(null);onSelectArmy(a.id!,false);onMove({armies:[a.id!]});}}><ArtIcon name="world" size={20}/></button><button aria-label="军情详情" title="军情、军令与编制" onClick={()=>{setDetail(a.id!);onMove(null);}}><ArtIcon name="army" size={20}/></button>{action('遣散','person',reason,()=>{onMove(null);onSelectArmy(a.id!,false);setDisband(a.id!);})}</div>
   {moving&&<div className="army-unit-order"><span>{move?.site?'前往 '+siteById[move.site].name:'在地图点击目的地'}</span>{move?.site&&singleMarchReason&&<small>{singleMarchReason}</small>}<button disabled={pending||!move?.site||!!singleMarchReason} onClick={()=>{if(pending||!move?.site||realmReason(w,march))return;send(march);onMove(null);}}>行军</button><button onClick={()=>onMove(null)}>取消</button></div>}
   </article>;})}
 </>}
 {retiring&&<ConfirmAction title={'遣散第 '+retiring.id+' 军？'} detail={'兵员按兵团原籍返乡，在途有损耗；原籍失守或无安全道路时在驻地安置。'+(retiring.owner?'私人部曲携粮 '+retiring.supply+' 无偿交给驻地公仓，属于本次遣散的财产处置。':'余粮归还驻地粮仓。')+'动员费用不退。'} confirmLabel='确认遣散' danger pending={pending||!!realmReason(w,{type:'realm',action:'disband',army:retiring.id})} onCancel={()=>setDisband(null)} onConfirm={()=>{if(pending||realmReason(w,{type:'realm',action:'disband',army:retiring.id}))return;send({type:'realm',action:'disband',army:retiring.id});setDisband(null);}}/>}
 {batchConfirm==='merge'&&<ConfirmAction title={`合并 ${ids.length} 支军队？`} detail={<div className="army-batch-confirm"><label>保留军队<select value={target} onChange={event=>setMergeTarget(Number(event.target.value))}>{chosen.map(a=><option key={a.id} value={a.id}>第 {a.id} 军 · {siteById[a.location].name}</option>)}</select></label><p>其余军队的兵员、随军粮和欠饷并入保留军队；须同城停驻、同一公库供饷，其他将领先交接。</p><p>合军后 {chosen.reduce((sum,a)=>sum+a.troops,0)} 人、随军粮 {chosen.reduce((sum,a)=>sum+a.supply,0)}。</p>{mergeReason&&<p className="military-warning" role="status">{mergeReason}</p>}</div>} confirmLabel="确认合军" pending={pending||!!mergeReason} onCancel={()=>setBatchConfirm(null)} onConfirm={()=>{if(pending||armyBatchReason(w,mergeCommand))return;send(mergeCommand);setBatchConfirm(null);}}/>}
 {batchConfirm==='disband'&&<ConfirmAction title={`遣散 ${ids.length} 支军队？`} detail={<div className="army-batch-confirm"><p>共 {chosen.reduce((sum,a)=>sum+a.troops,0)} 名兵员，按各兵团原籍返乡，在途有损耗；失守或无路可归者在驻地安置。余粮返仓，私人携粮也无偿交给驻地公仓，超仓损耗。动员费用不退。</p>{disbandReason&&<p className="military-warning" role="status">{disbandReason}</p>}</div>} confirmLabel="确认遣散" danger pending={pending||!!disbandReason} onCancel={()=>setBatchConfirm(null)} onConfirm={()=>{if(pending||armyBatchReason(w,disbandCommand))return;send(disbandCommand);setBatchConfirm(null);}}/>}
  {selected&&<PersonSelectionDialog world={w} title={'第 '+selected.id+' 军 · 任命将领'} options={relationshipPeople.filter(p=>allegianceRealm(w,p.id)===selected.realm&&isAlive(w,p.id)).map(p=>({id:p.id,score:attributes(w,p.id).martial,metric:'军事',reason:mobilityReason(w,{type:'mobility',action:'command',army:selected.id,person:p.id})}))} value={candidate} onSelect={setCandidate} onClose={()=>setAppoint(null)} pending={pending} confirmLabel="任命将领" description="异地任命后自动赴营；抵达军队实际驻地才获得统帅加成。" onConfirm={()=>{if(pending||mobilityReason(w,{type:'mobility',action:'command',army:selected.id,person:candidate}))return;send({type:'mobility',action:'command',army:selected.id,person:candidate});setAppoint(null);}}>{w.mobility?.pendingCommanders?.[selected.id!]&&<button disabled={pending} onClick={()=>{send({type:'mobility',action:'cancel-command',army:selected.id!});setAppoint(null);}}>撤销待赴任</button>}{armyCommander(w,selected)&&<HoverHint label="免任将领" content={mobilityReason(w,{type:'mobility',action:'dismiss-command',army:selected.id!})||'将领留在当前驻地，军队不解散。'}><button disabled={pending||!!mobilityReason(w,{type:'mobility',action:'dismiss-command',army:selected.id!})} onClick={()=>{send({type:'mobility',action:'dismiss-command',army:selected.id!});setAppoint(null);}}>免任将领</button></HoverHint>}</PersonSelectionDialog>}
 </aside>;
}

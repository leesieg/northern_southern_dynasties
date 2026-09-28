import {ConfirmAction} from './ConfirmAction';
import {SituationPanel} from './SituationPanel';
import {OfficialActions} from './OfficialActions';
import {PublicSuccessionPanel} from './PublicSuccessionPanel';
import { useState } from 'react';
import { ArtIcon } from './ArtIcon';
import { ministries,ministryIds,type MinistryId } from '../data/court';
import {officeCandidates} from '../core/officeEligibility';
import { governmentOf,governingExecutives,currentRealm,politicalName,governmentExecutive } from '../core/government';
import { courtOf,courtEnabled,courtReason,centralAppointmentCost,ministryCompetent,courtSalary,type CourtCommand } from '../core/court';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {isAlive} from '../core/lifeState';
import type { World,GameCommand } from '../core/types';
import './court.css';

export type CourtTab='succession'|'situation'|'ministries';
function LegacyCourtPanel({world:w,pending,send,onPerson,tab,onTab}:{world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void;tab:CourtTab;onTab:(tab:CourtTab)=>void}){
 const [confirmation,setConfirmation]=useState<string|null>(null),[candidate,setCandidate]=useState(w.characterId!),[office,setOffice]=useState<MinistryId|null>(null);
 const r=currentRealm(w),g=governmentOf(w)!,c=courtOf(w);if(!c)return <p>重新读取存档后可启用朝廷系统。</p>;
 const eligible=officeCandidates(w,r).filter(p=>isAlive(w,p.id)),enabled=courtEnabled(w,r);
 const action=(command:CourtCommand,label:string,consequence?:string)=>{const reason=courtReason(w,command),key=JSON.stringify(command);return <div className="court-action"><button disabled={pending||!!reason} onClick={()=>{if(consequence)setConfirmation(key);else send(command);}}>{label}</button>{reason&&<small>{reason}</small>}{confirmation===key&&consequence&&<ConfirmAction title={label} detail={consequence} confirmLabel='确认执行' danger pending={pending||!!reason} onCancel={()=>setConfirmation(null)} onConfirm={()=>{if(pending||courtReason(w,command))return;send(command);setConfirmation(null);}}/>}</div>;};
 return <div className="court-panel">
 {!enabled&&<p className="government-warning">此政体暂停朝廷集团、中央履职与局势推进；历史记录保留。可在制度页改为官僚类政体。</p>}
 {tab!=='situation'&&<nav className="realm-subnav detail-tabs" aria-label="朝廷事务">{([['ministries','朝廷','influence'],['succession','继承','renown']] as const).map(([key,label,icon])=><button key={key} aria-pressed={key==='ministries'?tab==='ministries':tab===key} onClick={()=>{onTab(key);setConfirmation(null);}}><ArtIcon name={icon}/><span>{label}</span></button>)}</nav>}
 {tab==='succession'&&<PublicSuccessionPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}
 {tab==='ministries'&&<><div className="realm-section-title"><h3>中央官职</h3><small>俸给 {courtSalary(w,r)} 钱／月</small></div><div className="court-office-grid">
 {[{id:g.ruler,title:'君主'},...governingExecutives(w,r).filter(id=>id!==g.ruler).map(id=>({id,title:'执政'}))].map(({id,title})=><PositionSeat key={title+id} world={w} holder={id} title={title} onPerson={onPerson}/>)}
 {ministryIds.map(id=><PositionSeat key={id} world={w} holder={c.ministries[id]} title={ministries[id].name} icon={id==='military'?'army':id==='finance'?'coins':'influence'} onPerson={onPerson} onManage={()=>{setOffice(id);setCandidate(governmentExecutive(w)?c.ministries[id]??w.characterId!:w.characterId!);setConfirmation(null);}} status={c.ministries[id]?(ministryCompetent(w,r,id)?'称职':'履职不足'):undefined}>{c.ministries[id]&&<OfficialActions world={w} person={c.ministries[id]!} pending={pending} send={send}/>}</PositionSeat>)}</div>
 {office&&<PersonSelectionDialog world={w} title={ministries[office].name} value={candidate} onSelect={setCandidate} onClose={()=>setOffice(null)} pending={pending} description={<>{ministries[office].duty} · {ministries[office].effect}。功绩达到 40 时称职。{c.ministries[office]&&<p>现任 {politicalName(c.ministries[office]!)}；新任命将撤换此人。</p>}</>} options={(governmentExecutive(w)?eligible:eligible.filter(p=>p.id===w.characterId)).map(p=>({id:p.id,score:g.merit[p.id]??0,metric:'功绩',reason:courtReason(w,governmentExecutive(w)?{type:'court',action:'appoint',ministry:office,candidate:p.id}:{type:'court',action:'seek-office',ministry:office})}))} confirmLabel={governmentExecutive(w)?`任命 · ${centralAppointmentCost(w,r,office,candidate)} 影响力`:'申请任职 · 25 影响力'} onConfirm={()=>{send(governmentExecutive(w)?{type:'court',action:'appoint',ministry:office,candidate}:{type:'court',action:'seek-office',ministry:office});setOffice(null);}}>{governmentExecutive(w)&&c.ministries[office]&&action({type:'court',action:'appoint',ministry:office,candidate:null},'免职 · 15 影响力','撤销此人的中央官职与履职增益。')}</PersonSelectionDialog>}

 </>}

 </div>;
}

export function CourtPanel(props:Parameters<typeof LegacyCourtPanel>[0]){return props.tab==='situation'?<SituationPanel {...props}/>:<LegacyCourtPanel {...props}/>;}

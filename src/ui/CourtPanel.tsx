import {RealmBadge} from './RealmBadge';
import {SituationPanel} from './SituationPanel';
import {OfficialActions} from './OfficialActions';
import {PublicSuccessionPanel} from './PublicSuccessionPanel';
import { useState } from 'react';
import { ArtIcon } from './ArtIcon';
import { ministries,ministryIds,type MinistryId } from '../data/court';
import { dynastyNames } from '../data/governments';
import { historicalCharacters } from '../data/characters';
import { governmentOf,governingExecutives,currentRealm,politicalName,governmentExecutive } from '../core/government';
import { courtOf,courtEnabled,courtReason,ministryCompetent,foundingPause,courtSalary,type CourtCommand } from '../core/court';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {isAlive} from '../core/lifeState';
import type { World,GameCommand } from '../core/types';
import './court.css';

export type CourtTab='succession'|'situation'|'movements'|'ministries'|'dynasty';
function LegacyCourtPanel({world:w,pending,send,onPerson,tab,onTab}:{world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void;tab:CourtTab;onTab:(tab:CourtTab)=>void}){
 const [confirmation,setConfirmation]=useState<string|null>(null),[name,setName]=useState(''),[candidate,setCandidate]=useState(w.characterId!),[office,setOffice]=useState<MinistryId|null>(null);
 const r=currentRealm(w),g=governmentOf(w)!,c=courtOf(w);if(!c)return <p>重新读取存档后可启用朝廷系统。</p>;
 const eligible=historicalCharacters.filter(p=>p.polity===r&&isAlive(w,p.id)),enabled=courtEnabled(w,r);
 const person=(id:string)=><button className="court-person" onClick={()=>onPerson(id)}>{politicalName(id)} ↗</button>;
 const action=(command:CourtCommand,label:string,consequence?:string)=>{const reason=courtReason(w,command),key=JSON.stringify(command);return <div className="court-action"><button disabled={pending||!!reason} onClick={()=>{if(consequence&&confirmation!==key){setConfirmation(key);return;}setConfirmation(null);send(command);}}>{confirmation===key?'确认：':''}{label}</button>{reason&&<small>{reason}</small>}{confirmation===key&&<aside role="status"><p>{consequence}</p><button onClick={()=>setConfirmation(null)}>取消</button></aside>}</div>;};
 return <div className="court-panel">
 {!enabled&&<p className="government-warning">此政体暂停朝廷集团、中央履职与局势推进；历史记录保留。可在制度页改为官僚类政体。</p>}
 {tab!=='situation'&&<nav className="realm-subnav detail-tabs" aria-label="朝廷事务">{([['ministries','朝廷','influence'],['succession','继承','renown']] as const).map(([key,label,icon])=><button key={key} aria-pressed={key==='ministries'?tab==='ministries'||tab==='movements':tab===key} onClick={()=>{onTab(key);setConfirmation(null);}}><ArtIcon name={icon}/><span>{label}</span></button>)}</nav>}
 {tab==='succession'&&<PublicSuccessionPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}
 {tab==='ministries'&&<><div className="realm-section-title"><h3>中央官职</h3><small>俸给 {courtSalary(w,r)} 钱／月</small></div><div className="court-office-grid">
 {[{id:g.ruler,title:'君主'},...governingExecutives(w,r).filter(id=>id!==g.ruler).map(id=>({id,title:'执政'}))].map(({id,title})=><PositionSeat key={title+id} world={w} holder={id} title={title} onPerson={onPerson}/>)}
 {ministryIds.map(id=><PositionSeat key={id} world={w} holder={c.ministries[id]} title={ministries[id].name} icon={id==='military'?'army':id==='finance'?'coins':'influence'} onPerson={onPerson} onManage={()=>{setOffice(id);setCandidate(governmentExecutive(w)?c.ministries[id]??w.characterId!:w.characterId!);setConfirmation(null);}} status={c.ministries[id]?(ministryCompetent(w,r,id)?'称职':'履职不足'):undefined}>{c.ministries[id]&&<OfficialActions world={w} person={c.ministries[id]!} pending={pending} send={send}/>}</PositionSeat>)}</div>
 {office&&<PersonSelectionDialog world={w} title={ministries[office].name} value={candidate} onSelect={setCandidate} onClose={()=>setOffice(null)} pending={pending} description={<>{ministries[office].duty} · {ministries[office].effect}。功绩达到 40 时称职。{c.ministries[office]&&<p>现任 {politicalName(c.ministries[office]!)}；新任命将撤换此人。</p>}</>} options={(governmentExecutive(w)?eligible:eligible.filter(p=>p.id===w.characterId)).map(p=>({id:p.id,score:g.merit[p.id]??0,metric:'功绩',reason:courtReason(w,governmentExecutive(w)?{type:'court',action:'appoint',ministry:office,candidate:p.id}:{type:'court',action:'seek-office',ministry:office})}))} confirmLabel={governmentExecutive(w)?'任命 · 15 影响力':'申请任职 · 25 影响力'} onConfirm={()=>{send(governmentExecutive(w)?{type:'court',action:'appoint',ministry:office,candidate}:{type:'court',action:'seek-office',ministry:office});setOffice(null);}}>{governmentExecutive(w)&&c.ministries[office]&&action({type:'court',action:'appoint',ministry:office,candidate:null},'免职 · 15 影响力','撤销此人的中央官职与履职增益。')}</PersonSelectionDialog>}

 </>}
 {tab==='dynasty'&&<><section className="court-card"><h4>新朝国号</h4><label>国号<input value={name} maxLength={6} placeholder="填写 1—6 个汉字" onChange={e=>{setName(e.target.value);setConfirmation(null);}}/></label><p>当前君主 {person(g.ruler)} · 实际执政 {governingExecutives(w,r).map(id=><span key={id}>{person(id)}</span>)}</p>{action({type:'court',action:'found',mode:'usurp',name},'拥立新朝 · 300 公款 / 80 影响力','这是本局架空改朝换代。需推进 120 个有效日；完成后你成为君主与执政，旧官撤任，公库损失 15%、军队士气 −20、所属城市秩序 −10。家业、人物与既有疆界保留。')}{action({type:'court',action:'found',mode:'unify',name},'重建天朝 · 300 公款 / 80 影响力','需实控 75% 非边疆城市、天命 80、支持 70、功绩 60、实际执政。120 个有效日后建立所选国号与天朝制；旧官撤任、公库损失 15%、士气 −20、秩序 −10。未控制政权不会被自动吞并。')}<small>拥立需地方或中央权力基础、领衔势力 ≥50% 的集团、支持 70、功绩 60；原君主合法性 ≤40 或朝局危局。君位继承可在朝廷的“继承”中查看。</small></section>
 {c.founding&&<section className="court-card"><h4>「{c.founding.name}」建朝议程</h4><p>拥立 {person(c.founding.sponsor)} · {c.founding.progress} / 120 日</p><progress max={120} value={c.founding.progress}/><p>{foundingPause(w,r)||'条件满足，正在推进'}</p>{action({type:'court',action:'cancel'},'撤回 · 成本不退','撤回当前建朝议程，不返还已付成本。')}</section>}
 <h4>历朝国号</h4><ol className="court-dynasties">{w.realm!.governments!.regimes.filter(v=>v.realm===r).map(v=><li key={v.id}><RealmBadge realm={r} world={w} name={v.name??dynastyNames[v.dynasty]}/><small>{v.kind==='sandbox'?'本局推演':'历史路线／剧本'} · 第 {v.from} 日至{v.until===null?'今':v.until+' 日'}</small><p>建朝／建档君主 {person(v.ruler)} · 承接 {v.cities.length} 个城市</p></li>)}</ol></>}

 </div>;
}

export function CourtPanel(props:Parameters<typeof LegacyCourtPanel>[0]){return props.tab==='situation'||props.tab==='movements'?<SituationPanel {...props}/>:<LegacyCourtPanel {...props}/>;}

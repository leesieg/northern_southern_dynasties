import {ConfirmAction} from './ConfirmAction';
import {PersonChoice,PositionSeat} from './PersonSelection';
import {attributes} from '../core/social';
import {presentAt} from '../core/residence';
import {departureReason} from '../core/mobility';
import {personalRoute} from '../core/diplomacy';
import {useState} from 'react';
import {chiefOfDuty,dutyCandidates,dutyPause,dutyPhaseNames,dutyPlans,dutyReason,type DutyCommand,type DutyPlan} from '../core/duties';
import type {World,GameCommand} from '../core/types';
import {Resource} from './ArtIcon';
export function DutiesPanel({world:w,pending,send,onPerson}:{world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void}){
 const [candidate,setCandidate]=useState(''),[confirm,setConfirm]=useState(false);
 const t=w.duties?.task,chief=chiefOfDuty(w),isChief=w.characterId===chief,isOfficer=w.characterId===t?.officer;
 const action=(command:DutyCommand,label:string)=>{const reason=dutyReason(w,command);return <div className="realm-action"><button disabled={pending||!!reason} onClick={()=>send(command)}>{label}</button>{reason&&<small>{reason}</small>}</div>;};
 if(!t)return <section><h3>天水粮务</h3><p>天水来报军民口粮紧缺，请朝廷筹措。由独孤信拟议，执政者批拨钱粮，限一百二十日办结。</p><p>办结可获功绩 20，改善与执政者的交情，并恢复天水秩序与繁荣。</p>{action({type:'duty',action:'open'},'受理粮务')}</section>;
 const pause=dutyPause(w),candidates=dutyCandidates(w).filter(c=>c.id!==t.officer);
 return <section className="duty-panel"><header><small>地方差事 · {dutyPhaseNames[t.phase]}</small><h3>天水粮务</h3></header><div className="assignment-officers"><PositionSeat compact world={w} holder={chief} title="执政" onPerson={onPerson}/><PositionSeat compact world={w} holder={t.officer} title="承办" onPerson={onPerson}/></div>
 <p>{t.phase==='closed'?'已结案':`距限期 ${Math.max(0,t.deadline-w.day)} 日`} · {t.plan?dutyPlans[t.plan].name:'等待拟议'}</p>
 <div className="realm-actions"><Resource name="coins" value={t.funds.coins} label="专拨公款" caption/><Resource name="grain" value={t.funds.grain} label="专拨公粮" caption/></div>
 {t.started&&<><progress aria-label="粮务进度" max={t.required} value={t.progress}/><p>已办理 {t.progress} / {t.required} 日</p></>}
 {isOfficer&&w.mobility&&!presentAt(w,w.characterId!,'tianshui')&&t.phase!=='closed'&&<button disabled={pending||!!w.people[0].journey||!!departureReason(w)||!personalRoute(w,'tianshui')} onClick={()=>send({type:'travel',destination:'tianshui'})}>赴天水办理</button>}
 {pause&&<p role="status">{pause}。限期继续计算。</p>}
 {t.result?<><h4>{t.result.success?'考绩上等':'未能办结'}</h4><p>{t.result.reason}</p><p>考绩标准：在世承办人功绩 +{t.result.merit} · 双方交往积累各 {t.result.opinion>0?'+':''}{t.result.opinion}（均受上限约束）</p><p>{t.result.returned?'未启办，预算已退回公库。':'已投入的钱粮不退回。'}</p></>:<>
 {isOfficer&&t.phase==='proposal'&&<div>{(Object.keys(dutyPlans) as DutyPlan[]).map(plan=><article key={plan}><h4>{dutyPlans[plan].name}</h4><p>{dutyPlans[plan].description}</p>{action({type:'duty',action:'propose',plan},'呈请此案')}</article>)}</div>}
 {isChief&&t.phase==='approval'&&<><p>{dutyPlans[t.plan!].description}</p><div className="realm-actions">{action({type:'duty',action:'approve'},'核准并拨款')}{action({type:'duty',action:'revise'},'退回重拟')}</div></>}
 {isOfficer&&t.phase==='ready'&&action({type:'duty',action:'start'},'启办粮务')}
 {isOfficer&&t.phase==='incident'&&<><p>粮队遇险路。追加护送保持工期；绕行增加五日。</p><div className="realm-actions">{!t.aidRequested&&action({type:'duty',action:'request-aid'},'求援 · 追加公款 20')}{action({type:'duty',action:'escort'},'增派护送')}{action({type:'duty',action:'detour'},'绕行 · 工期 +5 日')}</div></>}
 {isChief&&t.phase==='aid'&&<><p>承办人请拨公款 20，护送粮队通过险路。</p><div className="realm-actions">{action({type:'duty',action:'grant'},'批准追加 20')}{action({type:'duty',action:'deny'},'不予追加')}</div></>}
 {isChief&&t.phase==='report'&&action({type:'duty',action:'close'},'核定考绩 · 结案')}
 {t.phase==='working'&&<p>粮务正在办理。继续时间以推进差事。</p>}
 {((isChief&&['proposal','ready','incident'].includes(t.phase))||(isOfficer&&['approval','aid','report'].includes(t.phase)))&&<p>等待{isChief?'承办人':'朝廷'}答复，继续时间以接收文书。</p>}
 {isChief&&<section className="detail-record-group"><h4>改派与撤回</h4><p>改派保留预算和进度，由新承办人领取考绩。</p><PersonChoice world={w} title="接任者" value={candidate} onChange={setCandidate} pending={pending} onPerson={onPerson} options={candidates.map(c=>({id:c.id,score:attributes(w,c.id).stewardship,metric:"职务能力",reason:dutyReason(w,{type:'duty',action:'replace',candidate:c.id})}))}/>{action({type:'duty',action:'replace',candidate},'改派此人')}<p>撤回视为未能办结：天水秩序 −8，双方交往积累 −8；启办后不退钱粮。</p><button onClick={()=>setConfirm(true)}>撤回差事</button>{confirm&&<ConfirmAction title='撤回天水粮务？' detail='撤回视为未能办结：天水秩序 −8，双方交往积累 −8；启办后不退钱粮。' confirmLabel='确认撤回' danger pending={pending||!!dutyReason(w,{type:'duty',action:'cancel'})} onCancel={()=>setConfirm(false)} onConfirm={()=>{if(pending||dutyReason(w,{type:'duty',action:'cancel'}))return;send({type:'duty',action:'cancel'});setConfirm(false);}}/>}</section>}
 </>}
 {t.history.length>0&&<section className="detail-record-group"><h4>往来文书 · {t.history.length}</h4>{t.history.slice().reverse().map((h,i)=><p key={i}>第 {h.day} 日 · {h.text}</p>)}</section>}</section>;
}

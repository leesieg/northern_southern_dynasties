import {afterCommand} from './actionFeedback';
import { useEffect,useState } from 'react';
import {CommandButton} from './CommandButton';
import {ActionDialog} from './ActionDialog';
import {getCharacter} from '../core/personRegistry';
import { familyStanding } from '../core/family';
import { buildingModifiers,heirs,legacyDefinitions,type Legacy,type SocialCommand } from '../core/social';
import type { RelationshipCommand } from '../core/relationships';
import type { World } from '../core/types';
import { Resource,ArtIcon } from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import './social.css';
export function SocialPanel({world:w,pending,send,onPerson,section='family'}:{world:World;pending:boolean;send:(c:SocialCommand|RelationshipCommand)=>Promise<boolean>;onPerson:(id:string)=>void;section?:'self'|'family'}){
 const [confirm,setConfirm]=useState(false),[draft,setDraft]=useState<Extract<SocialCommand,{type:'rest'|'legacy'|'heir'}>|null>(null),s=w.social,id=w.characterId;
 useEffect(()=>{setDraft(null);setConfirm(false);},[id,section]);
 if(!s||!id)return <p>暂无家业事务。</p>;
 const m=buildingModifiers(w),eligible=heirs(w),restRemaining=Math.max(0,(s.cooldowns[id+'|rest']??0)-w.day);
 const restReason=w.people[0].journey?'请先抵达':restRemaining?'休整仍需冷却 '+restRemaining+' 日':w.people[0].coins<20?'需私财 20 钱':'';
 const legacyReason=(branch:Legacy)=>s.legacies[branch]>=2?'世业已满级':s.renown<30*(s.legacies[branch]+1)?'家业名望不足，需 '+30*(s.legacies[branch]+1):'';
 const draftReason=draft?.type==='rest'?restReason:draft?.type==='legacy'?legacyReason(draft.branch):draft?.type==='heir'&&!eligible.some(p=>p.id===draft.target)?'此人已不符合家业继任条件':'';
 const draftTitle=draft?.type==='rest'?'休整身心':draft?.type==='legacy'?'解锁'+legacyDefinitions[draft.branch].name:draft?.type==='heir'?'指定家业继任人':'';

 return <div className="social-panel">
 {section==='self'?<><article><h3><ArtIcon name="stress" size={26}/>身心与修养</h3><Resource name="stress" value={s.stress} label="压力" unit="/100"/><progress aria-label="压力" max={100} value={s.stress}/><CommandButton label="休整身心" icon="stress" hint="私财支出 20 钱，压力减少 30；之后冷却 15 日。" pending={pending} reason={restReason} onClick={()=>setDraft({type:'rest'})}/><small>{restRemaining?'还需 '+restRemaining+' 日':w.people[0].journey?'抵达后可休整':'冷却 15 日'}</small></article><section className="detail-record-group"><h4>营建与家族加成</h4><p>工程造价 {m.costRate}% · 工期 {m.timeRate}%</p><p>协理：{s.advisor?<button onClick={()=>onPerson(s.advisor!)}>{getCharacter(w,s.advisor)?.name??s.advisor} →</button>:'暂无'}</p><p>家族外交 +{familyStanding(w).diplomacy} · 每月减压 +{familyStanding(w).calm}</p></section></>:<>
 <h3>家族世业</h3><Resource name="renown" value={s.renown} label="家业名望" caption/><small>每月 +10，工程竣工 +5。解锁世业不消耗累计家族威望。</small>
 <div className="social-cards">{(Object.keys(legacyDefinitions) as Legacy[]).map(branch=><article key={branch}><h3>{legacyDefinitions[branch].name} · {s.legacies[branch]} / 2</h3><p>{legacyDefinitions[branch].effect}</p><CommandButton label={s.legacies[branch]>=2?'世业已满':'解锁世业'} icon="renown" hint={<><p>{legacyDefinitions[branch].effect}</p>{s.legacies[branch]<2&&<p>支出家业名望 {30*(s.legacies[branch]+1)}，解锁第 {s.legacies[branch]+1} 级；不消耗累计家族威望。</p>}</>} pending={pending} reason={legacyReason(branch)} selected={draft?.type==='legacy'&&draft.branch===branch} onClick={()=>setDraft({type:'legacy',branch})}/></article>)}</div>
 <h3>家业继任</h3><div className="social-cards">{eligible.map(p=><article key={p.id}><button onClick={()=>onPerson(p.id)}>{p.name} →</button><p>{p.title}</p><CommandButton label={s.heir===p.id?'已指定继任':'指定继任'} icon="person" hint={'指定'+p.name+'承接家业；官职与皇位不会随家业交接。此步骤不立即交接。'} pending={pending} reason={s.heir===p.id?'当前已指定此人':''} selected={s.heir===p.id} onClick={()=>{setConfirm(false);setDraft({type:'heir',target:p.id});}}/></article>)}</div>{!eligible.length&&<p>暂无合格继任者。</p>}
 {s.heir&&<article><h3>交接予 {getCharacter(w,s.heir)?.name}</h3><p>交接后以继任者继续游玩。保留私产、庄园、工程与世业；当前人物退居，压力重置为 20，协理及未完成交往撤销。</p><section className="detail-record-group"><h4>官职与军务</h4><p>军务重新核定，公职和皇位不随家业交接。幼年继任者可承接家业，任官与政务须成年。</p></section><CommandButton label="交接家业" icon="estate" danger pending={pending} reason={w.people[0].journey?'请先抵达，再交接家业':''} hint="交接后改以继任者游玩，当前人物退居；预览后确认，官职与皇位另行核定。" onClick={()=>setConfirm(true)}/>{confirm&&<ConfirmAction title={'交接家业予 '+getCharacter(w,s.heir)?.name+'？'} detail='交接后以继任者继续游玩；当前人物退居，协理及未完成交往撤销。军务重新核定，官僚公职和皇位不随家业交接。' confirmLabel='确认交接' danger pending={pending||!!w.people[0].journey} onCancel={()=>setConfirm(false)} onConfirm={()=>{if(pending||w.people[0].journey)return;void afterCommand(send({type:'handover'}),()=>setConfirm(false));}}/>}</article>}
 <section className="detail-record-group"><h4>传承记录</h4>{s.lineage.map(p=><p key={p.id}>第 {p.day} 日 · <button onClick={()=>onPerson(p.id)}>{getCharacter(w,p.id)?.name??p.id}</button>{p.id===id?' · 你':' · 退居'}</p>)}</section>
 </>}
 {draft&&<ActionDialog title={draftTitle} scene="landscape" onClose={()=>setDraft(null)} actions={<button className="primary" disabled={pending||!!draftReason} onClick={()=>{if(pending||draftReason)return;void afterCommand(send(draft),()=>{setDraft(null);});}}>确认{draft.type==='rest'?'休整':draft.type==='legacy'?'解锁':'指定'}</button>}>
 {draft.type==='rest'?<p>本人私财支出 20 钱，压力减少 30（最低为 0）；休整冷却 15 日。</p>:draft.type==='legacy'?<><p>{legacyDefinitions[draft.branch].effect}</p><p>当前 {s.legacies[draft.branch]} 级，解锁后 {s.legacies[draft.branch]+1} 级；支出家业名望 {30*(s.legacies[draft.branch]+1)}，不消耗累计家族威望。</p></>:<p>将家业继任人{ s.heir?'从'+(getCharacter(w,s.heir)?.name??'原继任人'):''}改为 {getCharacter(w,draft.target)?.name}。保留当前人物继续游玩，确认指定后仍须另行交接；官职与皇位不随家业继承。</p>}
 {draftReason&&<p className="service-warning" role="status">{draftReason}</p>}
 </ActionDialog>}
 </div>;
}

import { useState } from 'react';
import {getCharacter} from '../core/personRegistry';
import { familyStanding } from '../core/family';
import { buildingModifiers,heirs,legacyDefinitions,type Legacy,type SocialCommand } from '../core/social';
import type { RelationshipCommand } from '../core/relationships';
import type { World } from '../core/types';
import { Resource,ArtIcon } from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import './social.css';
export function SocialPanel({world:w,pending,send,onPerson,section='family'}:{world:World;pending:boolean;send:(c:SocialCommand|RelationshipCommand)=>void;onPerson:(id:string)=>void;section?:'self'|'family'}){
 const [confirm,setConfirm]=useState(false),s=w.social,id=w.characterId;
 if(!s||!id)return <p>暂无家业事务。</p>;
 const m=buildingModifiers(w),eligible=heirs(w),restRemaining=Math.max(0,(s.cooldowns[id+'|rest']??0)-w.day);
 return <div className="social-panel">
 {section==='self'?<><article><h3><ArtIcon name="stress" size={26}/>身心与修养</h3><Resource name="stress" value={s.stress} label="压力" unit="/100"/><progress aria-label="压力" max={100} value={s.stress}/><button disabled={pending||!!w.people[0].journey||w.people[0].coins<20||restRemaining>0} onClick={()=>send({type:'rest'})}>休整 · 20 钱 · 压力 −30</button><small>{restRemaining?'还需 '+restRemaining+' 日':w.people[0].journey?'抵达后可休整':'冷却 15 日'}</small></article><section className="detail-record-group"><h4>营建与家族加成</h4><p>工程造价 {m.costRate}% · 工期 {m.timeRate}%</p><p>协理：{s.advisor?<button onClick={()=>onPerson(s.advisor!)}>{getCharacter(w,s.advisor)?.name??s.advisor} →</button>:'暂无'}</p><p>家族外交 +{familyStanding(w).diplomacy} · 每月减压 +{familyStanding(w).calm}</p></section></>:<>
 <h3>家族世业</h3><Resource name="renown" value={s.renown} label="家业名望" caption/><small>每月 +10，工程竣工 +5。解锁世业不消耗累计家族威望。</small>
 <div className="social-cards">{(Object.keys(legacyDefinitions) as Legacy[]).map(branch=><article key={branch}><h3>{legacyDefinitions[branch].name} · {s.legacies[branch]} / 2</h3><p>{legacyDefinitions[branch].effect}</p><button disabled={pending||s.legacies[branch]>=2||s.renown<30*(s.legacies[branch]+1)} onClick={()=>send({type:'legacy',branch})}>{s.legacies[branch]>=2?'已满级':`解锁 · ${30*(s.legacies[branch]+1)} 名望`}</button></article>)}</div>
 <h3>家业继任</h3><div className="social-cards">{eligible.map(p=><article key={p.id}><button onClick={()=>onPerson(p.id)}>{p.name} →</button><p>{p.title}</p><button disabled={pending||s.heir===p.id} onClick={()=>{setConfirm(false);send({type:'heir',target:p.id});}}>{s.heir===p.id?'已指定继任':'指定继任'}</button></article>)}</div>{!eligible.length&&<p>暂无合格继任者。</p>}
 {s.heir&&<article><h3>交接予 {getCharacter(w,s.heir)?.name}</h3><p>交接后以继任者继续游玩。保留私产、庄园、工程与世业；当前人物退居，压力重置为 20，协理及未完成交往撤销。</p><section className="detail-record-group"><h4>官职与军务</h4><p>军务重新核定，公职和皇位不随家业交接。幼年继任者可承接家业，任官与政务须成年。</p></section><button disabled={pending||!!w.people[0].journey} onClick={()=>setConfirm(true)}>交接家业…</button>{confirm&&<ConfirmAction title={'交接家业予 '+getCharacter(w,s.heir)?.name+'？'} detail='交接后以继任者继续游玩；当前人物退居，协理及未完成交往撤销。军务重新核定，官僚公职和皇位不随家业交接。' confirmLabel='确认交接' danger pending={pending||!!w.people[0].journey} onCancel={()=>setConfirm(false)} onConfirm={()=>{if(pending||w.people[0].journey)return;setConfirm(false);send({type:'handover'});}}/>}</article>}
 <section className="detail-record-group"><h4>传承记录</h4>{s.lineage.map(p=><p key={p.id}>第 {p.day} 日 · <button onClick={()=>onPerson(p.id)}>{getCharacter(w,p.id)?.name??p.id}</button>{p.id===id?' · 你':' · 退居'}</p>)}</section>
 </>}
 </div>;
}

import type {PersonLifeEntry} from '../core/ongoing';
import {HouseholdLifePanel} from './HouseholdLifePanel';
import {useEffect,useState} from 'react';
import {ActionDialog} from './ActionDialog';
import {CommandButton} from './CommandButton';
import {getPerson} from '../core/personRegistry';
import type {LifeCommand} from '../core/lifeState';
import {getScript} from '../data/scripts';
import {HoverHint} from './HoverHint';
import {ArtIcon} from './ArtIcon';
import {isDeceased,ageLabel,ageOf,healthLabel,lifeOf,lifeStage,illnessNames} from '../core/lifeState';
import {autoCareReason,careReason} from '../core/life';
import {birthRecords} from '../data/lifespans';
import {dateLabel} from '../core/world';
import type {World,GameCommand} from '../core/types';
/** Temporary acquired condition; never written into congenital/personality traits. */
export function TemporaryIllnessTrait({world,id}:{world:World;id:string}){
 const life=lifeOf(world,id),illness=life?.illness;if(!illness||isDeceased(world,id))return null;
 const title=illnessNames[illness.kind],severity=['轻症','病势加重','重症'][illness.severity-1];
 const paths={cold:'M7 10h13q6 0 6-4t-6-2 M5 16h22q7 0 7 5t-7 4 M9 23h9',fever:'M20 3q3 9-3 12q8-1 8-7q12 17 1 25q-14 5-18-7q-2-7 7-14q-2 8 2 8q6-4 3-17Z',flux:'M14 4v8q-8 2-8 10q0 12 12 12q13 0 13-12q0-7-10-7V4 M12 23q5-6 13 0 M13 28h10',wasting:'M19 34V11 M19 22Q3 23 5 10Q17 9 19 22 M19 15Q31 15 31 4Q20 3 19 15'};
 return <HoverHint label={title+' · 临时特质'} content={<><strong>{title} · {severity}</strong><p>患病 {world.day-illness.since} 日 · 康复后移除</p><p>军事 −{illness.severity*2}，外交／管理／谋略各 −{illness.severity}{illness.severity===3?'；暂不能远行。':'。'}每月评估恢复，延医可提高康复机会。</p>{life.careUntil>world.day&&<p>医者照料余 {life.careUntil-world.day} 日</p>}</>}><span className="trait-badge trait-icon-only" role="img" aria-label={title+'（临时）'}><svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true"><path d={paths[illness.kind]} fill="none" stroke="#d6b98b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span></HoverHint>;
}
export function LifeSummary({world,id}:{world:World;id:string}){
 const life=lifeOf(world,id),age=ageOf(world,id);
 if(isDeceased(world,id))return <p className="person-vitals deceased"><span>已故</span>{life?.death&&<strong>{ageLabel(world,id)}</strong>}</p>;
 return <p className="person-vitals"><strong title="按出生年份计龄；生年不详者显示约龄">{ageLabel(world,id)}</strong>{age!==null&&<span>{lifeStage(age)}</span>}{life&&<span>{healthLabel(world,id)}</span>}</p>;
}
export function LifeDetails({world:w,id,entry,pending,send}:{world:World;id:string;entry?:PersonLifeEntry|null;pending:boolean;send:(c:GameCommand)=>void}){
 const [careAction,setCareAction]=useState<LifeCommand['action']|null>(null);
 useEffect(()=>setCareAction(null),[id]);
 const life=lifeOf(w,id),generated=w.generatedPeople?.[id],birth=birthRecords[id]??(generated?{year:new Date(Date.UTC(getScript(w.scriptId).year,0,1+generated.birthDay)).getUTCFullYear(),basis:'fictional'}:undefined);if(!life||!birth)return null;
 const reason=careReason(w,id),illness=life.illness;
 const healthReason=(action:LifeCommand['action'])=>action==='care'?careReason(w,id):autoCareReason(w,id)||(action==='auto-care'&&w.life?.autoCare?.payer===id?'已有自动延医额度':action==='stop-auto-care'&&w.life?.autoCare?.payer!==id?'自动延医已停止':'');
 const careTitle=careAction==='care'?'延医照料':careAction==='auto-care'?'设置自动延医':'停止自动延医';
 const careBlocker=careAction?healthReason(careAction):'';
 const recipient=getPerson(w,id)?.name??(id===(w.characterId??'fictional')?w.people[0].name:id);

 return <section className="person-health"><h3><ArtIcon name="steadfast" size={26}/>{life.death?'生卒':'身体与养护'}</h3><p>{birth.basis==='estimate'?'约生于 ':birth.basis==='fictional'?'生于 ':'生于 '}{birth.year} 年{life.death?' · '+dateLabel(life.death.day,w.scriptId)+' '+(({illness:'病逝',age:'寿终',battle:'战死',execution:'被处决'}[life.death.cause])):''}</p>{birth.basis==='estimate'&&<small>生年不详 · 约龄</small>}
 {!life.death&&<><div className="health-gauge"><meter min={0} max={100} low={40} high={65} optimum={100} value={life.health} aria-label="健康"/><span>{healthLabel(w,id)}</span></div>
 {(life.injuryUntil??0)>w.day&&<p>军中负伤 · 余 {life.injuryUntil!-w.day} 日。军事 −2，其他能力 −1；延医或交接事务后休养可加快恢复。</p>}
 {illness?<p>{illnessNames[illness.kind]} · {['轻症','病势加重','重症'][illness.severity-1]}。{illness.severity===3?'暂不能远行。':''}患病使军事能力降低 {illness.severity*2}。</p>:<p>静养可恢复身体；年岁增长会逐渐削弱体力。</p>}
 {life.careUntil>w.day?<p className="health-care">延医照料中 · 余 {life.careUntil-w.day} 日</p>:<CommandButton label="延医照料" icon="steadfast" selected={careAction==='care'} pending={pending} reason={reason} hint="你的私财支出 30 钱，为目标照料九十日，增加康复机会，降低恶化风险；预览后确认。" onClick={()=>setCareAction('care')}/>}
 {id===(w.characterId??'fictional')&&<div>{w.life?.autoCare?.payer===id?<><p>自动延医 · 剩余额度 {w.life.autoCare.remaining} 钱（未预扣）</p><CommandButton label="停止自动延医" icon="steadfast" selected={careAction==='stop-auto-care'} pending={pending} reason={healthReason('stop-auto-care')} hint="停止月初自动延医；未用额度未扣款，已支付的照料继续生效。" onClick={()=>setCareAction('stop-auto-care')}/></>:<CommandButton label="设置自动延医" icon="steadfast" selected={careAction==='auto-care'} pending={pending} reason={healthReason('auto-care')} hint="授权按需照料本人，每次从私财支付 30 钱，本次最多 90 钱；不预扣额度。" onClick={()=>setCareAction('auto-care')}/>}</div>}
 {careAction&&<ActionDialog title={careTitle+' · '+recipient} scene="landscape" onClose={()=>setCareAction(null)} actions={<button className="primary" disabled={pending||!!careBlocker} onClick={()=>{if(pending||healthReason(careAction))return;send({type:'health',action:careAction,target:id});setCareAction(null);}}>{careAction==='care'?'确认延医 · 私财 30 钱':careAction==='auto-care'?'授权最多 90 钱':'确认停止'}</button>}>
 <p>照料对象：{recipient}；付款人：{w.people[0].name}（私人现钱）。</p>
 {careAction==='care'?<p>确认后支出私财 30 钱，照料九十日，提高康复机会并降低恶化风险；不保证康复。</p>:careAction==='auto-care'?<p>仅照料本人。月初按需从本人私财支付，每次 30 钱，照料九十日；本次最多支出 90 钱，不预扣。余额不足、在途或无需照料时暂停，额度用尽自动停止；死亡或继任不延续授权。</p>:<p>停止后不再自动支付延医费用；未用额度未扣款，已经支付的照料保留到原到期日。</p>}
 {careBlocker&&<p className="service-warning" role="status">{careBlocker}</p>}
 </ActionDialog>}
 </>}
 {!life.death&&<HouseholdLifePanel world={w} id={id} entry={entry} pending={pending} send={send}/>}
 </section>;
}

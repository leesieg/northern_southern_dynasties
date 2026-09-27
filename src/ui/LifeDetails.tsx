import {HoverHint} from './HoverHint';
import {ArtIcon} from './ArtIcon';
import {isDeceased,ageLabel,ageOf,healthLabel,lifeOf,lifeStage,illnessNames} from '../core/lifeState';
import {careReason} from '../core/life';
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
export function LifeDetails({world:w,id,pending,send}:{world:World;id:string;pending:boolean;send:(c:GameCommand)=>void}){
 const life=lifeOf(w,id),birth=birthRecords[id];if(!life||!birth)return null;
 const reason=careReason(w,id),illness=life.illness;
 return <section className="person-health"><h3><ArtIcon name="steadfast" size={26}/>{life.death?'生卒':'身体与养护'}</h3><p>{birth.basis==='estimate'?'约生于 ':birth.basis==='fictional'?'生于 ':'生于 '}{birth.year} 年{life.death?' · '+dateLabel(life.death.day,w.scriptId)+' '+(life.death.cause==='illness'?'病逝':'寿终'):''}</p>{birth.basis==='estimate'&&<small>生年不详 · 约龄</small>}
 {!life.death&&<><div className="health-gauge"><meter min={0} max={100} low={40} high={65} optimum={100} value={life.health} aria-label="健康"/><span>{healthLabel(w,id)}</span></div>
 {illness?<p>{illnessNames[illness.kind]} · {['轻症','病势加重','重症'][illness.severity-1]}。{illness.severity===3?'暂不能远行。':''}患病使军事能力降低 {illness.severity*2}。</p>:<p>静养可恢复身体；年岁增长会逐渐削弱体力。</p>}
 {life.careUntil>w.day?<p className="health-care">延医照料中 · 余 {life.careUntil-w.day} 日</p>:<HoverHint label="延医照料" content={reason||'延医照料九十日，增加康复机会，降低恶化风险'}><button disabled={pending||!!reason} onClick={()=>send({type:'health',action:'care',target:id})}>延医照料 · 30 钱</button></HoverHint>}
 </>}
 </section>;
}

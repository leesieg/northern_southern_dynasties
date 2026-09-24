import {HoverHint} from './HoverHint';
import {ArtIcon} from './ArtIcon';
import {isDeceased,ageLabel,ageOf,healthLabel,lifeOf,lifeStage,illnessNames} from '../core/lifeState';
import {careReason} from '../core/life';
import {birthRecords} from '../data/lifespans';
import {dateLabel} from '../core/world';
import type {World,GameCommand} from '../core/types';
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

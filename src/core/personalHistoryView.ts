import type {World} from './types';
import {recommendationBonus} from './retinue';
/** Bounded view over authoritative records, not a second event log or source of rewards. */
export function personalHistoryView(w:World,id:string){
 const recommendation=w.retinue?.recommendations[id],bonus=recommendationBonus(w,id);
 const debts=(w.obligations?.items??[]).filter(d=>d.from==='person:'+id||d.to==='person:'+id).slice(-4).map(d=>({
  key:'debt:'+d.id,day:d.created,dateLabel:'立据',title:d.reason,
  detail:`${d.from==='person:'+id?'本人应付':'本人应收'} ${d.remaining} 钱；原额 ${d.original}，已付 ${d.paid}，抵销 ${d.offset}。${d.remaining?'按债务规则月结，不因离任而消失。':'已结清，不再扣款。'}`,
  person:(d.from==='person:'+id?d.to:d.from).startsWith('person:')?(d.from==='person:'+id?d.to:d.from).slice(7):undefined,
 }));
 const meetings=(w.mobility?.activities??[]).filter(a=>a.actor===id&&['done','cancelled'].includes(a.phase)).slice(-3).map(a=>({key:'activity:'+a.id,day:a.created,dateLabel:'筹办',title:a.phase==='done'?'到场办事':'行程中止',detail:a.result,person:a.target??a.delegate??undefined}));
 const relations=(w.relationships?.history??[]).filter(e=>e.actor===id||e.target===id).slice(-3).map((e,i)=>({key:'relation:'+i,day:e.day,dateLabel:'发生',title:'私人往来',detail:e.text,person:e.actor===id?e.target??undefined:e.actor}));
 return {recommendation:bonus&&recommendation?{bonus,until:recommendation.until}:null,records:[...debts,...meetings,...relations].sort((a,b)=>b.day-a.day||a.key.localeCompare(b.key)).slice(0,6)};
}

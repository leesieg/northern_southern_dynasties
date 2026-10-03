import {useEffect,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {demandNames,unrestReason,unrestBlock} from '../core/unrest';
import {realmReason} from '../core/realm';
import {civilianFood} from '../core/population';
import {politicalName} from '../core/government';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';
import {CharacterPortrait} from './CharacterPortrait';
import './unrest.css';
export function UnrestPanel({world:w,site,pending,send,onPerson,onTransport}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void;onTransport?:()=>void}){
 const [open,setOpen]=useState(false),[choice,setChoice]=useState('report');
 const q=w.unrest?.items.find(q=>q.site===site&&['warning','armed'].includes(q.stage));
 useEffect(()=>{setOpen(false);setChoice('report');},[site,q?.id]);
 if(!q)return null;
 const city=w.realm!.cities[site],arrivals=w.realm!.population?.transfers.filter(t=>t.to===site&&t.kind==='grain'&&t.status==='traveling')??[];
 const options=[
  {id:'report',title:'上报诉求',description:'呈交实际执政者；无钱粮支出，不视为已解决。',command:{type:'unrest',action:'report',id:q.id} as const},
  ...(q.demand==='customs'?[{id:'accommodate',title:'保留当地待遇',description:'恢复当地军镇组织例外；保留军权交接优待，详办整合增收不在当地兑现。民变和解，君位不变。',command:{type:'unrest',action:'accommodate',id:q.id} as const}]:[
   {id:'tax',title:'减为轻税',description:'无即时钱粮支出；下期税额 70%，秩序 +4 / 期。减税诉求依实际税制解决。',command:{type:'realm',action:'tax',site,tax:'light'} as const},
   {id:'relief',title:'当地赈济',description:'立即消耗本城公粮 50，秩序 +15；都城可用中央仓。缓和秩序，不增加粮仓。',command:{type:'realm',action:'relief',site} as const},
  ]),
 ];
 const selected=options.find(o=>o.id===choice)??options[0],reason=selected.command.type==='unrest'?unrestReason(w,selected.command):realmReason(w,selected.command);
 return <section className="local-unrest"><ArtIcon name={q.demand==='food'?'grain':q.demand==='tax'?'coins':'army'} size={28}/><div><strong>{q.stage==='armed'?'民变起事':'地方诉求'} · {demandNames[q.demand]}</strong><small>{q.deadline===null?'已进入战事':q.deadline>w.day?'尚余 '+(q.deadline-w.day)+' 日':'处理期限已到'}{q.reported!==undefined?' · 已上报':''}</small></div><HoverHint label="审阅地方诉求" content="查看原因、组织者与实际钱粮，选择处理后确认。"><button className="court-icon-button" aria-label="审阅地方诉求" onClick={()=>{setChoice('report');setOpen(true);}}><ArtIcon name="diligent" size={24}/></button></HoverHint>
 {open&&<ActionDialog title={'地方诉求 · '+demandNames[q.demand]} onClose={()=>setOpen(false)} actions={<><button className="primary" disabled={pending||!!reason} onClick={()=>{const command=selected.command;if(pending||(command.type==='unrest'?unrestReason(w,command):realmReason(w,command)))return;send(command);setOpen(false);}}>确认 · {selected.title}</button></>}>
  <div className="unrest-facts">{q.organizer&&<button className="unrest-organizer" disabled={!onPerson} onClick={()=>{setOpen(false);onPerson?.(q.organizer!);}}><CharacterPortrait characterId={q.organizer} world={w} compact/><span>组织者<br/>{politicalName(q.organizer)}</span></button>}<p>{q.demand==='customs'?'撤销军镇旧俗后，实际带兵将领失去原组织待遇。':q.demand==='tax'?'持续低秩序与重税并存。':'持续低秩序与当地粮仓不足并存。'}已积累 {q.distressedDays} 日；不同文化本身不增加压力。</p></div>
  <div className="unrest-resources"><span>本城公粮 <b>{city.grain}</b> / 民食需求 <b>{civilianFood(w,site)}</b> 每期</span><span>本城秩序 <b>{city.order}</b> / 100</span>{arrivals.length>0&&<span>粮援在途 {arrivals.reduce((n,t)=>n+t.sent,0)}，以抵达实收为准</span>}</div>
  {q.stage==='warning'&&q.deadline!<=w.day&&<p role="status">{unrestBlock(w,q)||'组织条件具备，未处理将进入武装起事。'}</p>}
  {q.stage==='armed'&&<p>战斗、围城与议和由现有军务处理；诉求型民变不默认更换君位或国号。</p>}
  <SingleChoiceCards label="处理办法" value={selected.id} onChange={setChoice} disabled={pending} options={options.map(o=>({id:o.id,title:o.title,description:o.description,reason:(o.command.type==='unrest'?unrestReason(w,o.command):realmReason(w,o.command))||undefined}))}/>
  {q.demand==='food'&&onTransport&&<button onClick={()=>{setOpen(false);onTransport();}}>安排实际运粮 ›</button>}{reason&&<p role="status" className="service-warning">{reason}</p>}
 </ActionDialog>}
 </section>;
}

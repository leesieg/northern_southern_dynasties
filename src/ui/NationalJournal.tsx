import {courtOf} from '../core/court';
import {governmentOf,politicalName,currentRealm} from '../core/government';
import {siteById} from '../data/scenario';
import {policyDefinition} from '../data/governancePolicies';
import {assignmentTemplates} from '../data/assignments';
import {dynastyNames} from '../data/governments';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import type {World} from '../core/types';
import type {RealmId} from '../core/realm';

export function NationalJournal({world:w,realm,onPerson,onService}:{world:World;realm:RealmId;onPerson:(id:string)=>void;onService:(id?:number)=>void}){
 const execution=(w.service?.tasks.filter(t=>t.realm===realm).flatMap(t=>t.history.filter(h=>/预算获准|获准延期|请求延期|不准延期|差事启办/.test(h.text)).map((h,i)=>({...h,key:'execution:'+t.id+':'+i,person:undefined as string|undefined,task:t.id}))))??[];
 const succession=(w.life?.successions??[]).filter(e=>e.realm===realm).map((e,i)=>({day:e.day,text:politicalName(e.deceased)+'薨逝，'+politicalName(e.ruler)+'继位'+(e.executives.length?'；执政者 '+e.executives.map(politicalName).join('、'):'')+'。',key:'succession:'+i,person:e.ruler,task:undefined as number|undefined}));
 const regimes=w.realm!.governments?.regimes.filter(v=>v.realm===realm)??[];
 const dynasties=regimes.length>1?regimes.map(v=>({day:v.from,text:(v.name??dynastyNames[v.dynasty]??v.dynasty)+' · 第 '+v.from+' 日至'+(v.until===null?'今':'第 '+v.until+' 日')+'，君主 '+politicalName(v.ruler)+'。',key:'regime:'+v.id,person:v.ruler,task:undefined as number|undefined})):[];
 const records=[...execution,...succession,...dynasties,
  ...(courtOf(w,realm)?.history??[]).map((e,i)=>({...e,key:'court:'+i,person:undefined as string|undefined,task:undefined as number|undefined})),
  ...(w.realm!.governments?.history.filter(e=>e.realm===realm)??[]).map((e,i)=>({...e,key:'government:'+i,person:undefined as string|undefined,task:undefined as number|undefined})),
  ...(w.service?.tasks.filter(t=>t.realm===realm&&!!t.result).map(t=>({day:t.result!.day,text:siteById[t.site].name+' · '+assignmentTemplates[t.kind].name+'：'+t.result!.reason+'；'+t.result!.effects.join('；'),key:'task:'+t.id,person:t.officer,task:t.id}))??[])
 ].sort((a,b)=>b.day-a.day||a.key.localeCompare(b.key)).slice(0,80);
 const impacts=courtOf(w,realm)?.impacts??[],signed=(n:number)=>(n>=0?'+':'')+n;
 return <div className="national-journal court-journal-desk">
  <section className="court-desk-column"><header className="court-desk-heading"><h3>朝廷纪事</h3><small>最近 {records.length} 则</small></header><div className="court-scroll-list court-journal-events">
   {!records.length&&<p className="court-empty">尚无已录纪事</p>}
   {records.map(e=><article key={e.key}><header><small>第 {e.day} 日</small><span>
    {e.person&&<HoverHint label="查看纪事人物" content={politicalName(e.person)}><button className="court-icon-button" aria-label={'查看'+politicalName(e.person)} onClick={()=>onPerson(e.person!)}><ArtIcon name="person" size={22}/></button></HoverHint>}
    {realm===currentRealm(w)&&e.task!==undefined&&<HoverHint label="查看案卷" content="打开这则纪事对应的真实差事。"><button className="court-icon-button" aria-label="查看纪事案卷" onClick={()=>onService(e.task)}><ArtIcon name="diligent" size={22}/></button></HoverHint>}
   </span></header><p>{e.text}</p></article>)}
  </div></section>
  <section className="court-desk-column"><header className="court-desk-heading"><h3>政治影响</h3><HoverHint label="影响来源" content="逐条查阅真实行动与生效阶段，以及经办人、授权人和当时规则版本。"><small tabIndex={0}>最近 {Math.min(12,impacts.length)} 则</small></HoverHint></header><div className="court-scroll-list court-journal-impacts">
   {impacts.slice(-12).reverse().map(i=><article key={i.source}><small>第 {i.day} 日 · {i.site?siteById[i.site].name:'全国'} · {i.stage==='completion'?'结案':i.stage==='execution'?'执行':'启办'}</small><p>支持 <b>{signed(i.support)}</b> · 紧张 <b>{signed(i.tension)}</b>{i.dimension&&i.rule?' · '+policyDefinition(i.dimension,i.rule)?.name:''}</p><small>规则版本 {i.policyRevision??'未录'}</small><div className="court-journal-actors">
    {i.actor&&<button onClick={()=>onPerson(i.actor!)}>经办 · {politicalName(i.actor)}</button>}
    {i.authorizer&&<button onClick={()=>onPerson(i.authorizer!)}>预算／授令 · {politicalName(i.authorizer)}</button>}
   </div></article>)}
   {!impacts.length&&<p className="court-empty">尚无已录影响来源</p>}
   {!governmentOf(w,realm)&&<p>该政权尚无已录朝廷</p>}
  </div></section>
 </div>;
}

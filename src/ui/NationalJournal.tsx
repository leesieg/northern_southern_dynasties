import {courtOf} from '../core/court';
import {governmentOf,politicalName,currentRealm} from '../core/government';
import {siteById} from '../data/scenario';
import {policyDefinition} from '../data/governancePolicies';
import {assignmentTemplates} from '../data/assignments';
import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
export function NationalJournal({world:w,realm,onPerson,onService}:{world:World;realm:RealmId;onPerson:(id:string)=>void;onService:(id?:number)=>void}){
 const execution=(w.service?.tasks.filter(t=>t.realm===realm).flatMap(t=>t.history.filter(h=>/预算获准|获准延期|请求延期|不准延期|差事启办/.test(h.text)).map((h,i)=>({...h,key:'execution:'+t.id+':'+i,person:undefined as string|undefined,task:t.id})))??[]);
 const records=[...execution,...(courtOf(w,realm)?.history??[]).map((e,i)=>({...e,key:'court:'+i,person:undefined as string|undefined,task:undefined as number|undefined})),...(w.realm!.governments?.history.filter(e=>e.realm===realm)??[]).map((e,i)=>({...e,key:'government:'+i,person:undefined as string|undefined,task:undefined as number|undefined})),...(w.service?.tasks.filter(t=>t.realm===realm&&!!t.result).map(t=>({day:t.result!.day,text:siteById[t.site].name+' · '+assignmentTemplates[t.kind].name+'：'+t.result!.reason+'；'+t.result!.effects.join('；'),key:'task:'+t.id,person:t.officer,task:t.id}))??[])].sort((a,b)=>b.day-a.day||a.key.localeCompare(b.key)).slice(0,80);
 const impacts=courtOf(w,realm)?.impacts??[];
 return <div className="national-journal">{!records.length&&<p>尚无已录纪事。</p>}{records.map(e=><article key={e.key}><small>{'第 '+e.day+' 日'}</small><p>{e.text}</p>{e.person&&<button onClick={()=>onPerson(e.person!)}>经办 {politicalName(e.person)} ›</button>}{realm===currentRealm(w)&&e.task!==undefined&&<button onClick={()=>onService(e.task)}>查看案卷 ›</button>}</article>)}{impacts.length>0&&<section><h3>影响来源</h3>{impacts.slice(-12).reverse().map(i=><article key={i.source}><small>{'第 '+i.day+' 日'} · {i.site?siteById[i.site].name:'全国'} · {i.stage==='completion'?'结案':i.stage==='execution'?'执行':'启办'}</small><p>支持 {i.support>=0?'+':''}{i.support} · 紧张 +{i.tension}{i.dimension&&i.rule?' · '+policyDefinition(i.dimension,i.rule)?.name:''} · 规则版本 {i.policyRevision??'未录'}</p>{i.actor&&<button onClick={()=>onPerson(i.actor!)}>经办 {politicalName(i.actor)} ›</button>}{i.authorizer&&<button onClick={()=>onPerson(i.authorizer!)}>预算／授令 {politicalName(i.authorizer)} ›</button>}</article>)}</section>}{!governmentOf(w,realm)&&<p>该政权尚无已录朝廷。</p>}</div>;
}

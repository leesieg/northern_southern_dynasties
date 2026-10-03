import {CommandButton} from './CommandButton';
import {DetailTabs} from './DetailTabs';
import type {RealmCommand} from '../core/realm';
import {RealmIdentitySummary,RealmOverview} from './RealmOverview';
import {ServicePanel} from './ServicePanel';
import {DutiesPanel} from './DutiesPanel';
import {siteById} from '../data/scenario';
import {eventDefinitions,playerRealm,realmReason} from '../core/realm';
import type {World,GameCommand} from '../core/types';
import './realmOverview.css';
import './realm.css';

export type RealmTab='overview'|'duties'|'council';
export function RealmPanel({world:w,pending,send,onCity,onTerritory,onPerson,onCourt,tab,onTab,serviceFocus}:{serviceFocus?:{id?:number;site?:string;seq:number;view?:'duties'};world:World;pending:boolean;send:(c:GameCommand)=>void;onCity:(id:string)=>void;onTerritory:(id:string)=>void;onPerson:(id:string)=>void;onCourt:(tab?:'central'|'person'|'local'|'situation')=>void;tab:RealmTab;onTab:(tab:RealmTab)=>void}){
 const s=w.realm;if(!s)return <p>政务用于新建的历史沙盒。旧教学局保留原规则。</p>;
 const r=playerRealm(w),grainFirst=r==='west'&&serviceFocus?.view==='duties';
 const action=(c:RealmCommand,label:string)=>{const reason=realmReason(w,c);return <div className="realm-action"><CommandButton label={label} icon="influence" pending={pending} reason={reason} hint={label} onClick={()=>{if(!pending&&!realmReason(w,c))send(c);}}/>{reason&&<small>{reason}</small>}</div>;};
 const grainDuty=r==='west'?<DutiesPanel world={w} pending={pending} send={send} onPerson={onPerson}/>:null;
 return <div className="realm-panel"><RealmIdentitySummary world={w} onPerson={onPerson} onCity={onCity} onCourt={onCourt}/>
  <DetailTabs label="政务分类" value={tab} onChange={onTab} items={[{id:'overview',label:'要务',icon:'influence'},{id:'duties',label:'差事',icon:'diligent'},{id:'council',label:'议事',icon:'person'}]}/>
  <div key={tab} className="detail-page-content">
  {s.event&&<section className="realm-event" role="status"><small>待决事务 · {siteById[s.event.site].name} · 时间已暂停</small><h3>{eventDefinitions[s.event.kind].title}</h3><p>{eventDefinitions[s.event.kind].body}</p><p>{eventDefinitions[s.event.kind].effect}</p><div className="realm-actions">{action({type:'realm',action:'event',choice:'fund'},'拨付处理 · '+eventDefinitions[s.event.kind].cost)}{action({type:'realm',action:'event',choice:'decline'},'暂缓处理')}</div></section>}
  {tab==='overview'&&<RealmOverview world={w} onCity={onCity} onTerritory={onTerritory} onTab={onTab}/>}
  {tab==='duties'&&<div className="realm-page">{grainFirst&&grainDuty}<ServicePanel key={serviceFocus?.seq} initialTaskId={serviceFocus?.id} initialSite={serviceFocus?.site} mode="duties" onSituation={()=>onCourt('situation')} onTerritory={onTerritory} world={w} pending={pending} send={send} onPerson={onPerson}/>{!grainFirst&&grainDuty}</div>}
  {tab==='council'&&<div className="realm-page"><ServicePanel mode="council" world={w} pending={pending} send={send} onPerson={onPerson}/></div>}
 </div></div>;
}

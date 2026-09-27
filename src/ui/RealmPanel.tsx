import {DetailTabs} from './DetailTabs';
import {TreasuryPanel} from './TreasuryPanel';
import {clanStanding} from '../core/clans';
import {recommendationBonus} from '../core/retinue';
import {HoverHint} from './HoverHint';
import {ClanRanking} from './ClanRanking';
import type {RealmCommand} from '../core/realm';
import {RealmIdentitySummary,RealmOverview} from './RealmOverview';
import {GovernmentAuditPanel} from './GovernmentAudit';
import {ServicePanel} from './ServicePanel';
import {DutiesPanel} from './DutiesPanel';
import {OfficeHierarchy} from './OfficeHierarchy';
import {PublicSuccessionPanel} from './PublicSuccessionPanel';
import {GovernmentPanel} from './GovernmentPanel';
import {siteById} from '../data/scenario';
import {eventDefinitions,playerRealm,realmReason} from '../core/realm';
import type {World,GameCommand} from '../core/types';
import './realmOverview.css';
import './realm.css';

export type RealmTab='overview'|'duties'|'offices'|'finance'|'government'|'clans';
export function RealmPanel({world:w,pending,send,onCity,onTerritory,onPerson,tab,onTab,serviceFocus,financeFocus='treasury'}:{serviceFocus?:{id?:number;seq:number;view?:'council'|'duties'};financeFocus?:'treasury'|'audit';world:World;pending:boolean;send:(c:GameCommand)=>void;onCity:(id:string)=>void;onTerritory:(id:string)=>void;onPerson:(id:string)=>void;tab:RealmTab;onTab:(tab:RealmTab)=>void}){
 const s=w.realm;if(!s)return <p>政务用于新建的历史沙盒。旧教学局保留原规则。</p>;
 const r=playerRealm(w),grainFirst=r==='west'&&serviceFocus?.view==='duties';
 const action=(c:RealmCommand,label:string)=>{const reason=realmReason(w,c);return <div className="realm-action"><button disabled={pending||!!reason} onClick={()=>send(c)}>{label}</button>{reason&&<small>{reason}</small>}</div>;};
 const grainDuty=r==='west'?<DutiesPanel world={w} pending={pending} send={send} onPerson={onPerson}/>:null;
 const treasury=<TreasuryPanel world={w} pending={pending} send={send} onPerson={onPerson} flat/>,audit=<GovernmentAuditPanel world={w} pending={pending} send={send} onPerson={onPerson}/>;
 const clan=clanStanding(w,w.characterId!),recommendation=recommendationBonus(w,w.characterId!);
 return <div className="realm-panel"><RealmIdentitySummary world={w} onPerson={onPerson} onCity={onCity} onHierarchy={()=>onTab('offices')}/>
  {s.event&&<section className="realm-event" role="status"><small>待决事务 · {siteById[s.event.site].name} · 时间已暂停</small><h3>{eventDefinitions[s.event.kind].title}</h3><p>{eventDefinitions[s.event.kind].body}</p><p>{eventDefinitions[s.event.kind].effect}</p><div className="realm-actions">{action({type:'realm',action:'event',choice:'fund'},'拨付处理 · '+eventDefinitions[s.event.kind].cost)}{action({type:'realm',action:'event',choice:'decline'},'暂缓处理')}</div></section>}
  <DetailTabs label="政务分类" value={tab} onChange={onTab} items={[{id:'overview',label:'要务',icon:'influence'},{id:'duties',label:'差事',icon:'diligent'},{id:'offices',label:'职官',icon:'person'},{id:'finance',label:'财赋',icon:'coins'},{id:'government',label:'制度',icon:'estate'},{id:'clans',label:'世族',icon:'renown'}]}/>
  {tab==='overview'&&<RealmOverview world={w} onCity={onCity} onTerritory={onTerritory} onTab={onTab}/>}
  {tab==='duties'&&<div className="realm-page">{grainFirst&&grainDuty}<ServicePanel key={serviceFocus?.seq} initialTaskId={serviceFocus?.id} initialTab={serviceFocus?.view==='council'?'council':'active'} world={w} pending={pending} send={send} onPerson={onPerson}/>{!grainFirst&&grainDuty}</div>}
  {tab==='offices'&&<div className="realm-page"><section className="realm-page-intro"><h3>任免与统属</h3>{(clan?.petition??0)>0||recommendation>0?<HoverHint label="求官影响因素" content={`世族门第：求官接受度 +${clan?.petition??0}，城邑请任功绩要求 −${clan?.merit??0}；典签荐书：求官接受度 +${recommendation}。年龄、治理权与军务门槛仍须满足。`}><span className="clan-standing-badge" tabIndex={0}>求官荫望 ⓘ</span></HoverHint>:null}{action({type:'realm',action:'mandate'},s.mandate?'已有军务授权':'请求军务授权 · 40 影响力')}</section><OfficeHierarchy send={send} pending={pending} world={w} onPerson={onPerson}/><PublicSuccessionPanel world={w} pending={pending} send={send} onPerson={onPerson}/></div>}
  {tab==='finance'&&<div className="realm-page">{financeFocus==='audit'?<>{audit}{treasury}</>:<>{treasury}{audit}</>}</div>}
  {tab==='government'&&<GovernmentPanel world={w} pending={pending} send={send}/>}
  {tab==='clans'&&<ClanRanking world={w} realm={r} onPerson={onPerson}/>}
 </div>;
}

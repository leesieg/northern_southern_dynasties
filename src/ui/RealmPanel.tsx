import {DetailTabs} from './DetailTabs';
import {RealmBadge} from './RealmBadge';
import {TreasuryPanel} from './TreasuryPanel';
import {CityOfficeSeat} from './CityOfficeSeat';
import {clanStanding} from '../core/clans';
import {recommendationBonus} from '../core/retinue';
import {HoverHint} from './HoverHint';
import {ClanRanking} from './ClanRanking';
import type {RealmCommand} from '../core/realm';
import {RealmOverview,realmPageNames} from './RealmOverview';
import './realmOverview.css';
import {ServicePanel} from './ServicePanel';
import {DutiesPanel} from './DutiesPanel';
import { CourtPanel,type CourtTab } from './CourtPanel';
import { OfficeHierarchy } from './OfficeHierarchy';
import { GovernmentPanel } from './GovernmentPanel';
import { politicalName,governingAuthority } from '../core/government';
import { Resource } from './ArtIcon';
import { useState,useEffect } from 'react';
import { siteById } from '../data/scenario';
import { eventDefinitions,executive,playerRealm,realmReason } from '../core/realm';
import type { World,GameCommand } from '../core/types';
import './realm.css';
export type RealmTab='overview'|'duties'|'politics'|'government'|'hierarchy'|'court'|'clans'|'treasury';
export function RealmPanel({world:w,pending,send,onCity,onPerson,tab,onTab,courtTab,onCourtTab,serviceFocus}:{serviceFocus?:{id?:number;seq:number;view?:'council'|'duties'};world:World;pending:boolean;send:(c:GameCommand)=>void;onCity:(id:string)=>void;onPerson:(id:string)=>void;tab:RealmTab;onTab:(tab:RealmTab)=>void;courtTab:CourtTab;onCourtTab:(tab:CourtTab)=>void}){
 const [selected,setSelected]=useState(w.people[0].location),[confirm,setConfirm]=useState<string|null>(null);
 const [dutyChapter,setDutyChapter]=useState<'service'|'grain'>(serviceFocus?.view==='duties'?'grain':'service');
 useEffect(()=>{setDutyChapter(serviceFocus?.view==='duties'?'grain':'service');},[serviceFocus?.seq,serviceFocus?.view]);
 const s=w.realm;if(!s)return <p>政务用于新建的历史沙盒。旧教学局保留原规则。</p>;
 const r=playerRealm(w),t=s.treasuries[r],city=s.cities[selected],friendly=Object.entries(s.cities).filter(([,c])=>c.owner===r);
 const action=(c:RealmCommand,label:string,danger=false)=>{const reason=realmReason(w,c),key=JSON.stringify(c);return <div className="realm-action"><button disabled={pending||!!reason} className={danger?'danger':''} onClick={()=>{if(danger&&confirm!==key){setConfirm(key);return;}setConfirm(null);send(c);}}>{confirm===key?'确认：':''}{label}</button>{reason&&<small>{reason}</small>}{confirm===key&&<button onClick={()=>setConfirm(null)}>取消</button>}</div>;};
 return <div className="realm-panel"><header className="realm-identity"><RealmBadge realm={r} world={w}/><div className="realm-public-funds"><Resource name="coins" value={t.coins} label="公款" caption/><Resource name="grain" value={t.grain} label="公粮" caption/><Resource name="influence" value={s.influence} label="影响力" caption/></div></header>
 {s.event&&<section className="realm-event" role="status"><small>待决事务 · {siteById[s.event.site].name} · 时间已暂停</small><h3>{eventDefinitions[s.event.kind].title}</h3><p>{eventDefinitions[s.event.kind].body}</p><p>{eventDefinitions[s.event.kind].effect}</p><div className="realm-actions">{action({type:'realm',action:'event',choice:'fund'},'拨付处理 · '+eventDefinitions[s.event.kind].cost)}{action({type:'realm',action:'event',choice:'decline'},'暂缓处理')}</div><small>处理后关闭窗口，再继续时间。</small></section>}
 {tab!=='overview'&&<nav className="realm-breadcrumb" aria-label="政务位置"><button onClick={()=>onTab('overview')}>← 政务总览</button><span>{realmPageNames[tab]}</span></nav>}
 {tab==='overview'&&<RealmOverview world={w} onCity={onCity} onTab={next=>{if(next==='court')onCourtTab('ministries');onTab(next);}} onPerson={onPerson}/>}
 {tab==='politics'&&((clanStanding(w,w.characterId!)?.petition??0)>0||recommendationBonus(w,w.characterId!)>0)&&<HoverHint label="求官影响因素" content={`世族门第：求官接受度 +${clanStanding(w,w.characterId!)?.petition??0}，城邑请任功绩要求 −${clanStanding(w,w.characterId!)?.merit??0}；典签荐书：求官接受度 +${recommendationBonus(w,w.characterId!)}。年龄、治理权与军务门槛仍须满足。`}><span className="clan-standing-badge">求官荫望 ⓘ</span></HoverHint>}
 {tab==='treasury'&&<TreasuryPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}
 {tab==='clans'&&<ClanRanking world={w} realm={r} onPerson={onPerson}/>}
 {tab==='duties'&&<>{r==='west'&&<DetailTabs label="差事类别" value={dutyChapter} onChange={setDutyChapter} items={[{id:'service',label:'差事簿',icon:'influence'},{id:'grain',label:'天水粮务',icon:'grain'}]}/>} {r==='west'&&dutyChapter==='grain'?<DutiesPanel world={w} pending={pending} send={send} onPerson={onPerson}/>:<ServicePanel key={serviceFocus?.seq} initialTaskId={serviceFocus?.id} initialTab={serviceFocus?.view==='council'?'council':'active'} world={w} pending={pending} send={send} onPerson={onPerson}/>}</>}
 {tab==='court'&&<CourtPanel tab={courtTab} onTab={onCourtTab} world={w} pending={pending} send={send} onPerson={onPerson}/>}
 {tab==='hierarchy'&&<OfficeHierarchy send={send} pending={pending} world={w} onPerson={onPerson}/>}
 {tab==='government'&&<GovernmentPanel onPerson={onPerson} world={w} pending={pending} send={send}/>}
 {tab==='politics'&&<><section><h3>授权与任职</h3><p>{executive(w)?'你拥有本政权的任命权。':'本政权任命权掌握在'+politicalName(governingAuthority(w,r))+'手中。可通过执政者接受度 60，或功绩（请任按门第调整／军务 40）请求授权。'}</p><p>任命需要影响力，文书送达后权限生效，前任权限撤销；城市失守则文书失效。官僚制家业交接不继承公职；封建制领有按政体传承。</p></section><label>城市 <select value={friendly.some(([id])=>id===selected)?selected:''} onChange={e=>setSelected(e.target.value)}><option value="" disabled>选择本国城市</option>{friendly.map(([id,c])=><option key={id} value={id}>{siteById[id].name} · {c.governor?politicalName(c.governor):'官署代管'}</option>)}</select></label>{city?.owner===r&&<CityOfficeSeat key={selected} world={w} site={selected} pending={pending} send={send} onPerson={onPerson}/>}{action({type:'realm',action:'mandate'},s.mandate?'已有军务授权':'请求军务授权 · 40 影响力')}<h3>在途任命文书</h3>{s.offices.length?s.offices.map(o=><p key={o.site}><button onClick={()=>onPerson(o.candidate)}>{politicalName(o.candidate)} →</button> {siteById[o.site].name} · 余 {o.due-w.day} 日</p>):<p>暂无在途文书。</p>}</>}

 </div>;
}

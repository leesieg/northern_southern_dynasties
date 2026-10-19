import {useEffect,useMemo,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {War} from '../core/wars';
import {civilFixedSide,civilPoliticsReason,civilStanceNames} from '../core/civilMobilization';
import {civilCommitments,civilPromiseNames,civilPromiseOptions} from '../core/civilPromises';
import {allegianceRealm} from '../core/officeEligibility';
import {governingExecutives,regimeName} from '../core/government';
import {ministries,type MinistryId} from '../data/court';
import {siteById} from '../data/scenario';
import {houJingMembers} from './houJingPresentation';
import {CivilMemberDialog} from './CivilMobilizationPanel';
import {CharacterPortrait} from './CharacterPortrait';
import {CommandButton} from './CommandButton';
import {ArtIcon} from './ArtIcon';

type Filter='all'|'loyal'|'rebel'|'watch'|'pending';
type Props={world:World;war:War;pending:boolean;send:(command:GameCommand)=>Promise<boolean>;onPerson:(id:string)=>void;onLocate:(id:string)=>void;active?:boolean;error?:string};
export function HouJingResponses({world:w,war,pending,send,onPerson,onLocate,active=true,error}:Props){
 const [filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string|null>(null);
 const [dialog,setDialog]=useState<{person:string;intent?:'appeal'|'pledge'}|null>(null);
 useEffect(()=>{if(!active)setDialog(null);},[active]);
 const rows=useMemo(()=>houJingMembers(w,war),[w,war]),eligible=rows.filter(r=>!r.reason),shown=rows.filter(r=>(filter==='all'||!r.reason&&r.member.choice===filter)&&(!query||[r.person.name,r.person.title,siteById[r.site]?.name].join(' ').includes(query)));
 const actor=w.characterId!,own=rows.find(r=>r.id===actor),initial=own?.member.choice==='pending'&&!own.reason?own:eligible.find(r=>r.member.choice==='watch');
 const current=shown.find(r=>r.id===selected)??shown.find(r=>r.id===initial?.id)??shown[0];
 const realm=allegianceRealm(w,actor),side=realm===war.attacker?'rebel':'loyal';
 const chief=!!realm&&[war.attacker,war.defender].includes(realm)&&governingExecutives(w,realm).includes(actor);
 const offers=current&&chief?civilPromiseOptions(w,war,actor,current.id):[];
 const appeal=current?{type:'civilWar' as const,action:'appeal' as const,war:war.id!,person:current.id,side:side as 'loyal'|'rebel'}:null;
 const pledge=current&&offers[0]?{type:'civilWar' as const,action:'pledge' as const,war:war.id!,person:current.id,side:side as 'loyal'|'rebel',...offers[0]}:null;
 const obligations=current?civilCommitments(w).filter(q=>q.civil.war===war.id&&q.person===current.id&&(q.person===actor||q.chief===actor)):[];
 const choose=(id:string)=>{setSelected(id);const row=rows.find(r=>r.id===id);if(row&&!row.person.deceased)onLocate(row.site);};
 return <section className="hou-responses" aria-label="侯景之乱地方响应">
  <div className="hou-section-heading"><h3>地方响应</h3>{own&&!own.reason&&!civilFixedSide(w,war,actor)&&<button className="hou-own-stance" onClick={()=>setDialog({person:actor})}>{own.member.choice==='pending'?`本人待表态 · 余${Math.max(0,own.member.due-w.day)}日`:'本人立场'}</button>}</div>
  <div className="hou-response-filters" role="group" aria-label="按战时立场筛选">{(['all','loyal','rebel','watch','pending'] as const).map(value=><button key={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setSelected(null);}}>{value==='all'?'全部':value==='watch'?'观望':civilStanceNames[value]} <b>{value==='all'?rows.length:eligible.filter(r=>r.member.choice===value).length}</b></button>)}</div>
  <label className="hou-response-search"><ArtIcon name="person" size={20}/><input type="search" aria-label="查找响应人物" placeholder="查找人物、职位或驻地" value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}}/></label>
  <div className="hou-response-list" aria-label="响应人物名单">{shown.map(r=><button className="hou-response-row" key={r.id} aria-pressed={current?.id===r.id} onClick={()=>choose(r.id)}><CharacterPortrait world={w} characterId={r.id} compact/><span className="hou-response-name"><strong>{r.person.name}</strong><small>{r.person.title} · {siteById[r.site]?.name??'驻地未明'}</small></span><span className="hou-response-numbers"><span className="hou-stance" data-stance={r.reason?'unavailable':r.member.choice}>{r.reason?'暂不能表态':r.stance}</span><small>{r.troops===null?'兵力未详':r.troops.toLocaleString()+' 人'}</small></span></button>)}{!shown.length&&<p className="hou-empty">没有符合条件的人物。可调整立场筛选或清除搜索。</p>}</div>
  <small className="hou-roster-count">当前 {shown.length} / {rows.length} 人</small>
  {current&&<section className="hou-selected-person" aria-label="选中人物详情">
   <h3>选中人物</h3><header><button className="hou-selected-portrait" aria-label={'查看'+current.person.name} onClick={()=>onPerson(current.id)}><CharacterPortrait world={w} characterId={current.id} compact/></button><div><button className="hou-person-name" onClick={()=>onPerson(current.id)}>{current.person.name}</button><span className="hou-stance" data-stance={current.member.choice}>{current.stance}</span><p>{current.person.title}</p><p>当前效忠 {current.person.realm?regimeName(w,current.person.realm):'未录'} <button className="hou-site-link" onClick={()=>onLocate(current.site)}>驻地 {siteById[current.site]?.name??'未明'}</button></p><strong>当前统兵 {current.troops===null?'未详':current.troops.toLocaleString()+' 人'}</strong></div></header>
   {current.reason?<p className="hou-warning" role="status">{current.reason}</p>:<ul className="hou-person-facts">{current.member.choice==='watch'?<><li>保持现有治理、输税与防卫</li><li>暂不参加本场远征，既有军令仍须办理交接</li></>:current.member.choice==='pending'?<li>尚未表态；不将当前效忠视为已经参战</li>:<li>已明确{current.stance}，出兵和供粮仍须实际办理</li>}<li>立场变化不保证全部兵员与辖地跟随</li></ul>}
   {obligations.length>0&&<div className="hou-obligations"><h4>与本人有关的约定</h4>{obligations.map((q,i)=><p key={i}>{q.civil.target.kind==='county'?siteById[q.civil.target.id]?.name:q.civil.target.kind==='army'?'第 '+q.civil.target.id+' 军':ministries[q.civil.target.id as MinistryId]?.name??'中央职掌'} · {civilPromiseNames[q.civil.status]}{q.civil.due===null?'':` · 余${Math.max(0,q.civil.due-w.day)}日`}</p>)}</div>}
   <div className="hou-person-actions">
    {current.id===actor&&!civilFixedSide(w,war,actor)?<CommandButton label="调整本人立场" icon="army" reason={current.reason} pending={pending} hint="预览真实兵地交接、原公职与誓约后果，再确认立场。" onClick={()=>setDialog({person:actor})}/>:current.id!==actor&&!civilFixedSide(w,war,current.id)?<><CommandButton label={side==='rebel'?'劝其响应':'劝其勤王'} icon="gregarious" summary="本人影响力 10" pending={pending} reason={appeal?civilPoliticsReason(w,appeal):'人物已失效'} hint="三十日内增加对本方的倾向，对方仍自行决定。" onClick={()=>setDialog({person:current.id,intent:'appeal'})}/><CommandButton label="承诺待遇" icon="influence" summary="本人影响力 10" pending={pending} reason={!chief?'须由本阵营当前实际执政者承诺':pledge?civilPoliticsReason(w,pledge):'当前没有可兑现的合法职权或兵权'} hint="选择可保留的职权、兵权或合法空缺中央职掌，预览履约条件后确认。" onClick={()=>setDialog({person:current.id,intent:'pledge'})}/></>:<p className="hou-muted">此人为本阵营固定政治代表。</p>}
   </div>{current.id!==actor&&chief&&!civilFixedSide(w,war,current.id)&&<small className="hou-muted">对方仍将自行决定；具体待遇仅向约定当事人展示。</small>}
  </section>}
  {dialog&&war.civil?.mobilization?.members[dialog.person]&&<CivilMemberDialog key={dialog.person+':'+dialog.intent} world={w} war={war} person={dialog.person} intent={dialog.intent} pending={pending} send={send} error={error} onClose={()=>setDialog(null)}/>}
 </section>;
}

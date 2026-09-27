import {serviceNeed} from '../core/serviceNeeds';
import {localSites} from '../core/localAdministration';
import {realmAtWar} from '../core/wars';
import {plannedReinvestment} from '../core/treasury';
import {officeHierarchy,superiorOffice} from '../core/offices';
import {executive,playerRealm,realmForecast} from '../core/realm';
import {governmentOf,governingAuthority,politicalName} from '../core/government';
import {personInfluence} from '../core/personalInfluence';
import {serviceAttention} from '../core/assignments';
import {dutyAttention} from '../core/duties';
import {assignmentTemplates,assignmentPhases} from '../data/assignments';
import {siteById} from '../data/scenario';
import {territoryNodes} from '../data/territorialHierarchy';
import {ArtIcon,Resource} from './ArtIcon';
import {RealmBadge} from './RealmBadge';
import type {World} from '../core/types';
import type {RealmTab} from './RealmPanel';

export function RealmIdentitySummary({world:w,onPerson,onCity,onHierarchy}:{world:World;onPerson:(id:string)=>void;onCity:(id:string)=>void;onHierarchy:()=>void}){
 const r=playerRealm(w),id=w.characterId!,g=governmentOf(w)!,chief=governingAuthority(w,r),nodes=officeHierarchy(w),held=nodes.filter(n=>n.active&&n.holder===id&&n.realm===r),titles=held.filter(n=>n.kind!=='honour'),lands=held.filter(n=>!!n.territory);
 const superiors=[...new Set(held.map(n=>superiorOffice(nodes,n)?.holder).filter((person):person is string=>!!person&&person!==id))];
 const role=executive(w)?'执掌政务':g.ruler===id?'在位君主':titles.length?'在任官员':'宗室与朝臣';
 return <section className="realm-my-role" aria-label="我的政务身份与资源"><header className="realm-identity"><RealmBadge realm={r} world={w}/><button className="realm-person-link" onClick={()=>onPerson(id)}><span><small>{role}</small><strong>{politicalName(id)}</strong></span><span aria-hidden="true">›</span></button><div className="realm-my-resources"><Resource name="coins" value={w.people[0].coins} label="个人现钱" caption/><Resource name="influence" value={personInfluence(w,id)} label="个人影响力" caption/></div></header>
 <dl className="realm-role-facts"><div><dt><ArtIcon name="influence" size={24}/>官职</dt><dd><button title={titles.map(n=>n.name).join('、')||'未任官职'} onClick={()=>onPerson(id)}>{titles[0]?.name||'未任官职'}{titles.length>1&&<small>＋{titles.length-1}</small>}</button></dd></div><div><dt><ArtIcon name="person" size={24}/>上级</dt><dd>{superiors.length?<button title={superiors.map(politicalName).join('、')} onClick={()=>onPerson(superiors[0])}>{politicalName(superiors[0])}{superiors.length>1&&<small>＋{superiors.length-1}</small>}</button>:g.ruler===id?'无 · 君主':chief&&chief!==id?<button onClick={()=>onPerson(chief)}>{politicalName(chief)}</button>:'无直属上级'}</dd></div><div><dt><ArtIcon name="city" size={24}/>领地</dt><dd>{lands.length?<button title={lands.map(n=>n.site?siteById[n.site]?.name??n.name:n.name).join('、')} onClick={()=>lands[0].site?onCity(lands[0].site):onHierarchy()}>{lands[0].site?siteById[lands[0].site]?.name??lands[0].name:lands[0].name}{lands.length>1&&<small>＋{lands.length-1}</small>}</button>:'无直辖城邑'}</dd></div></dl></section>;
}

export function RealmOverview({world:w,onTab,onCity,onTerritory}:{world:World;onTab:(t:RealmTab)=>void;onCity:(id:string)=>void;onTerritory:(id:string)=>void}){
 const r=playerRealm(w),chief=executive(w),forecast=realmForecast(w,r),tasks=w.service?.tasks.filter(t=>t.realm===r&&t.phase!=='closed'&&(chief||t.officer===w.characterId||t.helper===w.characterId||t.invitation?.person===w.characterId))??[],attention=serviceAttention(w).length+(dutyAttention(w)?1:0),cities=Object.values(w.realm!.cities).filter(c=>c.governor===w.characterId&&c.controller===r).length;
 const held=officeHierarchy(w).filter(n=>n.active&&n.holder===w.characterId&&n.realm===r),local=held.filter(n=>!!n.territory),campaigns=w.militaryCampaigns?.items.filter(q=>q.status==='active'&&q.commander===w.characterId)??[],home=w.people[0].location,governed=[...new Set([...local.map(n=>n.site).filter((v):v is string=>!!v),...local.flatMap(n=>localSites(w,n.territory!,r))])],priority=governed.map(site=>({site,...serviceNeed(w,'relief',site)})).sort((a,b)=>b.score-a.score)[0];
 const localTerritory=local.find(n=>n.territory&&['province','prefecture'].includes(territoryNodes[n.territory]?.level))?.territory;
 const openLocal=()=>localTerritory?onTerritory(localTerritory):onCity(governed[0]??home);
 return <div className="realm-overview">
  {(attention>0||tasks.length>0)&&<section className="realm-overview-section"><div className="realm-section-title"><h3>当前事务</h3><button onClick={()=>onTab('duties')}>差事簿 ›</button></div>{attention>0&&<button className="realm-attention" onClick={()=>onTab('duties')}><ArtIcon name="influence"/>有 {attention} 项文书等你处理 <span>›</span></button>}{tasks.slice(0,3).map(t=><button className="realm-task-row" key={t.id} onClick={()=>onTab('duties')}><ArtIcon name={assignmentTemplates[t.kind].icon}/><span><strong>{siteById[t.site].name} · {assignmentTemplates[t.kind].name}</strong><small>{assignmentPhases[t.phase]} · 余 {Math.max(0,t.deadline-w.day)} 日</small></span><span>›</span></button>)}</section>}
  {(campaigns.length>0||priority||governed.length>0)&&<section className="realm-overview-section"><h3>{campaigns.length?'战役职掌':'辖区要务'}</h3><div className="realm-entry-grid">{campaigns.map(q=><button key={q.id} className="realm-entry" onClick={()=>onCity(q.target)}><ArtIcon name="army" size={36}/><span><strong>{siteById[q.target].name}战役</strong><small>{q.reason||'执行委任'} · 余 {Math.max(0,q.deadline-w.day)} 日</small></span><span aria-hidden="true">›</span></button>)}{priority&&<button className="realm-entry" onClick={()=>onCity(priority.site)}><ArtIcon name="grain" size={36}/><span><strong>{siteById[priority.site].name}</strong><small>{priority.reason} · {priority.neglect}</small></span><span aria-hidden="true">›</span></button>}{governed.length>1&&<button className="realm-entry" onClick={openLocal}><ArtIcon name="city" size={36}/><span><strong>统筹辖区</strong><small>下级任职与跨县公务</small></span><span aria-hidden="true">›</span></button>}</div></section>}
  {chief&&<div className="realm-outlook"><span>中央下期预计结余 <b>{forecast.income-forecast.expense-plannedReinvestment(w,r)>=0?'+':''}{forecast.income-forecast.expense-plannedReinvestment(w,r)} 钱</b></span><span>亲任治理 <b>{cities} 城</b></span><span>{realmAtWar(w,r)?'战事进行中':'国境和平'}</span></div>}
  {!attention&&!tasks.length&&!campaigns.length&&!priority&&!chief&&<p className="realm-quiet">暂无需要亲自处理的政务。可从页签查看职掌、朝廷与制度。</p>}
 </div>;
}

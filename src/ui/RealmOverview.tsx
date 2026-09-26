import {serviceNeed} from '../core/serviceNeeds';
import {localSites} from '../core/localAdministration';
import {livingStandards} from '../core/personalEconomyRules';
import {realmAtWar} from '../core/wars';
import {plannedReinvestment} from '../core/treasury';
import {ArtIcon,type ArtName} from './ArtIcon';
import {officeHierarchy,superiorOffice} from '../core/offices';
import {executive,playerRealm,realmForecast} from '../core/realm';
import {governmentOf,governingAuthority,politicalName} from '../core/government';
import {serviceAttention} from '../core/assignments';
import {dutyAttention} from '../core/duties';
import {assignmentTemplates,assignmentPhases} from '../data/assignments';
import {siteById} from '../data/scenario';
import {territoryNodes} from '../data/territorialHierarchy';
import type {World} from '../core/types';
import type {RealmTab} from './RealmPanel';
export const realmPageNames:Record<RealmTab,string>={treasury:'国库',overview:'政务总览',duties:'差事',politics:'任职授权',government:'制度',hierarchy:'科层',court:'朝廷',clans:'世族'};
export function realmRole(w:World){const r=playerRealm(w),g=governmentOf(w)!,id=w.characterId!,chief=governingAuthority(w,r),offices=officeHierarchy(w).filter(n=>n.active&&n.holder===id&&['city','office'].includes(n.kind));return {chief,offices,name:executive(w)?'执掌政务':g.ruler===id?'在位君主':offices.length?'在任官员':'宗室与朝臣',authority:executive(w)?'任免 · 财政 · 军政':`政务由${chief?politicalName(chief):'朝廷'}主持`};}
export function RealmOverview({world:w,onTab,onPerson,onCity,onTerritory,onEconomy}:{onCity:(id:string)=>void;onTerritory:(id:string)=>void;onEconomy:()=>void;world:World;onTab:(t:RealmTab)=>void;onPerson:(id:string)=>void}){
 const r=playerRealm(w),role=realmRole(w),chief=executive(w),forecast=realmForecast(w,r),tasks=w.service?.tasks.filter(t=>t.realm===r&&t.phase!=='closed'&&(chief||t.officer===w.characterId||t.helper===w.characterId||t.invitation?.person===w.characterId))??[],attention=serviceAttention(w).length+(dutyAttention(w)?1:0),cities=Object.values(w.realm!.cities).filter(c=>c.governor===w.characterId&&c.controller===r).length;
 const nodes=officeHierarchy(w),held=nodes.filter(n=>n.active&&n.holder===w.characterId&&n.realm===r),titles=held.filter(n=>n.kind!=='honour'),superiors=[...new Set(held.map(n=>superiorOffice(nodes,n)?.holder).filter((id):id is string=>!!id&&id!==w.characterId))],lands=held.filter(n=>!!n.territory);
 const local=held.filter(n=>!!n.territory),campaigns=w.militaryCampaigns?.items.filter(q=>q.status==='active'&&q.commander===w.characterId)??[],ruler=governmentOf(w)!.ruler===w.characterId,home=w.people[0].location,governed=[...new Set([...lands.map(n=>n.site).filter((v):v is string=>!!v),...local.flatMap(n=>localSites(w,n.territory!,r))])],priority=governed.map(site=>({site,...serviceNeed(w,'relief',site)})).sort((a,b)=>b.score-a.score)[0],standard=w.economy?.budgets?.[w.characterId!]?.standard??'modest';
 const localTerritory=local.find(n=>n.territory&&['province','prefecture'].includes(territoryNodes[n.territory]?.level))?.territory;
 const openLocal=()=>localTerritory?onTerritory(localTerritory):onCity(governed[0]??home);
 const tile=(tab:RealmTab,icon:ArtName,label:string,note:string)=><button className="realm-entry" key={tab+label} onClick={()=>onTab(tab)} title={note}><ArtIcon name={icon} size={44}/><span><strong>{label}</strong><small>{note}</small></span><span aria-hidden="true">›</span></button>;
 return <div className="realm-overview"><section className="realm-my-role"><button className="realm-person-link" onClick={()=>onPerson(w.characterId!)}><ArtIcon name="person"/><strong>{politicalName(w.characterId!)}</strong><span>›</span></button><dl className="realm-role-facts"><div><dt><ArtIcon name="influence" size={24}/>官名</dt><dd><button title={titles.map(n=>n.name).join('、')||'未任官职'} onClick={()=>onPerson(w.characterId!)}>{titles[0]?.name||'未任官职'}{titles.length>1&&<small>＋{titles.length-1}</small>}</button></dd></div><div><dt><ArtIcon name="person" size={24}/>上级</dt><dd>{superiors.length?<button title={superiors.map(politicalName).join('、')} onClick={()=>onPerson(superiors[0])}>{politicalName(superiors[0])}{superiors.length>1&&<small>＋{superiors.length-1}</small>}</button>:governmentOf(w)!.ruler===w.characterId?'无 · 君主':role.chief&&role.chief!==w.characterId?<button onClick={()=>onPerson(role.chief!)}>{politicalName(role.chief)}</button>:'无直属上级'}</dd></div><div><dt><ArtIcon name="city" size={24}/>领地</dt><dd>{lands.length?<button title={lands.map(n=>n.site?siteById[n.site].name:n.name).join('、')} onClick={()=>lands[0].site?onCity(lands[0].site):onTab('hierarchy')}>{lands[0].site?siteById[lands[0].site].name:lands[0].name}{lands.length>1&&<small>＋{lands.length-1}</small>}</button>:'无直辖城邑'}</dd></div></dl></section>
 <section><div className="realm-section-title"><h3>当前事务</h3><button onClick={()=>onTab('duties')}>差事簿 ›</button></div>{attention>0&&<button className="realm-attention" onClick={()=>onTab('duties')}><ArtIcon name="influence"/>有 {attention} 项文书等你处理 <span>›</span></button>}{tasks.slice(0,3).map(t=><button className="realm-task-row" key={t.id} onClick={()=>onTab('duties')}><ArtIcon name={assignmentTemplates[t.kind].icon}/><span><strong>{siteById[t.site].name} · {assignmentTemplates[t.kind].name}</strong><small>{assignmentPhases[t.phase]} · 余 {Math.max(0,t.deadline-w.day)} 日</small></span><span>›</span></button>)}</section>
 <section><h3>{chief?'执政要务':campaigns.length?'战役职掌':governed.length?'辖区要务':ruler?'亲政与家业':'个人生涯'}</h3><div className="realm-entry-grid">
 {chief?<>{tile('duties','influence','委任考课','确定目标、选任承办；例外再报')}{tile('treasury','coins','调度国库','审批请款与全国收支')}{tile('politics','person','关键人事','任免与军务授权')}</>:<>
 {campaigns.map(q=><button key={q.id} className="realm-entry" onClick={()=>onCity(q.target)}><ArtIcon name="army" size={44}/><span><strong>{siteById[q.target].name}战役</strong><small>{q.reason||'执行委任'} · 余 {Math.max(0,q.deadline-w.day)} 日</small></span><span>›</span></button>)}
 {priority&&<button className="realm-entry" onClick={()=>onCity(priority.site)}><ArtIcon name="grain" size={44}/><span><strong>{siteById[priority.site].name}</strong><small>{priority.reason} · {priority.neglect}</small></span><span>›</span></button>}
 {governed.length>1&&<button className="realm-entry" onClick={openLocal}><ArtIcon name="world" size={44}/><span><strong>统筹辖区</strong><small>下级任职、跨县目标与逐级请款</small></span><span aria-hidden="true">›</span></button>}
 {governed.length>0?<button className="realm-entry" onClick={openLocal}><ArtIcon name="coins" size={44}/><span><strong>地方财政</strong><small>本职预算、上缴与拨款</small></span><span aria-hidden="true">›</span></button>:tile('politics','person',ruler?'争取亲政':'争取职掌',ruler?'查看实际执政与任职关系':'空缺职位、条件与请任')}
 {tile('duties','influence','差事机会','按地方需求、职务能力与风险选取')}
 <button className="realm-entry" onClick={onEconomy}><ArtIcon name="estate" size={44}/><span><strong>经营家业</strong><small>私财事业、培养与往来 · 持家每期 {livingStandards[standard].monthly} 钱</small></span><span>›</span></button>
 {!governed.length&&!campaigns.length&&<button className="realm-entry" onClick={()=>onCity(home)}><ArtIcon name="city" size={44}/><span><strong>{siteById[home].name}</strong><small>当地人物、活动与出行</small></span><span>›</span></button>}
 </>}
 </div></section>
 <section><h3>政权档案</h3><div className="realm-reference-grid">{tile('court','renown','朝廷','官职 · 继承')}{tile('hierarchy','world','科层','君臣与隶属')}{tile('government','estate','制度','政体 · 改革')}{tile('clans','renown','世族','族望 · 门第')}</div></section>
 {chief&&<div className="realm-outlook"><span>中央下期结余 <b>{forecast.income-forecast.expense-plannedReinvestment(w,r)>=0?'+':''}{forecast.income-forecast.expense-plannedReinvestment(w,r)} 钱</b></span><span>治理 <b>{cities} 城</b></span><span>{realmAtWar(w,r)?'战事进行中':'国境和平'}</span></div>}</div>;
}

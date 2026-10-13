import {useState} from 'react';
import {OperationsArt} from './OperationsHeader';
import {terrainSceneStyle,personTerrainSite} from './terrainScene';
import {serviceNeed} from '../core/serviceNeeds';
import {localSites} from '../core/localAdministration';
import {officeHierarchy,superiorOffice} from '../core/offices';
import {executive,playerRealm} from '../core/realm';
import {governmentOf,governingAuthority,politicalName} from '../core/government';
import {personInfluence,influenceIncome,influenceIncomeHint} from '../core/personalInfluence';
import {serviceAttention} from '../core/assignments';
import {dutyAttention} from '../core/duties';
import {siteById} from '../data/scenario';
import {territoryNodes} from '../data/territorialHierarchy';
import {ArtIcon,Resource} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {RealmBadge} from './RealmBadge';
import type {World} from '../core/types';
import type {RealmTab} from './RealmPanel';

export function RealmIdentitySummary({world:w,onPerson,onCity,onCourt}:{world:World;onPerson:(id:string)=>void;onCity:(id:string)=>void;onCourt:(tab?:'central'|'person'|'local')=>void}){
 const r=playerRealm(w),id=w.characterId!,g=governmentOf(w)!,chief=governingAuthority(w,r),nodes=officeHierarchy(w),held=nodes.filter(n=>n.active&&n.holder===id&&n.realm===r),titles=held.filter(n=>n.kind!=='honour'),lands=held.filter(n=>!!n.territory);
 const superiors=[...new Set(held.map(n=>superiorOffice(nodes,n)?.holder).filter((person):person is string=>!!person&&person!==id))];
 const role=executive(w)?'执掌政务':g.ruler===id?'在位君主':titles.length?'在任官员':'宗室与朝臣';
 return <section className="realm-my-role" aria-label="我的政务身份与资源"><header className="realm-identity detail-landscape" style={terrainSceneStyle(personTerrainSite(w,id))}><RealmBadge realm={r} world={w}/><button className="realm-person-link" onClick={()=>onPerson(id)}><span><small>{role}</small><strong>{politicalName(id,w)}</strong></span><span aria-hidden="true">›</span></button><button className="realm-court-entry" onClick={()=>onCourt()} aria-label="打开朝廷，查看职官、财赋与制度"><ArtIcon name="influence" size={28}/><span>朝廷<small>职官 · 财赋 · 制度</small></span><span aria-hidden="true">›</span></button><div className="realm-key-resources"><Resource name="coins" value={w.people[0].coins} label="个人现钱" caption/><HoverHint label="个人影响力来源" content={<><strong>个人影响力 {personInfluence(w,id)}</strong><p>{influenceIncomeHint(w,id)}</p>{influenceIncome(w,id).parts.map(p=><p key={p.label}>{p.label} +{p.value}</p>)}</>}><span className="realm-influence-source"><Resource name="influence" value={personInfluence(w,id)} label="个人影响力" caption/><small aria-hidden="true">ⓘ</small></span></HoverHint><Resource name="coins" value={w.realm!.treasuries[r].coins} label="中央公款" caption/><Resource name="grain" value={w.realm!.treasuries[r].grain} label="中央公粮" caption/></div></header>
 <dl className="realm-role-facts"><div><dt><ArtIcon name="influence" size={24}/>官职</dt><dd><button title={titles.map(n=>n.name).join('、')||'未任官职'} onClick={()=>onCourt('person')}>{titles[0]?.name||'未任官职'}{titles.length>1&&<small>＋{titles.length-1}</small>}</button></dd></div><div><dt><ArtIcon name="person" size={24}/>上级</dt><dd>{superiors.length?<button title={superiors.map(id=>politicalName(id,w)).join('、')} onClick={()=>onPerson(superiors[0])}>{politicalName(superiors[0],w)}{superiors.length>1&&<small>＋{superiors.length-1}</small>}</button>:g.ruler===id?'无 · 君主':chief&&chief!==id?<button onClick={()=>onPerson(chief)}>{politicalName(chief,w)}</button>:'无直属上级'}</dd></div><div><dt><ArtIcon name="city" size={24}/>领地</dt><dd>{lands.length?<button title={lands.map(n=>n.site?siteById[n.site]?.name??n.name:n.name).join('、')} onClick={()=>lands[0].site?onCity(lands[0].site):onCourt('local')}>{lands[0].site?siteById[lands[0].site]?.name??lands[0].name:lands[0].name}{lands.length>1&&<small>＋{lands.length-1}</small>}</button>:'无直辖城邑'}</dd></div></dl></section>;
}

export function RealmOverview({world:w,onTab,onCity,onTerritory}:{world:World;onTab:(t:RealmTab)=>void;onCity:(id:string)=>void;onTerritory:(id:string)=>void}){
 const [selected,setSelected]=useState('');
 const r=playerRealm(w),central=executive(w),attention=serviceAttention(w),councilAttention=attention.filter(key=>key.startsWith('council')).length,dutyCount=attention.length-councilAttention+(dutyAttention(w)?1:0);
 const held=officeHierarchy(w).filter(n=>n.active&&n.holder===w.characterId&&n.realm===r),local=held.filter(n=>!!n.territory),campaigns=w.militaryCampaigns?.items.filter(q=>q.status==='active'&&q.commander===w.characterId)??[],home=w.people[0].location,governed=central?Object.keys(w.realm!.cities).filter(site=>w.realm!.cities[site].controller===r):[...new Set([...local.map(n=>n.site).filter((v):v is string=>!!v),...local.flatMap(n=>localSites(w,n.territory!,r))])],priority=governed.map(site=>({site,...serviceNeed(w,'relief',site)})).sort((a,b)=>b.score-a.score)[0];
 const localTerritory=local.find(n=>n.territory&&['province','prefecture'].includes(territoryNodes[n.territory]?.level))?.territory;
 const openLocal=()=>central?onTerritory('realm:'+r):localTerritory?onTerritory(localTerritory):onCity(governed[0]??home);
 const entries=[
  ...(dutyCount?[{id:'duties',title:'待办差事文书',detail:dutyCount+' 项文书等待办理',scene:'realm' as const,action:()=>onTab('duties'),label:'查阅差事'}]:[]),
  ...(councilAttention?[{id:'council',title:'议事文书',detail:councilAttention+' 项议事等待裁定',scene:'realm' as const,action:()=>onTab('council'),label:'查阅议事'}]:[]),
  ...campaigns.map(q=>({id:'campaign-'+q.id,title:siteById[q.target].name+'战役',detail:(q.reason||'执行委任')+' · 限期余 '+Math.max(0,q.deadline-w.day)+' 日',scene:'military' as const,action:()=>onCity(q.target),label:'查看目标城邑'})),
  ...(priority?[{id:priority.site,title:siteById[priority.site].name+'地方事务',detail:priority.reason,scene:'realm' as const,action:()=>onCity(priority.site),label:'查看城邑'}]:[]),
  ...(governed.length>1?[{id:'lands',title:central?'本国州郡':'统筹辖区',detail:'职责范围内 '+governed.length+' 处城邑，按实际统属办理公务。',scene:'directory' as const,action:openLocal,label:'查看辖区'}]:[]),
 ];
 const entry=entries.find(e=>e.id===selected)??entries[0];
 return <div className="realm-overview operations-master-detail"><aside className="operations-roster" aria-label="政务文书"><h3>案头文书</h3>{!dutyCount&&!councilAttention&&<small>当前没有待决公文</small>}{entries.map(e=><button key={e.id} aria-pressed={e.id===entry?.id} onClick={()=>setSelected(e.id)}><span><strong>{e.title}</strong><small>{e.detail}</small></span></button>)}</aside><section className="operations-selected government-dossier">{entry?<><h3>{entry.title}</h3><OperationsArt scene={entry.scene} className="government-dossier-art"/><p>{entry.detail}</p>{entry.id===priority?.site&&<p>暂缓：{priority.neglect}</p>}<footer><button onClick={entry.action}>{entry.label}</button>{entry.scene==='realm'&&<button onClick={()=>onTab('duties')}>拟定差事</button>}</footer></>:<><OperationsArt scene="realm" className="government-dossier-art"/><h3>案牍暂清</h3><p>当前没有待办文书，也没有职责范围内的地方或战役要务。</p></>}</section></div>;
}

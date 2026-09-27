import {serviceNeed} from '../core/serviceNeeds';
import {localSites} from '../core/localAdministration';
import {officeHierarchy,superiorOffice} from '../core/offices';
import {executive,playerRealm} from '../core/realm';
import {governmentOf,governingAuthority,politicalName} from '../core/government';
import {personInfluence} from '../core/personalInfluence';
import {serviceAttention} from '../core/assignments';
import {dutyAttention} from '../core/duties';
import {siteById} from '../data/scenario';
import {territoryNodes} from '../data/territorialHierarchy';
import {ArtIcon,Resource} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {RealmBadge} from './RealmBadge';
import type {World} from '../core/types';
import type {RealmTab} from './RealmPanel';

export function RealmIdentitySummary({world:w,onPerson,onCity,onHierarchy}:{world:World;onPerson:(id:string)=>void;onCity:(id:string)=>void;onHierarchy:()=>void}){
 const r=playerRealm(w),id=w.characterId!,g=governmentOf(w)!,chief=governingAuthority(w,r),nodes=officeHierarchy(w),held=nodes.filter(n=>n.active&&n.holder===id&&n.realm===r),titles=held.filter(n=>n.kind!=='honour'),lands=held.filter(n=>!!n.territory);
 const superiors=[...new Set(held.map(n=>superiorOffice(nodes,n)?.holder).filter((person):person is string=>!!person&&person!==id))];
 const role=executive(w)?'执掌政务':g.ruler===id?'在位君主':titles.length?'在任官员':'宗室与朝臣';
 const loyal=Object.values(w.relationships?.oaths??{}).filter(o=>o.lord===id&&o.loyalty>=70).length;
 return <section className="realm-my-role" aria-label="我的政务身份与资源"><header className="realm-identity"><RealmBadge realm={r} world={w}/><button className="realm-person-link" onClick={()=>onPerson(id)}><span><small>{role}</small><strong>{politicalName(id)}</strong></span><span aria-hidden="true">›</span></button><div className="realm-key-resources"><Resource name="coins" value={w.people[0].coins} label="个人现钱" caption/><HoverHint label="个人影响力来源" content={<><strong>个人影响力 {personInfluence(w,id)}</strong><p>每 30 日例行 +5；成功办结公务按所得功绩的一半取整增加，至少 +1。</p>{loyal>0&&<p>忠诚至少 70 的属员 {loyal} 人，每 30 日另加 {Math.min(4,loyal)}。</p>}<p>处理积弊等事务可增加影响力；任命、政务与交往行动会消耗。个人持有，上限 999。</p></>}><span className="realm-influence-source"><Resource name="influence" value={personInfluence(w,id)} label="个人影响力" caption/><small aria-hidden="true">ⓘ</small></span></HoverHint><Resource name="coins" value={w.realm!.treasuries[r].coins} label="中央公款" caption/><Resource name="grain" value={w.realm!.treasuries[r].grain} label="中央公粮" caption/></div></header>
 <dl className="realm-role-facts"><div><dt><ArtIcon name="influence" size={24}/>官职</dt><dd><button title={titles.map(n=>n.name).join('、')||'未任官职'} onClick={()=>onPerson(id)}>{titles[0]?.name||'未任官职'}{titles.length>1&&<small>＋{titles.length-1}</small>}</button></dd></div><div><dt><ArtIcon name="person" size={24}/>上级</dt><dd>{superiors.length?<button title={superiors.map(politicalName).join('、')} onClick={()=>onPerson(superiors[0])}>{politicalName(superiors[0])}{superiors.length>1&&<small>＋{superiors.length-1}</small>}</button>:g.ruler===id?'无 · 君主':chief&&chief!==id?<button onClick={()=>onPerson(chief)}>{politicalName(chief)}</button>:'无直属上级'}</dd></div><div><dt><ArtIcon name="city" size={24}/>领地</dt><dd>{lands.length?<button title={lands.map(n=>n.site?siteById[n.site]?.name??n.name:n.name).join('、')} onClick={()=>lands[0].site?onCity(lands[0].site):onHierarchy()}>{lands[0].site?siteById[lands[0].site]?.name??lands[0].name:lands[0].name}{lands.length>1&&<small>＋{lands.length-1}</small>}</button>:'无直辖城邑'}</dd></div></dl></section>;
}

export function RealmOverview({world:w,onTab,onCity,onTerritory}:{world:World;onTab:(t:RealmTab)=>void;onCity:(id:string)=>void;onTerritory:(id:string)=>void}){
 const r=playerRealm(w),attention=serviceAttention(w).length+(dutyAttention(w)?1:0);
 const held=officeHierarchy(w).filter(n=>n.active&&n.holder===w.characterId&&n.realm===r),local=held.filter(n=>!!n.territory),campaigns=w.militaryCampaigns?.items.filter(q=>q.status==='active'&&q.commander===w.characterId)??[],home=w.people[0].location,governed=[...new Set([...local.map(n=>n.site).filter((v):v is string=>!!v),...local.flatMap(n=>localSites(w,n.territory!,r))])],priority=governed.map(site=>({site,...serviceNeed(w,'relief',site)})).sort((a,b)=>b.score-a.score)[0];
 const localTerritory=local.find(n=>n.territory&&['province','prefecture'].includes(territoryNodes[n.territory]?.level))?.territory;
 const openLocal=()=>localTerritory?onTerritory(localTerritory):onCity(governed[0]??home);
 return <div className="realm-overview">
  {attention>0&&<button className="realm-attention" onClick={()=>onTab('duties')}><ArtIcon name="influence"/>有 {attention} 项文书等你处理 <span>›</span></button>}
  {(campaigns.length>0||priority||governed.length>0)&&<section className="realm-overview-section"><h3>{campaigns.length?'战役职掌':'辖区要务'}</h3><div className="realm-entry-grid">{campaigns.map(q=><button key={q.id} className="realm-entry" onClick={()=>onCity(q.target)}><ArtIcon name="army" size={36}/><span><strong>{siteById[q.target].name}战役</strong><small>{q.reason||'执行委任'} · 余 {Math.max(0,q.deadline-w.day)} 日</small></span><span aria-hidden="true">›</span></button>)}{priority&&<button className="realm-entry" onClick={()=>onCity(priority.site)}><ArtIcon name="grain" size={36}/><span><strong>{siteById[priority.site].name}</strong><small>{priority.reason} · {priority.neglect}</small></span><span aria-hidden="true">›</span></button>}{governed.length>1&&<button className="realm-entry" onClick={openLocal}><ArtIcon name="city" size={36}/><span><strong>统筹辖区</strong><small>下级任职与跨县公务</small></span><span aria-hidden="true">›</span></button>}</div></section>}
 </div>;
}

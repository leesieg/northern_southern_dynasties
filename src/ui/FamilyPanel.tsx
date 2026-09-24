import {ClanBadge} from './ClanRanking';
import {DetailTabs} from './DetailTabs';
import {lifeOf,ageLabel,isDeceased} from '../core/lifeState';
import { RelationshipSummary } from './RelationshipSummary';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { families,familyById,familyPersonById,familyMembers,parentLinks,relatives } from '../data/families';
import { familyStanding,prestigeReasons } from '../core/family';
import type { World } from '../core/types';
import './family.css';
export function FamilyCrest({family,small=false}:{family:string;small?:boolean}){
 const f=familyById[family];if(!f)return null;
 return <span className={'family-crest'+(small?' small':'')} style={{'--clan-color':f.color} as CSSProperties} aria-label={f.name+'族徽'}><span>{f.surname}</span></span>;
}
export function FamilyPanel({world,selected,onSelect,onPerson}:{world:World;selected:string;onSelect:(id:string)=>void;onPerson:(id:string)=>void}){
 const [query,setQuery]=useState(''),[chapter,setChapter]=useState<'tree'|'contributions'>('tree');
 const person=familyPersonById[selected]??familyPersonById[world.characterId??'fictional'],family=familyById[person.family],members=familyMembers(family.id),standing=familyStanding(world,person.id);
 const ancestors=relatives(person.id,'ancestors'),descendants=relatives(person.id,'descendants'),status={ancestor:'先人',roster:'族人',reference:'族人',fictional:'架空'};
 const choose=(id:string)=>{onSelect(id);setQuery('');setChapter('tree');};
 const node=(id:string,seen=new Set<string>()):React.ReactNode=>{
  if(seen.has(id))return null;const p=familyPersonById[id],next=new Set([...seen,id]),children=parentLinks.filter(r=>r.parent===id&&familyPersonById[r.child].family===family.id);
  return <li key={id}><button aria-pressed={person.id===id} className={'family-node '+(person.id===id?'selected':'')} onClick={()=>choose(id)}><strong>{p.name}</strong><small>{isDeceased(world,id)?'已故':status[p.status]}{lifeOf(world,id)?' · '+ageLabel(world,id):''}{id===world.characterId?' · 你':''}</small></button>{children.length>0&&<ul>{children.map(r=>node(r.child,next))}</ul>}</li>;
 };
 const roots=members.filter(p=>!parentLinks.some(r=>r.child===p.id&&familyPersonById[r.parent].family===family.id));
 return <div className="family-panel">
 <label className="family-switch">家族 <select aria-label="选择家族" value={family.id} onChange={e=>choose(familyMembers(e.target.value).find(p=>p.status==='roster')?.id??familyMembers(e.target.value)[0].id)}>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
 <div className="family-banner"><FamilyCrest family={family.id}/><div><span className="eyebrow">{family.originKind==='设定'?'籍贯':family.originKind} · {family.origin.split('（')[0]}</span><h3>{family.name}</h3><ClanBadge world={world} person={person.id}/><p>{standing.rank.name} · 家族威望 <strong>{standing.total}</strong></p></div></div>
 <section className="family-standing" aria-label="家族威望加成"><progress aria-label="家族等级进度" value={standing.next?standing.total-standing.rank.threshold:1} max={standing.next?standing.next.threshold-standing.rank.threshold:1}/><p>{standing.next?`距「${standing.next.name}」还需 ${standing.next.threshold-standing.total} 威望`:'已达最高家族等级'}</p><div className="family-buffs"><span>外交 <b>+{standing.diplomacy}</b></span><span>每月压力恢复 <b>+{standing.calm}</b></span></div><small>家族成员共享加成，解锁世业不消耗累计威望。</small></section>
 <DetailTabs label="家族章节" value={chapter} onChange={setChapter} items={[{id:'tree',label:'族谱',icon:'person'},{id:'contributions',label:'威望',icon:'renown'}]}/>
 {chapter==='tree'&&<section id="family-tree"><h3>家族树 <small>世系 · 点击查看族人</small></h3><div className="family-tree" role="group" aria-label={family.name+'家族树'}><ul>{roots.map(p=>node(p.id))}</ul></div>{roots.length>1&&<p className="small-note">{roots.length} 条支系</p>}
 <article className="family-person"><div className="family-person-heading"><FamilyCrest family={family.id} small/><div><h3>{person.name}</h3><small>{isDeceased(world,person.id)?'已故':status[person.status]} · 个人累计贡献 {world.families?.prestige[person.id]??0}</small></div></div>{person.status!=='ancestor'&&<p>{person.description.split('。')[0]}。</p>}<RelationshipSummary world={world} person={person.id} onPerson={onPerson}/>{person.status==='roster'&&<button className="primary" onClick={()=>onPerson(person.id)}>人物详情与交往 →</button>}
 <h4>祖先 · {ancestors.length} 位</h4><div className="family-relatives">{ancestors.map(p=><button key={p.id} onClick={()=>choose(p.id)}>{p.name}</button>)}{!ancestors.length&&<small>父母不详。</small>}</div>
 <h4>后代 · {descendants.length} 位</h4><div className="family-relatives">{descendants.map(p=><button key={p.id} onClick={()=>choose(p.id)}>{p.name}</button>)}{!descendants.length&&<small>暂无后代记载。</small>}</div>
 <details><summary>人物与亲属史料</summary>{person.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></p>)}{parentLinks.filter(r=>r.child===person.id||r.parent===person.id).map(r=><p key={r.parent+r.child}>{familyPersonById[r.parent].name} → {familyPersonById[r.child].name}（{r.kind}） · <a href={r.source.url} target="_blank" rel="noreferrer">依据 ↗</a></p>)}{!person.sources.length&&<p>虚构人物，无历史家谱。</p>}</details></article></section>}
 {chapter==='contributions'&&<section id="family-contributions"><h3>族人贡献</h3><input className="search" aria-label="查找家族成员" placeholder="输入姓名查找族人" value={query} onChange={e=>setQuery(e.target.value)}/><div className="family-contributions">{members.filter(p=>p.name.includes(query)).sort((a,b)=>(world.families?.prestige[b.id]??0)-(world.families?.prestige[a.id]??0)).map(p=><button key={p.id} onClick={()=>choose(p.id)}><span>{p.name}<small>{status[p.status]}</small></span><b>{world.families?.prestige[p.id]??0}</b></button>)}{!members.some(p=>p.name.includes(query))&&<p>未找到族人。</p>}</div>
 <details><summary>近期威望记录</summary><ol className="family-ledger">{world.families?.ledger.filter(e=>familyPersonById[e.member].family===family.id).slice(-15).reverse().map((e,i)=><li key={i}>第 {e.day} 日 · {familyPersonById[e.member].name} · {prestigeReasons[e.reason]} +{e.amount}</li>)}</ol>{!standing.total&&<p>尚无贡献，推进时间或完成营建后开始累计。</p>}</details>
 <section className="family-notes"><h4>威望增长</h4><p>参与本局的族人每月贡献 2 威望；主持工程竣工 +10，交好成功 +5。退居者保留贡献，不再获得月度威望。</p><p>家族等级门槛：0 / 100 / 300 / 700 / 1500；每级外交 +1、每月压力恢复 +2。</p></section></section>}
 </div>;
}

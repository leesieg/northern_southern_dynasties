import {familyPersonOf,familyMembersOf,relativesOf,parentLinksOf} from '../core/personRegistry';
import {CharacterPortrait} from './CharacterPortrait';
import {ClanBadge} from './ClanRanking';
import {lifeOf,ageLabel,isDeceased} from '../core/lifeState';
import { RelationshipSummary } from './RelationshipSummary';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import {families,familyById} from '../data/families';
import { familyStanding,prestigeReasons } from '../core/family';
import type { World } from '../core/types';
import './family.css';
export function FamilyCrest({family,small=false}:{family:string;small?:boolean}){
 const f=familyById[family];if(!f)return null;
 return <span className={'family-crest'+(small?' small':'')} style={{'--clan-color':f.color} as CSSProperties} aria-label={f.name+'族徽'}><span>{f.surname}</span></span>;
}
export function FamilyPanel({world,selected,chapter,onSelect,onPerson}:{world:World;selected:string;chapter:'tree'|'contributions';onSelect:(id:string)=>void;onPerson:(id:string)=>void}){
 const [query,setQuery]=useState('');
 const person=familyPersonOf(world,selected)!??familyPersonOf(world,world.characterId??'fictional')!,family=familyById[person.family],members=familyMembersOf(world,family.id),standing=familyStanding(world,person.id);
 const ancestors=relativesOf(world,person.id,'ancestors'),descendants=relativesOf(world,person.id,'descendants'),status={ancestor:'先人',roster:'族人',reference:'族人',fictional:'架空'};
 const choose=(id:string)=>{onSelect(id);setQuery('');};
 const node=(id:string,seen=new Set<string>()):React.ReactNode=>{
  if(seen.has(id))return null;const p=familyPersonOf(world,id)!,next=new Set([...seen,id]),children=parentLinksOf(world).filter(r=>r.parent===id&&familyPersonOf(world,r.child)!.family===family.id);
  return <li key={id}><button aria-pressed={person.id===id} className={'family-node '+(person.id===id?'selected':'')} onClick={()=>choose(id)}><CharacterPortrait characterId={id} name={p.name} world={world} compact/><span className="family-node-copy"><strong>{p.name}</strong><small>{isDeceased(world,id)?'已故':status[p.status]}{lifeOf(world,id)?' · '+ageLabel(world,id):''}{id===world.characterId?' · 你':''}</small></span></button>{children.length>0&&<ul>{children.map(r=>node(r.child,next))}</ul>}</li>;
 };
 const roots=members.filter(p=>!parentLinksOf(world).some(r=>r.child===p.id&&familyPersonOf(world,r.parent)!.family===family.id));
 return <div className="family-panel">
 <label className="family-switch">家族 <select aria-label="选择家族" value={family.id} onChange={e=>choose(familyMembersOf(world,e.target.value).find(p=>p.status==='roster')?.id??familyMembersOf(world,e.target.value)[0].id)}>{families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
 <div className="family-banner detail-landscape detail-landscape--family"><FamilyCrest family={family.id}/><div><span className="eyebrow">{family.originKind==='设定'?'籍贯':family.originKind} · {family.origin.split('（')[0]}</span><h3>{family.name}</h3><ClanBadge world={world} person={person.id}/><p>{standing.rank.name} · 家族威望 <strong>{standing.total}</strong></p></div></div>
 <section className="family-standing" aria-label="家族威望加成"><progress aria-label="家族等级进度" value={standing.next?standing.total-standing.rank.threshold:1} max={standing.next?standing.next.threshold-standing.rank.threshold:1}/><p>{standing.next?`距「${standing.next.name}」还需 ${standing.next.threshold-standing.total} 威望`:'已达最高家族等级'}</p><div className="family-buffs"><span>外交 <b>+{standing.diplomacy}</b></span><span>每月 1 日压力恢复 <b>+{standing.calm}</b></span></div><small>家族成员共享加成，解锁世业不消耗累计威望。</small></section>
 {chapter==='tree'&&<section id="family-tree"><h3>家族树 <small>世系 · 点击查看族人</small></h3><div className="family-tree" role="group" aria-label={family.name+'家族树'}><ul>{roots.map(p=>node(p.id))}</ul></div>{roots.length>1&&<p className="small-note">{roots.length} 条支系</p>}
 <article className="family-person"><div className="family-person-heading"><CharacterPortrait characterId={person.id} name={person.name} world={world} compact/><div><h3>{person.name}</h3><small>{isDeceased(world,person.id)?'已故':status[person.status]} · 个人累计贡献 {world.families?.prestige[person.id]??0}</small></div></div>{person.status!=='ancestor'&&<p>{person.description.split('。')[0]}。</p>}<RelationshipSummary world={world} person={person.id} onPerson={onPerson}/><button className="primary" onClick={()=>onPerson(person.id)}>人物详情 →</button>
 <h4>祖先 · {ancestors.length} 位</h4><div className="family-relatives">{ancestors.map(p=><button key={p.id} onClick={()=>onPerson(p.id)}><CharacterPortrait characterId={p.id} name={p.name} world={world} compact/><span>{p.name}</span></button>)}{!ancestors.length&&<small>父母不详。</small>}</div>
 <h4>后代 · {descendants.length} 位</h4><div className="family-relatives">{descendants.map(p=><button key={p.id} onClick={()=>onPerson(p.id)}><CharacterPortrait characterId={p.id} name={p.name} world={world} compact/><span>{p.name}</span></button>)}{!descendants.length&&<small>暂无后代记载。</small>}</div>
 <section className="detail-record-group"><h4>人物与亲属史料</h4>{person.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></p>)}{parentLinksOf(world).filter(r=>r.child===person.id||r.parent===person.id).map(r=><p key={r.parent+r.child}>{familyPersonOf(world,r.parent)!.name} → {familyPersonOf(world,r.child)!.name}（{r.kind}） · {r.source.url?<a href={r.source.url} target="_blank" rel="noreferrer">依据 ↗</a>:<span>{r.source.title}</span>}</p>)}{!person.sources.length&&<p>虚构人物，无历史家谱。</p>}</section></article></section>}
 {chapter==='contributions'&&<section id="family-contributions"><h3>族人贡献</h3><input className="search" aria-label="查找家族成员" placeholder="输入姓名查找族人" value={query} onChange={e=>setQuery(e.target.value)}/><div className="family-contributions">{members.filter(p=>p.name.includes(query)).sort((a,b)=>(world.families?.prestige[b.id]??0)-(world.families?.prestige[a.id]??0)).map(p=><button key={p.id} onClick={()=>onPerson(p.id)}><CharacterPortrait characterId={p.id} name={p.name} world={world} compact/><span>{p.name}<small>{status[p.status]}</small></span><b>{world.families?.prestige[p.id]??0}</b></button>)}{!members.some(p=>p.name.includes(query))&&<p>未找到族人。</p>}</div>
 <section><h4>近期威望记录</h4><ol className="family-ledger">{world.families?.ledger.filter(e=>familyPersonOf(world,e.member)!.family===family.id).slice(-15).reverse().map((e,i)=><li key={i}>第 {e.day} 日 · {familyPersonOf(world,e.member)!.name} · {prestigeReasons[e.reason]} +{e.amount}</li>)}</ol>{!standing.total&&<p>尚无贡献，推进时间或完成营建后开始累计。</p>}</section>
 <section className="family-notes"><h4>威望增长</h4><p>参与本局的族人每月 1 日贡献 2 威望；主持工程竣工 +10，交好成功 +5。退居者保留贡献，不再获得月度威望。</p><p>家族等级门槛：0 / 100 / 300 / 700 / 1500；每级外交 +1、每月压力恢复 +2。</p></section></section>}
 </div>;
}

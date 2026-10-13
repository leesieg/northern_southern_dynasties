import {useState} from 'react';
import {realmClans,clanHead,clanStanding,CLAN_PRESTIGE_MIN} from '../core/clans';
import {FamilyCrest} from './FamilyCrest';
import {CharacterPortrait} from './CharacterPortrait';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import type {RealmId} from '../core/realm';
import type {World} from '../core/types';
import './retinue.css';
export function ClanBadge({world,person}:{world:World;person:string}){const s=clanStanding(world,person);if(!s?.elite)return null;return <HoverHint label="世族荫望" content={<><p>本国族望第 {s.rank} 位 · {s.prestige}</p><p>首次联姻可为双方参与经营的家族带来 {s.marriage} 威望（取门第较高一方，不叠加）；求官接受度 +{s.petition}，城邑请任功绩门槛 −{s.merit}。</p></>}><span className="clan-standing-badge"><ArtIcon name="renown" size={22}/>世族</span></HoverHint>;}
export function ClanRanking({world:w,realm,onPerson}:{world:World;realm:RealmId;onPerson:(id:string)=>void}){
 const [selected,setSelected]=useState(''),rows=realmClans(w,realm),row=rows.find(r=>r.family.id===selected)??rows[0],head=row?clanHead(w,row.family.id):undefined;
 return <section className="clan-ranking"><header><h3><ArtIcon name="renown"/>世族名录</h3><HoverHint label="世族评定" content={`本国在世族员所属家族按全族累计威望排列；前三名且威望达到 ${CLAN_PRESTIGE_MIN} 为世族，同分同名次。`}><span>世族 {rows.filter(r=>r.elite).length} 家 ⓘ</span></HoverHint></header><div className="operations-master-detail"><aside className="operations-roster" aria-label="家族名册">{rows.map(r=><button key={r.family.id} aria-pressed={r.family.id===row?.family.id} onClick={()=>setSelected(r.family.id)}><FamilyCrest size={24} family={r.family.id} small/><span><strong>{r.family.name}</strong><small>第 {r.rank} 位 · {r.prestige} 威望</small></span></button>)}</aside><div className="operations-selected clan-dossier">{row?<><h3>{row.family.name}</h3><p>{row.family.origin} · {row.elite?'世族':'本国家族'} · {row.prestige} 威望</p>{head&&<button className="clan-dossier-head" onClick={()=>onPerson(head.id)}><CharacterPortrait characterId={head.id} world={w}/><span>族长<strong>{head.name}</strong></span></button>}<h4>在世族员</h4><div className="clan-dossier-members">{row.members.map(p=><button key={p.id} onClick={()=>onPerson(p.id)}><CharacterPortrait characterId={p.id} world={w} compact/><span>{p.name}</span></button>)}</div></>:<p>暂无本国家族。</p>}</div></div></section>;
}

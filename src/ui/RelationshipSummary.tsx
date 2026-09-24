import {ArtIcon} from './ArtIcon';
import { friendshipNames } from '../data/relationships';
import { relationName,spouseOf,validRegency } from '../core/relationships';
import { realms } from '../core/realm';
import type { World } from '../core/types';
import './relationships.css';
export function RelationshipSummary({world:w,person,onPerson}:{world:World;person:string;onPerson:(id:string)=>void}){
 const s=w.relationships;if(!s)return null;const spouse=spouseOf(w,person),bonds=Object.values(s.bonds).filter(b=>b.a===person||b.b===person),oath=s.oaths[person],followers=Object.entries(s.oaths).filter(([,o])=>o.lord===person),controls=realms.map(r=>validRegency(w,r)).filter(c=>c&&c.origin!=='restored'&&(c.ruler===person||c.controller===person));
 const link=(id:string)=><button className="relationship-link" onClick={()=>onPerson(id)}>{relationName(id)} ↗</button>;
 return <section className="relationship-summary"><h4><ArtIcon name="gregarious" size={26}/>亲友与效忠</h4><p>配偶：{spouse?link(spouse):s.maritalBasis[person]==='unknown'?'婚姻不详':s.maritalBasis[person]?'无配偶':'—'}</p>
 {bonds.map(b=><p key={b.a+b.b}><span>{friendshipNames[b.kind]}</span> {link(b.a===person?b.b:b.a)}</p>)}
 {oath&&<p>个人效忠：{link(oath.lord)} · 忠诚 {oath.loyalty}</p>}{followers.map(([id,o])=><p key={id}>效忠者：{link(id)} · 忠诚 {o.loyalty}</p>)}
 {controls.map(c=><p key={c!.realm}>{c!.ruler===person?'实际执政者：':'控制名义君主：'}{link(c!.ruler===person?c!.controller:c!.ruler)} · 控制 {c!.grip}/100</p>)}
 {!bonds.length&&!oath&&!followers.length&&!controls.length&&<small>暂无其他亲友或效忠关系。</small>}</section>;
}

import {RealmBadge} from './RealmBadge';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {LocalOfficeSeat,LocalRequests} from './LocalAdministration';
import {useState} from 'react';
import {ministries,type MinistryId} from '../data/court';
import {historicalCharacters} from '../data/characters';
import {isAlive} from '../core/lifeState';
import {governmentOf,governmentExecutive} from '../core/government';
import {courtReason} from '../core/court';
import { movements } from '../data/court';
import { courtOf,movementPower } from '../core/court';
import { officeHierarchy,officeChain,superiorOffice,directSubordinates,type OfficeNode } from '../core/offices';
import { politicalName } from '../core/government';
import { playerRealm,type RealmId } from '../core/realm';
import { characterById } from '../data/characters';
import { siteById } from '../data/scenario';
import type { World,GameCommand } from '../core/types';
import './offices.css';
export function OfficeHierarchy({world,person,realm=playerRealm(world),onPerson,expanded=false,send,pending=false}:{send?:(command:GameCommand)=>void;pending?:boolean;world:World;person?:string;realm?:RealmId;expanded?:boolean;onPerson:(id:string)=>void}){
 const [office,setOffice]=useState<MinistryId|null>(null),[candidate,setCandidate]=useState(world.characterId!);
 const all=officeHierarchy(world);if(!all.length)return null;
 const affiliation=person&&characterById[person]?courtOf(world,characterById[person].polity)?.members[person]:undefined;
 const held=person?all.filter(n=>n.holder===person):all.filter(n=>n.realm===realm);
 const link=(id:string)=><button className="office-person" onClick={()=>onPerson(id)}>{politicalName(id)} ↗</button>;
 const card=(n:OfficeNode)=>{const superior=superiorOffice(all,n);return <article className="office-card" key={n.id}>
  <header><strong>{n.name}</strong><small><RealmBadge realm={n.realm} world={world}/> · {n.kind==='honour'?'身份／爵号':n.kind==='city'?(n.active?'在任辖地':'失守 · 治理暂停'):n.active?'朝廷职位':'政体停用 · 无履职增益'}</small></header>
  {!person&&<div>{n.holder?link(n.holder):<span className="small-note">空缺 · 未任命</span>}</div>}
  {n.kind==='honour'?<p className="small-note">奉属君主 {superior?.holder?link(superior.holder):'本人'}；此身份不授予城市治理权。</p>:<div className="office-superior">{superior?.holder?<>{n.relation==='liege'?'直属领主':n.relation==='chief'?'上级首领':n.kind==='executive'&&n.parentId?.endsWith('sovereign')?'奉事君主':'直属上级'}：{link(superior.holder)}<small>{superior.name}</small></>:<span className="small-note">{n.parentId?'兼任上级职位，无其他直属上级':'本政权最高名义位阶'}</span>}</div>}
  {person&&n.kind!=='honour'&&<section className="detail-record-group"><h4>完整职位链</h4><ol className="office-chain">{officeChain(all,n).map(p=><li key={p.id}><span>{p.name}</span>{p.holder?link(p.holder):'空缺'}</li>)}</ol></section>}

 </article>;};
 const sub=person?directSubordinates(all,person):[];
 const grouped=Array.from(new Set(sub.map(n=>n.holder!)));
 const petitions=world.realm!.offices.filter(o=>person?o.candidate===person:world.realm!.cities[o.site]?.owner===realm);
 const tree=(n:OfficeNode):React.ReactNode=>{const children=held.filter(c=>c.kind!=='honour'&&(c.parentId===n.id||!n.parentId&&c.parentId&&!held.some(parent=>parent.id===c.parentId)));const own=!!send&&n.realm===playerRealm(world),ministry=n.id.includes(':ministry:')?n.id.split(':').at(-1) as MinistryId:null;const row=<div className="office-tree-node">{own&&n.territory?<LocalOfficeSeat world={world} realm={n.realm} territory={n.territory} send={send!} pending={pending} onPerson={onPerson}/>:<PositionSeat world={world} holder={n.holder} title={n.name} status={!n.active?'停任':undefined} onPerson={onPerson} onManage={own&&ministry?()=>{setOffice(ministry);setCandidate(governmentExecutive(world)?n.holder??world.characterId!:world.characterId!);}:undefined}/>}</div>;return <li key={n.id}>{row}{children.length>0&&(expanded?<ul>{children.map(tree)}</ul>:<section className="detail-record-group"><h4>属官 · {children.length}</h4><ul>{children.map(tree)}</ul></section>)}</li>;};
 const command=office?(governmentExecutive(world)?{type:'court',action:'appoint',ministry:office,candidate} as const:{type:'court',action:'seek-office',ministry:office} as const):null;
 return <section className="office-hierarchy">{office&&send&&command&&<PersonSelectionDialog world={world} title={ministries[office].name} value={candidate} onSelect={setCandidate} onClose={()=>setOffice(null)} pending={pending} description={ministries[office].effect+'；新任命将撤换原任者。'} options={historicalCharacters.filter(p=>p.polity===playerRealm(world)&&isAlive(world,p.id)&&(governmentExecutive(world)||p.id===world.characterId)).map(p=>({id:p.id,score:governmentOf(world)?.merit[p.id]??0,metric:'功绩',reason:courtReason(world,command.action==='appoint'?{...command,candidate:p.id}:command)}))} confirmLabel={governmentExecutive(world)?'任命 · 15 影响力':'申请 · 25 影响力'} onConfirm={()=>{send(command);setOffice(null);}}/>}<h3>{person?'官爵与统属':'政权科层'}</h3>
 {person&&affiliation&&<p className="small-note">政治立场：{movements[affiliation].name} · 集团势力 {movementPower(world,characterById[person].polity,person)}</p>}
 {person?held.map(card):<ul className="office-tree">{held.filter(n=>!n.parentId).map(n=>tree(n))}</ul>}
 {send&&<LocalRequests world={world} send={send} pending={pending}/>}
 {person&&!held.length&&<p>暂无在任官职。</p>}
 {person&&<div className="office-subordinates"><h4>直属属员 · {grouped.length} 人</h4>{grouped.map(id=><p key={id}>{link(id)}<small>{sub.filter(n=>n.holder===id).map(n=>n.name+(n.active?'':'（失守）')).join(' · ')}</small></p>)}{!grouped.length&&<p className="small-note">暂无直属属员。</p>}</div>}
 {petitions.length>0&&<aside><h4>任命文书在途</h4>{petitions.map(o=><p key={o.site}>{link(o.candidate)} · {siteById[o.site].name} · 余 {Math.max(0,o.due-world.day)} 日</p>)}<small>送达前维持原任官与统属关系。</small></aside>}
 </section>;
}

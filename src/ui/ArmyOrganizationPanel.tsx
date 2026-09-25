import {useState} from 'react';
import {troopKinds,armyOrganizationReason,type ArmyCommand,type TroopKind} from '../core/armyOrganization';
import {playerRealm} from '../core/realm';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {accountName} from '../core/treasury';
import type {World,GameCommand} from '../core/types';
export function ArmyOrganizationPanel({world:w,site,pending,send}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>void}){
 const [service,setService]=useState<'levy'|'standing'>('levy');if(!w.realm)return null;
 const armies=w.realm.armies.filter(a=>a.realm===playerRealm(w)&&a.location===site&&!a.journey);
 const button=(c:ArmyCommand,label:string,detail:string)=>{const reason=armyOrganizationReason(w,c);return <HoverHint key={JSON.stringify(c)} label={label} content={reason||detail}><button disabled={pending||!!reason} onClick={()=>send(c)}><ArtIcon name="army" size={24}/><span>{label}</span></button></HoverHint>;};
 return <section className="army-organization"><nav className="detail-tabs" aria-label="役制">{(['levy','standing'] as const).map(id=><button key={id} aria-pressed={service===id} onClick={()=>setService(id)}><ArtIcon name={id==='levy'?'person':'army'}/>{id==='levy'?'征发':'常备'}</button>)}</nav><div className="city-policy-grid">{(Object.keys(troopKinds) as TroopKind[]).map(kind=>{const d=troopKinds[kind];return button({type:'army',action:'raise',site,kind,service},d.name,`征募 200 人 · ${d.cost*(service==='standing'?2:1)} 公款 / 60 本城公粮；集训 ${service==='standing'?60:30} 日，期间照常发饷供粮；${service==='standing'?'常备月饷为同兵种征发的 1.5 倍':'征发军饷按兵种计算'}。攻击 ${d.attack}% / 防护 ${d.defence}%${kind==='siege'?'，围城速度加倍':''}`);})}</div>{armies.filter(a=>a.regiments?.length).map(a=><article key={a.id}><h4>第 {a.id} 军 · {a.troops} 人</h4>{(a.trainingUntil??0)>w.day&&<p>集训余 {a.trainingUntil!-w.day} 日</p>}<small>{accountName(a.payer??'central:'+a.realm)}供饷{a.arrears?` · 欠饷 ${a.arrears} 钱`:''}</small><div className="city-policy-grid">{a.regiments!.map(u=><div key={u.id}><strong>{troopKinds[u.kind].name} · {u.troops}</strong><small> {u.service==='standing'?'常备':'征发'}</small>{button({type:'army',action:'split',army:a.id!,regiment:u.id},'分军','兵团独立编军，按人数比例分配随军粮与欠饷。')}</div>)}{armies.filter(b=>b!==a).map(b=>button({type:'army',action:'merge',army:a.id!,target:b.id!},`合并第 ${b.id} 军`, '同城军伍整编，所有兵员、随军粮和欠饷合并；不可超出容量。'))}</div></article>)}{w.realm.armyDebts?.filter(d=>d.realm===playerRealm(w)).map(d=><p key={d.account}>待偿军饷 · {accountName(d.account)} · {d.coins} 钱</p>)}</section>;
}

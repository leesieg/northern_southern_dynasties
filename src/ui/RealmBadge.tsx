import {createContext,useContext} from 'react';
import {RealmFlag} from './RealmFlag';
import {regimeName} from '../core/government';
import type {RealmId} from '../core/realm';
import type {World,Polity} from '../core/types';
import './realmBadge.css';
export const RealmNavigation=createContext<{world?:World;open:(realm:RealmId)=>void}|null>(null);
export function RealmBadge({realm,world,name,onOpen,seal=false}:{realm:Polity;world?:World;name?:string;onOpen?:(realm:RealmId)=>void;seal?:boolean}){
 const navigation=useContext(RealmNavigation),w=world??navigation?.world,label=name??regimeName(w,realm),open=onOpen??navigation?.open;
 return <button type="button" className={"realm-badge-link"+(seal?" realm-badge-seal":"")} aria-label={label+' · 国家详情'} title={realm==='frontier'?'周边地区，尚无统一国家档案':label+' · 查看国家详情'} disabled={realm==='frontier'||!open} onClick={event=>{event.stopPropagation();if(realm!=='frontier')open?.(realm);}}>{seal?<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#492e28" stroke="#c1a064" strokeWidth="2"/><circle cx="50" cy="50" r="42" fill="none" stroke="#b7955c" strokeDasharray="2 2" strokeWidth="3"/><circle cx="50" cy="50" r="37" fill="none" stroke="#927040"/><path d="m22 31 5-6 5 6m36 0 5-6 5 6M27 72q23 13 46 0" fill="none" stroke="#bc965c"/><text x="50" y="66" textAnchor="middle" fill="#e6cc91" fontFamily="STKaiti,KaiTi,serif" fontSize={label.length===1||['东魏','西魏','北齐','北周'].includes(label)?48:Math.max(16,64/label.length)}>{['东魏','西魏','北齐','北周'].includes(label)?label.slice(1):label}</text>{['东魏','西魏','北齐','北周'].includes(label)&&<text x="50" y="23" textAnchor="middle" fill="#e6cc91" fontSize="10">{label[0]}</text>}</svg>:<RealmFlag realm={realm} world={w} name={name} compact showLabel={false}/>}</button>;
}

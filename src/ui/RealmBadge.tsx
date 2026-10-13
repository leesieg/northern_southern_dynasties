import {createContext,useContext} from 'react';
import {RealmFlag} from './RealmFlag';
import {regimeName} from '../core/government';
import type {RealmId} from '../core/realm';
import type {World,Polity} from '../core/types';
import './realmBadge.css';
export const RealmNavigation=createContext<{world?:World;open:(realm:RealmId)=>void}|null>(null);
export function RealmBadge({realm,world,name,onOpen,seal=false}:{realm:Polity;world?:World;name?:string;onOpen?:(realm:RealmId)=>void;seal?:boolean}){
 const navigation=useContext(RealmNavigation),w=world??navigation?.world,label=name??regimeName(w,realm),open=onOpen??navigation?.open;
 return <button type="button" className={"realm-badge-link"+(seal?" realm-badge-seal":"")} aria-label={label+' · 国家详情'} title={realm==='frontier'?'周边地区，尚无统一国家档案':label+' · 查看国家详情'} disabled={realm==='frontier'||!open} onClick={event=>{event.stopPropagation();if(realm!=='frontier')open?.(realm);}}>{<RealmFlag realm={realm} world={w} name={name} compact showLabel={false}/>}</button>;
}

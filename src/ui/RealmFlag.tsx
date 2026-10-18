import {realmBanner} from '../core/polityRuntime';
import { useId } from 'react';
import { regimeName } from '../core/government';
import type { Polity,World } from '../core/types';
import './realmFlag.css';

import {bannerSvg} from './heraldry';
export function RealmFlag({realm,world,name,compact=false,showLabel=true}:{realm:Polity;world?:World;name?:string;compact?:boolean;showLabel?:boolean}){
 const id=useId().replace(/:/g,''),label=name??regimeName(world,realm);
 return <span className={`realm-flag${compact?' compact':''}`} role="img" aria-label={label}><span className="realm-flag-art" dangerouslySetInnerHTML={{__html:bannerSvg(label,realmBanner(world,realm),'flag-'+id)}}/>{showLabel&&<span className="realm-flag-name">{label}</span>}</span>;
}
export function RealmFlagButton({realm,world,name,selected,onClick,compact=false}:{realm:Polity;world?:World;name?:string;selected:boolean;onClick:()=>void;compact?:boolean}){
 const label=name??regimeName(world,realm);
 return <button type="button" className="realm-flag-button" aria-label={'选择'+label} aria-pressed={selected} onClick={onClick}><RealmFlag realm={realm} world={world} name={name} compact={compact}/><span className="realm-flag-check" aria-hidden="true">◆</span></button>;
}

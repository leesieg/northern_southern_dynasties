import {realmOrigin} from '../core/polityRuntime';
import { useId } from 'react';
import { regimeName } from '../core/government';
import type { Polity,World } from '../core/types';
import './realmFlag.css';

// Original game heraldry; colors retain the existing map affiliations.
const palettes={
 liang:{light:'#719184',cloth:'#294c40',dark:'#142d28'},
 east:{light:'#a38a9e',cloth:'#65465e',dark:'#342739'},
 west:{light:'#c2a06c',cloth:'#826039',dark:'#43311f'},
 frontier:{light:'#92978a',cloth:'#535e53',dark:'#2b352f'},
};
export function RealmFlag({realm,world,name,compact=false,showLabel=true}:{realm:Polity;world?:World;name?:string;compact?:boolean;showLabel?:boolean}){
 const id=useId().replace(/:/g,''),p=palettes[realmOrigin(world,realm)],label=name??regimeName(world,realm),regional=['东魏','西魏','北齐','北周'].includes(label),glyph=realm==='frontier'?'境':regional?label.slice(1):label;
 return <span className={`realm-flag${compact?' compact':''}`}>
 <svg viewBox="0 0 112 138" aria-hidden="true" focusable="false">
 <defs><linearGradient id={id+'-cloth'} x1="0" y1="0" x2="1" y2="0"><stop stopColor={p.dark}/><stop offset=".23" stopColor={p.cloth}/><stop offset=".48" stopColor={p.light}/><stop offset=".65" stopColor={p.cloth}/><stop offset="1" stopColor={p.dark}/></linearGradient><linearGradient id={id+'-gold'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f0d49b"/><stop offset=".5" stopColor="#b18c4d"/><stop offset="1" stopColor="#e2c181"/></linearGradient></defs>
 <path d="M19 16H95V129L58 114L21 129Z" fill="#071914" opacity=".45"/>
 <path d="M18 12H94V125L56 108L18 125Z" fill={`url(#${id}-cloth)`} stroke={`url(#${id}-gold)`} strokeWidth="2"/>
 <path d="M24 20H88V115L56 101L24 115Z" fill="none" stroke="#d8b877" strokeWidth=".8" opacity=".72"/>
 <path d="M35 19V104M76 19V104" stroke="#f4e5c5" opacity=".1"/>
 <path d="M26 25H37M26 25V36M86 25H75M86 25V36" fill="none" stroke="#dcc28b" strokeWidth="1.5"/>
 <path d="M10 12H102" stroke="#493b28" strokeWidth="6" strokeLinecap="round"/><path d="M10 10H102" stroke={`url(#${id}-gold)`} strokeWidth="3" strokeLinecap="round"/>
 <circle cx="8" cy="11" r="4" fill="#d7b779"/><circle cx="104" cy="11" r="4" fill="#d7b779"/>
 {realm==='liang'?<g fill="none" stroke="#e3ca92" strokeWidth="1.2"><path d="M36 91q10-9 20 0q10-9 20 0M38 96q9-7 18 0q9-7 18 0"/><path d="M56 83q-13-2-14-10q10-1 14 10q4-11 14-10q-1 8-14 10Z" opacity=".5"/></g>:realm==='east'?<g fill="none" stroke="#e3ca92" strokeWidth="1.2"><path d="M35 88l21 10 21-10M41 84l15 7 15-7"/><path d="M33 45l-4 7 4 7M79 45l4 7-4 7"/></g>:<g fill="none" stroke="#e3ca92" strokeWidth="1.2"><path d="M35 95h9v-6h7v-6h10v6h7v6h9M36 99h40"/><path d="M30 43h4v17h-4M82 43h-4v17h4"/></g>}
 {regional&&<text x="56" y="35" textAnchor="middle" fill="#ebd6a7" fontSize="12" fontFamily="serif">{label[0]}</text>}
 <text x="56" y={regional?70:66} textAnchor="middle" fill="#f1dfb1" stroke="#39291d" strokeWidth=".5" paintOrder="stroke" fontSize={glyph.length===1?37:Math.min(27,64/glyph.length)} fontFamily="STKaiti, KaiTi, Noto Serif SC, serif" fontWeight="600">{glyph}</text>
 <path d="M18 124v8m76-8v8" stroke="#c29d5c" strokeWidth="2"/>
 </svg>{showLabel&&<span className="realm-flag-name">{label}</span>}
 </span>;
}
export function RealmFlagButton({realm,world,name,selected,onClick,compact=false}:{realm:Polity;world?:World;name?:string;selected:boolean;onClick:()=>void;compact?:boolean}){
 const label=name??regimeName(world,realm);
 return <button type="button" className="realm-flag-button" aria-label={'选择'+label} aria-pressed={selected} onClick={onClick}><RealmFlag realm={realm} world={world} name={name} compact={compact}/><span className="realm-flag-check" aria-hidden="true">◆</span></button>;
}

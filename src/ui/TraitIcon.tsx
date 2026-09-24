import {useEffect,useId,useState} from 'react';
import {createPortal} from 'react-dom';
import {traitDefinitions,type Trait} from '../core/social';
import {ArtIcon} from './ArtIcon';
export function TraitIcon({trait}:{trait:Trait}){
 const t=traitDefinitions[trait],id=useId(),[position,setPosition]=useState<{left:number;top:number;width:number}|null>(null);
 const show=(element:HTMLElement)=>{const box=element.getBoundingClientRect(),width=Math.min(264,window.innerWidth-24);setPosition({left:Math.max(12,Math.min(box.left,window.innerWidth-width-12)),top:Math.max(12,Math.min(box.bottom+8,window.innerHeight-180)),width});};
 useEffect(()=>{if(!position)return;const close=()=>setPosition(null);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);};},[position]);
 return <><span className="trait-badge trait-icon-only" tabIndex={0} role="img" aria-label={t.name+'：'+t.effect} aria-describedby={position?id:undefined} onMouseEnter={e=>show(e.currentTarget)} onMouseLeave={e=>{if(document.activeElement!==e.currentTarget)setPosition(null);}} onFocus={e=>show(e.currentTarget)} onBlur={()=>setPosition(null)} onClick={e=>{e.stopPropagation();show(e.currentTarget);}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setPosition(null);}if(e.key==='Enter'||e.key===' '){e.preventDefault();show(e.currentTarget);}}}><ArtIcon name={trait} size={32}/></span>{position&&createPortal(<span className="trait-tooltip" role="tooltip" id={id} style={position}><strong>{t.name}</strong><span>{t.effect}</span></span>,document.body)}</>;
}

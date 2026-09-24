import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
export function HoverHint({children,content,label}:{children:ReactNode;content:ReactNode;label:string}){
 const id=useId(),timer=useRef<ReturnType<typeof setTimeout>|null>(null),[position,setPosition]=useState<{left:number;top:number;width:number}|null>(null);
 const keep=()=>{if(timer.current)clearTimeout(timer.current);};
 const hide=()=>{keep();timer.current=setTimeout(()=>setPosition(null),160);};
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!position)return;const close=()=>setPosition(null),escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();close();}};const scroll=(e:Event)=>{if(!(e.target instanceof Element&&e.target.closest('.diplomacy-tooltip')))close();};window.addEventListener('scroll',scroll,true);window.addEventListener('resize',close);window.addEventListener('keydown',escape,true);return()=>{window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',close);window.removeEventListener('keydown',escape,true);};},[position]);
 const show=(el:HTMLElement)=>{keep();const b=el.getBoundingClientRect(),width=Math.min(300,window.innerWidth-24);setPosition({width,left:Math.max(12,Math.min(b.left,window.innerWidth-width-12)),top:Math.max(12,Math.min(b.bottom+6,window.innerHeight-260))});};
 return <span className="hover-hint" tabIndex={0} aria-label={label} aria-describedby={position?id:undefined} onMouseEnter={e=>show(e.currentTarget)} onMouseLeave={hide} onFocus={e=>show(e.currentTarget)} onBlur={hide}>{children}{position&&createPortal(<div id={id} role="tooltip" className="diplomacy-tooltip" style={position} onMouseEnter={keep} onMouseLeave={hide}>{content}</div>,document.body)}</span>;
}

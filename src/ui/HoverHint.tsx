import {cloneElement,isValidElement,useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
function hasVisibleText(node:ReactNode):boolean{
 if(typeof node==='string'||typeof node==='number')return String(node).trim().length>0;
 if(Array.isArray(node))return node.some(hasVisibleText);
 return isValidElement<{children?:ReactNode}>(node)&&hasVisibleText(node.props.children);
}
export function HoverHint({children,content,label}:{children:ReactNode;content:ReactNode;label:string}){
 const id=useId(),anchor=useRef<HTMLSpanElement>(null),tip=useRef<HTMLDivElement>(null),[open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12,width:300,maxHeight:240});
 useLayoutEffect(()=>{if(!open||!anchor.current||!tip.current)return;const b=anchor.current.getBoundingClientRect(),width=Math.min(300,window.innerWidth-24),height=Math.min(tip.current.scrollHeight,window.innerHeight-24),right=window.innerWidth-b.right-12,left=b.left-12,below=window.innerHeight-b.bottom-12,above=b.top-12;let x=b.left,y=b.bottom+8,maxHeight=height;
  if(right>=width+8){x=b.right+8;y=b.top;}else if(left>=width+8){x=b.left-width-8;y=b.top;}else if(below>=height+8){y=b.bottom+8;}else if(above>=height+8){y=b.top-height-8;}else if(below>=above){y=b.bottom+8;maxHeight=Math.max(0,below-8);}else{maxHeight=Math.max(0,above-8);y=12;}
  setPosition({width,left:Math.max(12,Math.min(x,window.innerWidth-width-12)),top:Math.max(12,Math.min(y,window.innerHeight-maxHeight-12)),maxHeight});
 },[open,content]);
 useEffect(()=>{if(!open)return;const close=()=>setOpen(false),escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};window.addEventListener('scroll',close,true);window.addEventListener('resize',close);window.addEventListener('pointerdown',close,true);window.addEventListener('keydown',escape,true);return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);window.removeEventListener('pointerdown',close,true);window.removeEventListener('keydown',escape,true);};},[open]);
 const child=isValidElement<{children?:ReactNode;'aria-label'?:string;'aria-describedby'?:string;disabled?:boolean}>(children)?children:null;
 const interactive=!!child&&typeof child.type==='string'&&['button','a','input','select','textarea','summary'].includes(child.type);
 const focusable=interactive&&!child?.props.disabled;
 const describedBy=[child?.props['aria-describedby'],open?id:null].filter(Boolean).join(' ')||undefined;
 const trigger=interactive&&child?cloneElement(child,{'aria-label':child.props['aria-label']??(hasVisibleText(child.props.children)?undefined:label),'aria-describedby':describedBy}):children;
 return <span ref={anchor} className="hover-hint" tabIndex={focusable?undefined:0} aria-label={focusable?undefined:label} aria-disabled={interactive&&child?.props.disabled||undefined} aria-describedby={!focusable&&open?id:undefined} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false);}}>{trigger}{open&&createPortal(<div ref={tip} id={id} role="tooltip" className="diplomacy-tooltip" style={{...position,pointerEvents:'none'}}>{content}</div>,anchor.current?.closest('dialog')??document.body)}</span>;
}

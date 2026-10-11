import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

/** Map markers are imperative DOM; share the game's hint skin and keyboard behavior. */
export function MapHintLayer(){
 const id=useId(),tip=useRef<HTMLDivElement>(null),[target,setTarget]=useState<HTMLElement|null>(null),[pinned,setPinned]=useState(false),[position,setPosition]=useState({left:12,top:12});
 const text=target?.isConnected?target.dataset.gameHint:undefined;
 useEffect(()=>{if(target&&!text){setTarget(null);setPinned(false);}},[target,text]);
 useEffect(()=>{
  const trigger=(value:EventTarget|null)=>value instanceof Element?value.closest<HTMLElement>('[data-game-hint]'):null;
  const show=(e:Event)=>{const next=trigger(e.target);if(next&&(!pinned||!target?.isConnected)){if(!target?.isConnected)setPinned(false);setTarget(next);}};
  const leave=(e:MouseEvent|FocusEvent)=>{if(pinned||trigger(e.relatedTarget)===target||e.relatedTarget instanceof Node&&tip.current?.contains(e.relatedTarget))return;if(trigger(e.target)===target)setTarget(null);};
  const close=()=>{setTarget(null);setPinned(false);};
  const keys=(e:KeyboardEvent)=>{if(e.key==='Escape')close();else if(e.key==='F2'&&target){e.preventDefault();setPinned(true);requestAnimationFrame(()=>tip.current?.focus());}};
  const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!target?.contains(e.target)&&!tip.current?.contains(e.target))close();};
  document.addEventListener('pointerover',show);document.addEventListener('focusin',show);document.addEventListener('pointerout',leave);document.addEventListener('focusout',leave);document.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
  return()=>{document.removeEventListener('pointerover',show);document.removeEventListener('focusin',show);document.removeEventListener('pointerout',leave);document.removeEventListener('focusout',leave);document.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};
 },[target,pinned]);
 useLayoutEffect(()=>{if(!target||!text)return;const rect=target.getBoundingClientRect(),height=tip.current?.offsetHeight??80,width=tip.current?.offsetWidth??300;setPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top:rect.bottom+height+12>window.innerHeight?Math.max(12,rect.top-height-8):rect.bottom+8});const previous=target.getAttribute('aria-describedby');target.setAttribute('aria-describedby',[previous,id].filter(Boolean).join(' '));return()=>{if(previous)target.setAttribute('aria-describedby',previous);else target.removeAttribute('aria-describedby');};},[target,text,id]);
 if(!target||!text)return null;
 return createPortal(<div ref={tip} id={id} role={pinned?'region':'tooltip'} aria-label={pinned?'地图与操作说明':undefined} tabIndex={pinned?0:undefined} className={'diplomacy-tooltip game-hint map-game-hint'+(pinned?' is-pinned':'')} style={{...position,position:'fixed',width:'min(320px,calc(100vw - 24px))',maxHeight:'calc(100vh - 24px)',overflowY:'auto',whiteSpace:'pre-line',pointerEvents:'auto'}} onPointerLeave={()=>{if(!pinned)setTarget(null);}}><div className="hint-copy">{text}</div><button type="button" className="hint-pin-button" aria-label={pinned?'关闭说明':'固定说明'} aria-keyshortcuts="F2" aria-pressed={pinned} onClick={()=>{if(pinned){setPinned(false);setTarget(null);target.focus({preventScroll:true});}else{setPinned(true);requestAnimationFrame(()=>tip.current?.focus());}}}>{pinned?'×':'⌑'}</button></div>,target.closest('dialog')??document.body);
}

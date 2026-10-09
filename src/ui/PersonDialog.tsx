import {useEffect,useRef,type ReactNode} from 'react';
import './personDialog.css';

/** Native modal owns focus/inertness; action dialogs can open above it. */
export function PersonDialog({personKey,onClose,onBack,children}:{personKey:string;onClose:()=>void;onBack?:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{if(dialog.open)dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
 useEffect(()=>{close.current?.focus({preventScroll:true});},[personKey]);
 return <dialog ref={ref} className="person-ink-dialog" aria-label="人物详情" onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}>
  <div className="person-window-chrome">
   {onBack&&<button type="button" aria-label="返回上页" onClick={onBack}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4-8 8 8 8"/></svg></button>}
   <button ref={close} type="button" autoFocus aria-label="关闭人物详情" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg></button>
  </div>
  {children}
 </dialog>;
}

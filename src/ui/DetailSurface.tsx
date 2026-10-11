import {useEffect,useRef,type HTMLAttributes} from 'react';
import {useDialogDismiss} from './useDialogDismiss';
/** Preserve each scene's skin while native dialogs own focus and background isolation. */
export function DetailSurface({modal,onClose,children,...props}:HTMLAttributes<HTMLElement>&{modal:boolean;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const dismiss=useDialogDismiss(ref,onClose);
 useEffect(()=>{if(!modal)return;const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[modal]);
 if(!modal)return <section {...props}>{children}</section>;
 return <dialog {...props} ref={ref} onClickCapture={e=>{if(e.target instanceof Element&&e.target.closest('[aria-label="关闭窗口"]')){e.preventDefault();e.stopPropagation();dismiss();}}} onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();dismiss();}} onKeyDown={e=>e.stopPropagation()}>{children}</dialog>;
}

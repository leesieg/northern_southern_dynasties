import {useDialogDismiss} from './useDialogDismiss';
import {useEffect,useId,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './actionDialog.css';
import {DialogArt,type DialogScene} from './DialogArt';

export function ActionDialog({title,children,actions,onClose,className='',cancelLabel='取消',scene='court',art,heading}:{title:string;children:ReactNode;actions:ReactNode;onClose:()=>void;className?:string;cancelLabel?:string;scene?:'court'|'landscape';art?:DialogScene;heading?:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId();
 const dismiss=useDialogDismiss(ref,onClose);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{if(dialog.open)dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 if(typeof document==='undefined')return null;
 return createPortal(<dialog ref={ref} data-scene={scene} data-art={art} className={'action-detail-dialog paper-dialog '+className} aria-labelledby={titleId} onCancel={e=>{if(e.target!==e.currentTarget)return;e.preventDefault();dismiss();}} onKeyDown={e=>e.stopPropagation()}>
  <header>{art&&<DialogArt scene={art} className="dialog-heading-art"/>}<div className="dialog-heading-copy"><h2 id={titleId} aria-label={title}>{title}</h2>{heading}</div><button type="button" aria-label="关闭交互弹窗" onClick={dismiss}>×</button></header>
  <div className="action-detail-body">{children}</div>
  <footer>{art&&<DialogArt scene={art} className="dialog-footer-art"/>}<button type="button" onClick={dismiss}>{cancelLabel}</button>{actions}</footer>
 </dialog>,document.body);
}

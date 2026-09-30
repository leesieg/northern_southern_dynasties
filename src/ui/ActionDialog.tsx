import {useEffect,useId,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './actionDialog.css';

export function ActionDialog({title,children,actions,onClose,className='',cancelLabel='取消'}:{title:string;children:ReactNode;actions:ReactNode;onClose:()=>void;className?:string;cancelLabel?:string}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId();
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{if(dialog.open)dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 if(typeof document==='undefined')return null;
 return createPortal(<dialog ref={ref} className={'action-detail-dialog paper-dialog '+className} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}>
  <header><h2 id={titleId}>{title}</h2><button type="button" aria-label="关闭交互弹窗" onClick={onClose}>×</button></header>
  <div className="action-detail-body">{children}</div>
  <footer><button type="button" onClick={onClose}>{cancelLabel}</button>{actions}</footer>
 </dialog>,document.body);
}

import {useEffect,useId,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './confirmAction.css';

export function ConfirmAction({title,detail,confirmLabel,onConfirm,onCancel,pending=false,danger=false}:{title:string;detail:ReactNode;confirmLabel:string;onConfirm:()=>void;onCancel:()=>void;pending?:boolean;danger?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId(),detailId=useId();
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(!dialog)return;dialog.showModal();return()=>{if(dialog.open)dialog.close();previous?.focus();};},[]);
 if(typeof document==='undefined')return null;
 return createPortal(<dialog ref={ref} className="action-confirm-dialog paper-dialog" role={danger?'alertdialog':'dialog'} aria-labelledby={titleId} aria-describedby={detailId} onCancel={e=>{e.preventDefault();onCancel();}} onKeyDown={e=>e.stopPropagation()}>
  <h2 id={titleId}>{title}</h2><div id={detailId} className="action-confirm-detail">{detail}</div>
  <footer><button autoFocus onClick={onCancel}>取消</button><button className={danger?'danger':'primary'} disabled={pending} onClick={onConfirm}>{confirmLabel}</button></footer>
 </dialog>,document.body);
}

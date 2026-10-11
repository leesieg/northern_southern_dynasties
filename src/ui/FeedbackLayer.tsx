import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useActionFeedback,dismissFeedback} from './actionFeedback';
import {LoadingMark} from './LoadingMark';
export function FeedbackLayer({notice,onDismiss}:{notice:{text:string;error?:boolean}|null;onDismiss:()=>void}){
 const feedback=useActionFeedback(),[host,setHost]=useState<HTMLElement|null>(null),[slow,setSlow]=useState(false);
 useEffect(()=>{const sync=()=>{const dialogs=[...document.querySelectorAll<HTMLElement>('dialog[open]')];const focused=document.activeElement?.closest<HTMLElement>('dialog[open]');setHost(focused??dialogs.at(-1)??document.body);};sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});document.addEventListener('focusin',sync);return()=>{observer.disconnect();document.removeEventListener('focusin',sync);};},[]);
 useEffect(()=>{setSlow(false);if(feedback?.state!=='pending')return;const timer=setTimeout(()=>setSlow(true),5000);return()=>clearTimeout(timer);},[feedback?.id,feedback?.state]);
 useEffect(()=>{if(feedback?.state!=='success')return;const timer=setTimeout(dismissFeedback,3200);return()=>clearTimeout(timer);},[feedback]);
 if(!host||!feedback&&!notice)return null;
 const error=feedback?.state==='error'||notice?.error;
 return createPortal(<div className={'game-feedback '+(host.tagName==='DIALOG'?'is-in-dialog ':'')+(error?'is-error':'')} role={error?'alert':'status'} aria-live={error?'assertive':'polite'}>{feedback?.state==='pending'?<LoadingMark compact label={feedback.label} detail={slow?'保存用时较长，正在等待明确结果；请勿重复提交':feedback.text}/>:<><span className="feedback-seal" aria-hidden="true">{error?'!':'✓'}</span><div><strong>{feedback?.label??(error?'未能完成':'行记')}</strong><p>{feedback?.state==='error'?feedback.text:notice?.text??feedback?.text}</p></div><button aria-label="关闭提示" onClick={()=>{dismissFeedback();onDismiss();}}>×</button></>}</div>,host);
}

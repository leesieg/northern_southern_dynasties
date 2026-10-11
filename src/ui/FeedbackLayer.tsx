import {useCampaignLoad} from './campaignLoad';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useActionFeedback,dismissFeedback} from './actionFeedback';
import {LoadingMark} from './LoadingMark';
export function FeedbackLayer({notice,onDismiss}:{notice:{text:string;error?:boolean}|null;onDismiss:()=>void}){
 const campaignLoad=useCampaignLoad(),feedback=useActionFeedback(),[host,setHost]=useState<HTMLElement|null>(null),[slow,setSlow]=useState(false),[pendingVisible,setPendingVisible]=useState(false);
 useEffect(()=>{const sync=()=>{const dialogs=[...document.querySelectorAll<HTMLElement>('dialog[open]')];const focused=document.activeElement?.closest<HTMLElement>('dialog[open]');setHost(focused??dialogs.at(-1)??document.body);};sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});document.addEventListener('focusin',sync);return()=>{observer.disconnect();document.removeEventListener('focusin',sync);};},[]);
 useEffect(()=>{setPendingVisible(false);if(feedback?.state!=='pending')return;const timer=setTimeout(()=>setPendingVisible(true),250);return()=>clearTimeout(timer);},[feedback?.id,feedback?.state]);
 useEffect(()=>{setSlow(false);if(feedback?.state!=='pending')return;const timer=setTimeout(()=>setSlow(true),5000);return()=>clearTimeout(timer);},[feedback?.id,feedback?.state]);
 useEffect(()=>{if(campaignLoad||feedback?.state==='pending'||feedback?.state==='error'||notice?.error||!feedback&&!notice)return;const timer=setTimeout(()=>{dismissFeedback();onDismiss();},notice?5000:2400);return()=>clearTimeout(timer);},[campaignLoad,feedback,notice,onDismiss]);
 if(campaignLoad||!host||!feedback&&!notice||feedback?.state==='pending'&&!pendingVisible)return null;
 const error=feedback?.state==='error'||notice?.error;
 return createPortal(<div className={'game-feedback '+(host.tagName==='DIALOG'?'is-in-dialog ':'')+(error?'is-error':feedback?.state==='pending'?'is-pending':'is-quiet')} role={error?'alert':'status'} aria-live={error?'assertive':'polite'}>{feedback?.state==='pending'?<LoadingMark compact label={feedback.label} detail={slow?'保存用时较长，正在等待明确结果；请勿重复提交':feedback.text}/>:<><span className="feedback-seal" aria-hidden="true">{error?'止':'记'}</span><div>{error&&<strong>{feedback?.label??'未能完成'}</strong>}<p>{feedback?.state==='error'?feedback.text:notice?.text??(feedback?.text==='操作已完成'?feedback.label+' · 已受理':feedback?.text)}</p></div><button aria-label="关闭提示" onClick={()=>{dismissFeedback();onDismiss();}}>×</button></>}</div>,host);
}

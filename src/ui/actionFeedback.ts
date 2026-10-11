import {useSyncExternalStore} from 'react';
export interface ActionFeedback {id:string;state:'pending'|'success'|'error';label:string;text:string;owner:HTMLElement|null;started:number}
let feedback:ActionFeedback|null=null;
const listeners=new Set<()=>void>();
function update(next:ActionFeedback|null){feedback=next;listeners.forEach(fn=>fn());}
export const subscribeFeedback=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const getFeedback=()=>feedback;
export const useActionFeedback=()=>useSyncExternalStore(subscribeFeedback,getFeedback,()=>null);
export function beginFeedback(id:string,label:string){const active=document.activeElement;update({id,state:'pending',label,text:'正在办理并保存，请稍候',owner:active instanceof Element?active.closest<HTMLElement>('dialog,[role="dialog"]'):null,started:Date.now()});}
export function finishFeedback(id:string,ok:boolean,text?:string){if(feedback?.id===id)update({...feedback,state:ok?'success':'error',text:text??(ok?'操作已完成':'未能完成，请检查条件后重试')});}
export function dismissFeedback(){if(feedback?.state!=='pending')update(null);}
export function pendingIn(node:HTMLElement|null){return feedback?.state==='pending'&&!!node&&(!feedback.owner||feedback.owner===node||node.contains(feedback.owner));}
/** Callers with void signatures may still forward the worker's Promise. Never close on an unconfirmed result. */
export async function afterCommand(result:unknown,onSuccess:()=>void){if(await result!==true)return false;onSuccess();return true;}

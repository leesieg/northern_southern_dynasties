import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {OngoingTarget} from '../core/ongoing';
import {ambitionView,ambitionCandidates,ambitionNames,ambitionGoal,ambitionReason,AMBITION_REWARD_TEXT,AMBITION_ABANDON_TEXT,type AmbitionKind} from '../core/ambitions';
import {SingleChoiceCards} from './SingleChoiceCards';
import {ConfirmAction} from './ConfirmAction';
import {ActionDialog} from './ActionDialog';
import {afterCommand} from './actionFeedback';
import './ambition.css';

export function AmbitionDialog({world:w,mode,onClose,onMode,onTarget,pending,send}:{world:World;mode:'view'|'choose';onClose:()=>void;onMode:(mode:'view'|'choose')=>void;onTarget:(target:OngoingTarget)=>void;pending:boolean;send:(command:GameCommand)=>Promise<boolean>}){
 const view=ambitionView(w),candidates=ambitionCandidates(w),[draft,setDraft]=useState<AmbitionKind|null>(candidates[0]?.kind??null),[confirmAbandon,setConfirmAbandon]=useState(false),[error,setError]=useState('');
 const chooseReason=(kind:AmbitionKind)=>ambitionReason(w,{type:'ambition',action:'choose',kind});
 const submit=()=>{if(!draft||pending)return;const reason=chooseReason(draft);if(reason){setError(reason);return;}void afterCommand(send({type:'ambition',action:'choose',kind:draft}),onClose);};
 const toChoose=()=>{setError('');onMode('choose');};
 const actions=mode==='view'?(view?<><button onClick={toChoose}>更换志向</button><button className="danger" onClick={()=>setConfirmAbandon(true)}>放弃志向</button></>:<button className="primary" onClick={toChoose}>立新志</button>)
  :candidates.length?<button className="primary" disabled={pending||!draft||!!(draft&&chooseReason(draft))} onClick={submit}>{w.ambitions?.people[w.characterId!]?.active?'改立为 '+(draft?ambitionNames[draft]:'')+'（原志向进度清零）':'立志'}</button>:null;
 return <ActionDialog className="ambition-dialog" title={mode==='view'?'志向 · '+(view?.title??'立志'):'立新志'} cancelLabel="关闭" onClose={onClose} actions={actions}>
  {mode==='view'&&view&&<>
   <progress className="ambition-progress" max={1} value={view.progress} aria-label={'志向进度 '+Math.round(view.progress*100)+'%'}/>
   <ol className="ambition-steps">{view.steps.map((step,i)=><li key={i} className={step.done?'done':step.current?'current':''}><div><strong>{step.label}</strong>{step.detail&&<small>{step.detail}</small>}</div><span>{step.done?'已成':step.current?'进行中':'未开始'}</span>{step.target&&<button onClick={()=>{onClose();onTarget(step.target!);}}>前往</button>}</li>)}</ol>
   <p className="ambition-reward">达成奖励：{AMBITION_REWARD_TEXT}</p>
  </>}
  {mode==='view'&&!view&&<p>当前没有进行中的志向。</p>}
  {mode==='choose'&&(candidates.length?<>
   <SingleChoiceCards label="一生所求 · 单选" value={draft} onChange={setDraft} disabled={pending} options={candidates.map(c=>({id:c.kind,title:ambitionNames[c.kind],description:ambitionGoal[c.kind],detail:<><small>当前：{c.reason}</small><small>达成奖励：{AMBITION_REWARD_TEXT}</small><small>放弃代价：{AMBITION_ABANDON_TEXT}</small></>,reason:c.cooldown}))}/>
   {error&&<p role="status" className="ambition-error">{error}</p>}
  </>:<p>当前身份暂无可立之志。</p>)}
  {confirmAbandon&&<ConfirmAction title="放弃当前志向？" detail={'放弃后'+AMBITION_ABANDON_TEXT+'。'} confirmLabel="放弃志向" danger pending={pending} onCancel={()=>setConfirmAbandon(false)} onConfirm={()=>{if(pending)return;void afterCommand(send({type:'ambition',action:'abandon'}),()=>{setConfirmAbandon(false);onClose();});}}/>}
 </ActionDialog>;
}

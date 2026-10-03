import {allPeople} from '../core/personRegistry';
import {ActionDialog} from './ActionDialog';
import {useEffect,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {householdReason,type HouseholdCommand,type TaughtSkill} from '../core/householdPlans';
import {attributes} from '../core/social';
import {politicalName} from '../core/government';
import {PersonChoice} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
import {CommandButton} from './CommandButton';
export function HouseholdPlansPanel({world:w,target,pending,send}:{world:World;target:string;pending:boolean;send:(c:GameCommand)=>void}){
 const [teacher,setTeacher]=useState(''),[skill,setSkill]=useState<TaughtSkill>('stewardship'),[action,setAction]=useState<'educate'|'dowry'|'loan'|'cancel'|null>(null),[course,setCourse]=useState(0);
 useEffect(()=>{setAction(null);setTeacher('');},[target]);
 const command:HouseholdCommand=action==='cancel'?{type:'household',action:'cancel',id:course}:action==='loan'||action==='dowry'?{type:'household',action,target}:{type:'household',action:'educate',target,teacher,skill};
 const labels={educate:'出资延师',dowry:'交付家资',loan:'家用借款',cancel:'结束培养'},details={educate:'首期学资 30 私钱，之后每月 1 日向教师结算 30 私钱；整期未授课不续费。每 90 个有效受教日对应能力 +1，最多 +3，异地或忙于公务不计进度。',dowry:'向当前配偶转交 100 私钱，本对配偶仅一次；双方好感 +5。',loan:'借出 100 私钱给配偶或后代，每月 1 日从借款人实际私财偿还最多 50，无息，缺钱顺延。',cancel:'停止后续培养和续费；已付学资不退，已完成成长保留。'};
 const reason=householdReason(w,command);
 return <section className="career-systems"><h4><ArtIcon name="estate" size={24}/>培养与家业</h4><div className="city-policy-grid">{(['educate','dowry','loan'] as const).map(a=>{const why=a==='educate'?'':householdReason(w,{type:'household',action:a,target});return <CommandButton key={a} label={labels[a]} icon={a==='educate'?'diligent':'coins'} pending={pending} reason={why} selected={action===a} hint={details[a]} onClick={()=>setAction(a)}/>;})}</div>
 {action&&<ActionDialog title={labels[action]+' · '+politicalName(target,w)} scene="landscape" onClose={()=>setAction(null)} actions={<button className="primary" disabled={pending||!!reason} onClick={()=>{if(!householdReason(w,command)){send(command);setAction(null);}}}>确认安排</button>}><p>{details[action]}</p>{action==='educate'&&<><fieldset><legend>培养方向</legend>{(['stewardship','martial','diplomacy'] as const).map(s=><label key={s}><input type="radio" name="teaching-skill" checked={skill===s} onChange={()=>{setSkill(s);setTeacher('');}}/>{({stewardship:'管理',martial:'军事',diplomacy:'交游'})[s]}</label>)}</fieldset><PersonChoice world={w} title="授业师长" value={teacher} onChange={setTeacher} pending={pending} options={allPeople(w).map(p=>({id:p.id,score:attributes(w,p.id)[skill],metric:'授业能力',reason:householdReason(w,{type:'household',action:'educate',target,teacher:p.id,skill})}))}/></>}{reason&&<p role="status">{reason}</p>}</ActionDialog>}
 {w.householdPlans?.tuition.filter(t=>t.student===target&&t.payer===w.characterId&&t.status==='active').map(t=><article key={t.id}>{politicalName(t.teacher,w)} · 已受教 {t.completed} 期 · 已付 {t.paid} 钱<p>{t.reason}</p><button disabled={pending} onClick={()=>{setCourse(t.id);setAction('cancel');}}><ArtIcon name="diligent" size={22}/>结束培养</button></article>)}</section>;
}

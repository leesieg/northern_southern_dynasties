import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {householdReason,type HouseholdCommand,type TaughtSkill} from '../core/householdPlans';
import {relationshipPeople} from '../data/relationships';
import {attributes} from '../core/social';
import {politicalName} from '../core/government';
import {PersonChoice} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {DetailTabs} from './DetailTabs';
export function HouseholdPlansPanel({world:w,target,pending,send}:{world:World;target:string;pending:boolean;send:(c:GameCommand)=>void}){
 const [teacher,setTeacher]=useState(''),[skill,setSkill]=useState<TaughtSkill>('stewardship'),[confirm,setConfirm]=useState<HouseholdCommand|null>(null);
 const command:HouseholdCommand={type:'household',action:'educate',target,teacher,skill};
 const options=[{c:command,label:'出资延师',detail:'每三十个同城受教日付教师 30 私钱，每三期对应能力 +1，最多 +3。出行顺延，不按空过的日期增长。'}, {c:{type:'household',action:'dowry',target} as HouseholdCommand,label:'交付家资',detail:'向当前配偶转交 100 私钱，本段婚姻仅一次；双方好感 +5。'}, {c:{type:'household',action:'loan',target} as HouseholdCommand,label:'家用借款',detail:'借出 100 私钱给配偶或后代，每三十日从借款人实际私财偿还最多 50，无息，缺钱顺延。'}];
 return <section className="career-systems"><h4><ArtIcon name="estate" size={24}/>培养与家业</h4><DetailTabs label="培养方向" value={skill} onChange={setSkill} items={[{id:'stewardship',label:'管理',icon:'coins'},{id:'martial',label:'军事',icon:'army'},{id:'diplomacy',label:'交游',icon:'person'}]}/><PersonChoice world={w} title="授业师长" value={teacher} onChange={setTeacher} pending={pending} options={relationshipPeople.map(p=>({id:p.id,score:attributes(w,p.id)[skill],metric:'授业能力',reason:householdReason(w,{...command,teacher:p.id})}))}/><div className="city-policy-grid">{options.map(o=><HoverHint key={o.c.action} label={o.label} content={<>{o.detail}<p>{householdReason(w,o.c)}</p></>}><button disabled={pending||!!householdReason(w,o.c)} onClick={()=>setConfirm(o.c)}><ArtIcon name={o.c.action==='educate'?'diligent':'coins'} size={26}/>{o.label}</button></HoverHint>)}</div>{confirm&&<div className="diplomacy-decision"><p>{options.find(o=>o.c.action===confirm.action)?.detail}</p><button disabled={pending||!!householdReason(w,confirm)} onClick={()=>{send(confirm);setConfirm(null);}}>确认</button><button onClick={()=>setConfirm(null)}>取消</button></div>}{w.householdPlans?.tuition.filter(t=>t.student===target&&t.payer===w.characterId&&t.status==='active').map(t=><article key={t.id}>{politicalName(t.teacher)} · 已受教 {t.completed} 期 · 已付 {t.paid} 钱<p>{t.reason}</p><button disabled={pending} onClick={()=>send({type:'household',action:'cancel',id:t.id})}><ArtIcon name="diligent" size={22}/>结束培养</button></article>)}</section>;
}

import {afterCommand} from './actionFeedback';
import type {PersonLifeEntry} from '../core/ongoing';
import {CommandButton} from './CommandButton';
import {useContext,useEffect,useState} from 'react';
import type {World} from '../core/types';
import {getPerson} from '../core/personRegistry';
import {familyById} from '../data/families';
import {siteById} from '../data/scenario';
import {personResidence} from '../core/residence';
import {marriageSubjects,quoteFamilyMarriage,type FamilyMarriageCommand} from '../core/familyMarriage';
import {ActionDialog} from './ActionDialog';
import {PersonChoice} from './PersonSelection';
import {MarriageChoice} from './MarriageChoice';
import {RealmNavigation} from './RealmBadge';
export function FamilyMarriagePanel({world:w,id,entry,pending,send,partner}:{world:World;id:string;entry?:PersonLifeEntry|null;partner?:string;pending:boolean;send:(c:FamilyMarriageCommand)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[subject,setSubject]=useState(id),[target,setTarget]=useState(''),[coins,setCoins]=useState<50|100|200>(100),[family,setFamily]=useState('');
 useEffect(()=>{setOpen(entry?.action==='marriage');setSubject(id);setTarget('');setFamily('');},[id,entry]);
 const navigation=useContext(RealmNavigation);
 const subjects=marriageSubjects(w),a=getPerson(w,subject),b=getPerson(w,target),residence=personResidence(w,subject).site,chosenFamily=family||a?.family||'',command:FamilyMarriageCommand={type:'familyMarriage',subject,target,coins,residence,family:chosenFamily},quote=quoteFamilyMarriage(w,command);
 return <><CommandButton label="家族议婚" icon="renown" pending={pending} reason={!subjects.includes(id)?'只能为本人或在世成年直系子女议婚':''} hint="预览双方条件、实际婚资与子女家支，确认后成婚。" onClick={()=>{setSubject(id);setTarget(partner??'');setFamily('');setCoins(100);setOpen(true);}}/>{open&&<ActionDialog title="家族议婚" scene="landscape" onClose={()=>setOpen(false)} actions={<button className="primary" disabled={pending||!!quote.reason} onClick={()=>{if(pending||quoteFamilyMarriage(w,command).reason)return;void afterCommand(send(command),()=>{setOpen(false);});}}>确认成婚 · {coins} 私钱</button>}>
 <PersonChoice world={w} title="议婚本人" value={subject} onChange={value=>{setSubject(value);setTarget('');setFamily('');}} pending={pending} options={subjects.map(id=>({id}))}/>
 <MarriageChoice key={subject} world={w} command={command} value={target} onRealm={navigation?realm=>{setOpen(false);navigation.open(realm);}:undefined} onChange={value=>{setTarget(value);setFamily('');}} pending={pending}/>
 <fieldset><legend>婚资 · 由 {getPerson(w,w.characterId!)?.name} 私财付给拟议配偶</legend>{([50,100,200] as const).map(value=><label key={value}><input type="radio" name="marriage-coins" checked={coins===value} onChange={()=>setCoins(value)}/>{value} 钱</label>)}<p>全额转入配偶私财；金额不提高接受度。</p></fieldset>
 <fieldset><legend>婚后居所</legend><label><input type="radio" name="marriage-residence" checked readOnly/>{siteById[residence]?.name??residence} · 当前驻地</label><p>双方须已在此地，确认不改变真实位置。异地可先安排出行，再议婚。</p></fieldset>
 <fieldset><legend>未来子女家支</legend>{[...new Set([a?.family,b?.family].filter((f):f is string=>!!f))].map(value=><label key={value}><input type="radio" name="marriage-family" checked={chosenFamily===value} onChange={()=>setFamily(value)}/>{familyById[value]?.name??value}</label>)}<p>{subject===w.characterId?'本人婚后默认暂缓添丁，可在家庭安排中调整。':'成年子女婚后自主筹划添丁；条件满足才有孕，抚育生活费由双亲私财承担。'}</p><p>家支影响族谱与家业继承资格；选入另一家支的子女，不自动取得你的本家继承资格。婚姻不授予官职或国家盟约。</p></fieldset>
 {b&&<div className="city-policy-grid">{[{person:a,acceptance:quote.left},{person:b,acceptance:quote.right}].map(({person,acceptance})=><article key={person!.id}><strong>{person!.name}{person!.id===w.characterId?' · 本人意愿由确认表达':'接受度：'+acceptance.score+'／门槛 70'}</strong><p>{acceptance.parts.map(p=>p.label+' '+(p.value>=0?'+':'')+p.value).join(' · ')}</p></article>)}</div>}
 {quote.reason&&<p role="status">{quote.reason}</p>}
 </ActionDialog>}</>;
}

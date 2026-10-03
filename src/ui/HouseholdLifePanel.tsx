import type {PersonLifeEntry} from '../core/ongoing';
import {FamilyMarriagePanel} from './FamilyMarriagePanel';
import {marriageSubjects} from '../core/familyMarriage';
import {CommandButton} from './CommandButton';
import {HouseholdPlansPanel} from './HouseholdPlansPanel';
import {useEffect,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {familyGuardian,familyCommandReason,familyMomentSkill,familyChoiceLabels,familyMomentTitle,resting,type FamilyCommand,type FamilyMoment} from '../core/householdLife';
import {activeMarriage,spouseOf,maritalHarmony} from '../core/relationships';
import {getPerson,allPeople,relativesOf} from '../core/personRegistry';
import {familyById} from '../data/families';
import {ageLabel,isAlive,ageAt} from '../core/lifeState';
import {attributes} from '../core/social';
import {ActionDialog} from './ActionDialog';
import {ConfirmAction} from './ConfirmAction';
import {PersonChoice} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
import {CharacterPortrait} from './CharacterPortrait';

export function FamilyMomentChoice({world:w,event,pending,send}:{world:World;event:FamilyMoment;pending:boolean;send:(c:GameCommand)=>void}){
 const [choice,setChoice]=useState<'encourage'|'discipline'|'decline'>('decline'),[teacher,setTeacher]=useState('');
 const command:FamilyCommand={type:'familyLife',action:'resolve',id:event.id,choice,teacher},why=familyCommandReason(w,command),skill=familyMomentSkill(w,event.person);
 const descriptions=event.kind==='childhood'?{encourage:'善交特质；对你的好感 +5，日后擅长交游。',discipline:'勤勉特质；对你的好感 −3，督学也会带来疏离。',decline:'不预定特质与能力，保留现有培养。'}:event.kind==='aspiration'?{encourage:`希望研习${{stewardship:'管理',martial:'军事',diplomacy:'交游'}[skill]}。首期私钱 30，按现有课程付费、受教；不保证官职。`,discipline:'形成节俭特质，对你的好感 −5；不授予家产或官职。',decline:'不安排课程或官职，也不消耗私财。'}:event.kind==='inlaw'?{encourage:'本人私财实付给姻亲，对你的好感 +10。',discipline:'本人私财实付给姻亲，对你的好感 +4。',decline:'不转账，对你的好感 −3。'}:{encourage:'停止亲办事务 30 日，压力 −8；先交接公务与军职。',discipline:'继续原有事务，保留亲子关系与家产。',decline:'结束这次家事决定；再婚另由本人决定。'};
 return <section className="career-systems"><div className="family-person-heading"><CharacterPortrait characterId={event.person} name={getPerson(w,event.person)?.name??''} world={w} compact/><strong>{getPerson(w,event.person)?.name} · {familyMomentTitle[event.kind]}</strong></div><div role="radiogroup" aria-label="家事选择" className="city-policy-grid">{(['encourage','discipline','decline'] as const).map(value=><label key={value}><input type="radio" name={'family-moment-'+event.id} value={value} checked={choice===value} onChange={()=>setChoice(value)}/><strong>{familyChoiceLabels[event.kind][value]}</strong><p>{descriptions[value]}</p></label>)}</div>{event.kind==='aspiration'&&choice==='encourage'&&<PersonChoice world={w} title="授业师长" value={teacher} onChange={setTeacher} pending={pending} options={allPeople(w).map(p=>({id:p.id,score:attributes(w,p.id)[skill],metric:'授业能力',reason:familyCommandReason(w,{...command,teacher:p.id})}))}/>}{why&&<p role="status">{why}</p>}<button className="primary" disabled={pending||!!why} onClick={()=>{if(!familyCommandReason(w,command))send(command);}}>确认{familyChoiceLabels[event.kind][choice]}</button></section>;
}
export function HouseholdLifePanel({world:w,id,entry,pending,send}:{world:World;id:string;entry?:PersonLifeEntry|null;pending:boolean;send:(c:GameCommand)=>void}){
 const [open,setOpen]=useState(false),[trying,setTrying]=useState(false),[family,setFamily]=useState(''),[rest,setRest]=useState<FamilyCommand|null>(null);
 useEffect(()=>{setOpen(false);setRest(null);},[id]);
 const guardian=familyGuardian(w,id),young=(ageAt(w,id)??16)<16;
 const actor=w.characterId!,self=id===actor,spouse=spouseOf(w,id),marriage=activeMarriage(w,id),plan=marriage?w.householdLife?.plans[marriage.id]:undefined;
 const pregnancy=w.householdLife?.pregnancies.find(p=>p.status==='expecting'&&[p.father,p.mother].includes(id));
 const children=relativesOf(w,id,'descendants').filter(p=>isAlive(w,p.id));
 const events=w.householdLife?.moments.filter(e=>e.status==='pending'&&e.actor===actor&&(self||e.person===id))??[];
 const command:FamilyCommand={type:'familyLife',action:'plan',trying,family},why=familyCommandReason(w,command),restCommand:FamilyCommand={type:'familyLife',action:resting(w,id)?'resume':'rest'};
 return <section className="person-health"><h3><ArtIcon name="estate" size={26}/>家事与后代</h3>{young&&<p>家事监护：{guardian?getPerson(w,guardian)?.name:'暂无在世成年家属'}；只办理家事，不因此取得国政权限。</p>}{(self&&young&&(ageAt(w,id)??0)>=6||entry?.action==='education'||self&&w.householdPlans?.tuition.some(t=>t.payer===actor&&t.student===id&&t.status==='active'))&&<HouseholdPlansPanel world={w} target={id} entry={entry?.action==='education'?entry:null} pending={pending} send={send}/>}{marriageSubjects(w).includes(id)&&!marriage&&<FamilyMarriagePanel world={w} id={id} entry={entry?.action==='marriage'?entry:null} pending={pending} send={send}/>} {spouse&&<p>配偶：{getPerson(w,spouse)?.name} · {maritalHarmony(w,id)}{marriage&&plan?.trying?' · 筹划添丁':''}</p>}{pregnancy&&<p>孕期 · 预计余 {Math.max(0,pregnancy.due-w.day)} 日；双亲与家支已记录，离婚或父亲离世不取消孕期。</p>}{children.length>0&&<p>后代：{children.map(p=>p.name+'（'+ageLabel(w,p.id)+'）').join('、')}</p>}{w.householdLife?.bills[id]&&<p>本月抚育支出：实付 {w.householdLife.bills[id].paid}／应付 {w.householdLife.bills[id].due} 私钱</p>}{self&&<div className="city-policy-grid">{spouse&&<CommandButton label="家庭安排" icon="estate" pending={pending} hint="预览添丁意向、子女家支与抚育支出，确认后更新安排。" onClick={()=>{setTrying(plan?.trying??false);setFamily(plan?.family??getPerson(w,id)!.family);setOpen(true);}}/>}<CommandButton label={resting(w,id)?'结束休养':'伤病休养'} icon="stress" pending={pending} reason={familyCommandReason(w,restCommand)} hint={resting(w,id)?'提前结束休养，没有完成奖励；伤病仍按当前状态结算。':'休养三十日；暂停新出行与亲办事务，完成三十日后恢复健康 8、军中伤期缩短三十日。须先交接现有公务与军职。'} onClick={()=>setRest(restCommand)}/></div>}{events.map(e=><FamilyMomentChoice key={e.id} world={w} event={e} pending={pending} send={send}/>)}
 {rest&&<ConfirmAction title={rest.action==='rest'?'休养三十日':'结束休养'} detail="休养时不能亲自出行或办理新事务；现有公务和军职须先交接，课程暂停。完成三十日恢复健康 8、军中伤期缩短三十日；提前结束没有完成奖励。不会自动把国家权力交给配偶。" confirmLabel="确认安排" pending={pending||!!familyCommandReason(w,rest)} onCancel={()=>setRest(null)} onConfirm={()=>{if(!familyCommandReason(w,rest)){send(rest);setRest(null);}}}/>}
 {open&&<ActionDialog title="家庭安排" scene="landscape" onClose={()=>setOpen(false)} actions={<button className="primary" disabled={pending||!!why} onClick={()=>{if(!familyCommandReason(w,command)){send(command);setOpen(false);}}}>确认安排</button>}><fieldset><legend>家庭意向</legend>{[false,true].map(value=><label key={String(value)}><input type="radio" name="family-intent" checked={trying===value} onChange={()=>setTrying(value)}/>{value?'筹划添丁':'暂缓添丁'}</label>)}</fieldset><fieldset><legend>未来子女家支</legend>{[...new Set([getPerson(w,id)!.family,getPerson(w,spouse!)!.family])].map(f=><label key={f}><input type="radio" name="child-family" checked={family===f} onChange={()=>setFamily(f)}/>{familyById[f]?.name??f}</label>)}</fieldset><p>双方成年、健康且同城驻留时，每月判断是否有孕；孕期 270 日，出生后间隔 720 日。已开始的孕期不受改选影响；家支影响本家继承资格。未满十六岁的本局子女，每月由在世父母之一支付抚育生活费 2 钱；新生儿不凭空获得私财。</p>{why&&<p role="status">{why}</p>}</ActionDialog>}
 </section>;
}

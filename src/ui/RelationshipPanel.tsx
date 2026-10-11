import {afterCommand} from './actionFeedback';
import {CommandButton} from './CommandButton';
import {FamilyMarriagePanel} from './FamilyMarriagePanel';
import {allPeople} from '../core/personRegistry';
import {ConfirmAction} from './ConfirmAction';
import {ActionDialog} from './ActionDialog';
import {HouseholdPlansPanel} from './HouseholdPlansPanel';
import {PrivateBanquet} from './PersonalEconomyPanel';
import {retinueQuote,recruitmentScore} from '../core/retinue';
import {marriagePrestigePreview} from '../core/family';
import {marriageClanBonus} from '../core/clans';
import {MobilityPanel} from './MobilityPanel';
import {HoverHint} from './HoverHint';
import {ArtIcon} from './ArtIcon';
import {DetailTabs} from './DetailTabs';
import { useState } from 'react';
import {relationshipActionNames,type RelationshipAction} from '../data/relationships';
import { relationName,relationHooks,relationshipScore,relationshipQuote,activeMarriage,validRegency,type RelationshipCommand } from '../core/relationships';
import { governmentOf,currentRealm } from '../core/government';
import { interactionQuote,acceptance } from '../core/social';
import type { World,GameCommand } from '../core/types';
import './relationships.css';
const effects:Record<RelationshipAction,string>={
 gift:'基础好感 +15；历史人物交往叠加特质、世业与技能修正，实付钱转入对方储备；冷却 10 日。',pressure:'消耗 10 家业名望，压力 +15、对方好感 −25，取得 1 份人情（上限 3）。向朋友施压会决裂；冷却 15 日。',befriend:'14 日计谋，按锁定成功率结算。成功后形成双向朋友关系、好感 +20；结束后冷却 30 日，取消不退费。',confidant:'需友谊持续 30 日、接受度 85；成为至交，好感 +10、压力 −10。',rival:'消耗 10 家业名望、压力 +10，双方好感 −30；首次成为仇敌，再次升级为死敌；冷却 30 日。',reconcile:'需接受度 30，消除友敌关系中的仇怨，双方好感 +15；冷却 90 日。',marry:'双方成年、当前无配偶且非近亲／同族，接受度至少 70。婚姻为双向独占关系，好感各 +20；解锁亲友支援，双方保留各自财产。',divorce:'需家业名望 20；双方好感 −40，压力 +15，成为仇敌；婚姻转为历史记录，同一对象再婚冷却 360 日。',aid:'从对方私人储备转入 50 钱，好感 −5；配偶／朋友专用，接受度需 40，冷却 90 日，',pledge:'向军政权力更高者宣誓；接受度 40、初始忠诚 70。一人一位誓约领主，不能形成循环。',recruit:'招纳军政权力较低者；接受度 65、初始忠诚 70。不能用普通誓约收君主为属员。',renounce:'消耗 20 家业名望，双方好感 −35，成为仇敌；对同一领主再宣誓冷却 180 日。公职保留。',release:'解除对方的个人誓约，保留其官职与家产。',control:'需本国名义君主、功绩 40、军政基础和 2 份人情。30 日计谋；成功后取得实际执政、任命与改革权限，君主保留头衔。失败则成为仇敌、压力 +20；冷却 180 日，失败／取消不退成本。',tighten:'控制 +15，但君主合法性 −3、对方好感 −10；冷却 30 日。',emancipate:'名义君主抵抗当前执政者，控制 −25；降至 0 恢复亲政；冷却 30 日。',liberate:'立即归还实际执政权，君主恢复亲政；旧改革、在途任命与中央席位重新核定。',
};
type Interaction=RelationshipAction|'hire'|'dismiss'|'advisor'|'favor';
const names={...relationshipActionNames,hire:'延聘入幕',dismiss:'解聘幕僚',advisor:'延请协理',favor:'兑现人情'};
const extraEffects={hire:'支付束脩 30 钱，月俸 2 钱；任职后月俸 4 钱。对方按道路前来。幕府雇佣与个人效忠不能兼属。',dismiss:'解除本人的幕府雇佣；在建工程保留，但不再获得幕职加成。',advisor:'替换当前协理，新工程工期 −10%。',favor:'消耗 1 份人情，取得 50 钱，好感 −10。'};
const allEffects={...effects,...extraEffects};
const groups={personal:['gift','befriend','confidant','aid','rival','reconcile','pressure'],marriage:['divorce'],employment:['hire','dismiss','advisor','favor'],political:['pledge','recruit','renounce','release','control','tighten','emancipate','liberate']} as const;
export function RelationshipPanel({world:w,pending,send,targetId,onIntrigue}:{world:World;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;targetId:string;onIntrigue?:(id:string)=>void}){
 const [tab,setTab]=useState<keyof typeof groups>('personal'),[confirmation,setConfirmation]=useState<string|null>(null),[chosen,setChosen]=useState<Interaction|null>(null);
 const s=w.relationships,a=w.characterId;if(!s||!a)return <p>此人物暂无可用交往。</p>;
 const candidates=allPeople(w).filter(p=>p.id!==a&&!w.social!.lineage.slice(0,-1).some(old=>old.id===p.id));
 const target=candidates.find(p=>p.id===targetId);
 if(!target)return <p>此人已退居，不能继续交往。</p>;
 const cmdFor=(kind:Interaction):GameCommand=>kind==='hire'||kind==='dismiss'?{type:'retinue',action:kind==='hire'?'recruit':'dismiss',person:target.id}:kind==='advisor'||kind==='favor'?{type:'interact',action:kind,target:target.id}:{type:'relationship',action:kind,target:target.id};
 const quoteFor=(cmd:GameCommand)=>{if(cmd.type==='retinue')return {...retinueQuote(w,cmd),influence:0,days:0,chance:0};if(cmd.type==='interact')return {...interactionQuote(w,target.id,cmd.action),influence:0,days:0,chance:0};return relationshipQuote(w,cmd as RelationshipCommand);};
 const groupActions=groups[tab].filter(k=>!w.realm||!['befriend','control'].includes(k));
 const active=chosen&&groupActions.some(k=>k===chosen)?chosen:groupActions[0];
 const selectedCommand=cmdFor(active),selectedQuote=quoteFor(selectedCommand);
 const scoreParts=active==='hire'?recruitmentScore(w,a,target.id):active==='advisor'||active==='favor'?acceptance(w,target.id):[...relationshipScore(w,target.id),...(tab==='marriage'&&marriageClanBonus(w,a,target.id)?[{label:'世族门第',value:marriageClanBonus(w,a,target.id)}]:[])];
 const action=(cmd:GameCommand,label:string,danger=false)=>{const q=quoteFor(cmd),key=JSON.stringify(cmd);return <div className="relationship-action"><CommandButton label={label} icon="gregarious" danger={danger} pending={pending} reason={q.reason} hint={<p>{q.cost?q.cost+' 钱':'无需盘缠'}{q.influence?' · '+q.influence+' 影响力':''}{q.days?' · '+q.days+' 日 · 成功率 '+q.chance+'%':''}；预览后确认。</p>} onClick={()=>{if(danger)setConfirmation(key);else send(cmd);}}/>{confirmation===key&&<ConfirmAction title={label} detail={cmd.type==='relationship'&&cmd.action==='marital-branch'?'以未婚身份开始本局婚姻经历？':cmd.type==='retinue'?'解聘后立即失去幕职加成，再次延聘须等待 90 日。':'确认后扣除费用并执行；已付计谋费用不会退还。'} confirmLabel='确认执行' danger pending={pending||!!q.reason} onCancel={()=>setConfirmation(null)} onConfirm={()=>{if(pending||quoteFor(cmd).reason)return;void afterCommand(send(cmd),()=>{setConfirmation(null);});}}/>}</div>;};
 return <div className="relationship-panel">
 {s.scheme?.target===target.id&&<article className="relationship-task"><h4>{s.scheme.kind==='control'?'筹划挟制':'培养友谊'} · {relationName(s.scheme.target,w)}</h4><progress aria-label="计谋进度" value={w.day-s.scheme.started} max={s.scheme.due-s.scheme.started}/><p>余 {s.scheme.due-w.day} 日 · 成功率 {s.scheme.chance}%</p>{action({type:'relationship',action:'cancel'},'撤回计谋',true)}</article>}
 {w.social?.scheme?.target===target.id&&<article><h4>交好 · {relationName(w.social.scheme.target,w)}</h4><p>余 {w.social.scheme.due-w.day} 日 · 成功率 {w.social.scheme.chance}%</p><CommandButton label="撤回交好" icon="gregarious" danger pending={pending} hint="撤回当前交好，已花费用不退；预览后确认。" onClick={()=>setConfirmation('cancel-social:'+w.social!.scheme!.started)}/>{confirmation==='cancel-social:'+w.social.scheme.started&&<ConfirmAction title="撤回交好" detail="取消当前交好，已经支付的费用不退，未完成的交好不再继续。" confirmLabel="确认撤回" danger pending={pending} onCancel={()=>setConfirmation(null)} onConfirm={()=>{if(pending||!w.social?.scheme||w.social.scheme.target!==target.id||confirmation!=='cancel-social:'+w.social.scheme.started)return;void afterCommand(send({type:'cancel-scheme'}),()=>{setConfirmation(null);});}}/>}</article>}
 <div className="interaction-context"><span><ArtIcon name="influence" size={24}/>人情 {relationHooks(w,a,target.id)}</span><HoverHint label="接受度影响因素" content={<>{scoreParts.map(part=><p key={part.label}>{part.label} {part.value>=0?'+':''}{part.value}</p>)}</>}><span className="opinion-chip"><ArtIcon name="steadfast" size={24}/>接受度 <b>{scoreParts.reduce((n,p)=>n+p.value,0)}</b></span></HoverHint></div>
 <DetailTabs label="互动类别" value={tab} onChange={key=>{setTab(key);setChosen(null);setConfirmation(null);}} items={[{id:'personal',label:'交往',icon:'gregarious'},{id:'marriage',label:'婚姻',icon:'renown'},{id:'employment',label:'委任',icon:'person'},{id:'political',label:'权力',icon:'influence'}]}/>
 {tab==='marriage'&&!!marriageClanBonus(w,a,target.id)&&<HoverHint label="世族联姻" content={`双方门第使婚姻接受度 +${marriageClanBonus(w,a,target.id)}；首次联姻，你的家族可获 ${marriagePrestigePreview(w,a,target.id)[0].amount} 威望，对方家族可获 ${marriagePrestigePreview(w,a,target.id)[1].amount} 威望；同一对人物不重复授予。`}><span className="clan-standing-badge"><ArtIcon name="renown" size={24}/>联姻荫望 +{marriageClanBonus(w,a,target.id)}</span></HoverHint>}
 {tab==='marriage'&&<FamilyMarriagePanel world={w} id={a} partner={targetId} pending={pending} send={send}/>}
 {tab==='marriage'&&activeMarriage(w,a)&&<p>配偶：{relationName(activeMarriage(w,a)!.a===a?activeMarriage(w,a)!.b:activeMarriage(w,a)!.a,w)}</p>}
 {tab==='political'&&w.realm&&<p>君主：{relationName(governmentOf(w)!.ruler,w)}{validRegency(w,currentRealm(w))?' · 控制度 '+validRegency(w,currentRealm(w))!.grip+'/100':''}</p>}
 <div className="interaction-options">{groupActions.map(kind=>{const q=quoteFor(cmdFor(kind));return <CommandButton key={kind} label={names[kind]} icon={tab==='marriage'?'renown':tab==='political'?'influence':'gregarious'} pending={pending} reason={q.reason} selected={chosen===kind} hint={<><p>{allEffects[kind]}</p><p>{q.cost?q.cost+' 钱':'无需盘缠'}{q.influence?' · '+q.influence+' 影响力':''}{q.days?' · '+q.days+' 日 · 成功率 '+q.chance+'%':''}</p></>} onClick={()=>{setChosen(kind);setConfirmation(null);}}/>;})}</div>
 {chosen&&<ActionDialog title={names[active]+' · '+relationName(target.id,w)} onClose={()=>setChosen(null)} actions={<button className="primary" disabled={pending||!!selectedQuote.reason} onClick={()=>{if(pending||quoteFor(selectedCommand).reason)return;void afterCommand(send(selectedCommand),()=>{setChosen(null);});}}>确认执行</button>}><p>{allEffects[active]}</p><p>{selectedQuote.cost?selectedQuote.cost+' 钱':'无需盘缠'}{selectedQuote.influence?' · '+selectedQuote.influence+' 影响力':''}{selectedQuote.days?' · '+selectedQuote.days+' 日 · 成功率 '+selectedQuote.chance+'%':''}</p><div className="interaction-context"><span><ArtIcon name="influence" size={24}/>人情 {relationHooks(w,a,target.id)}</span><span>接受度 {scoreParts.reduce((n,p)=>n+p.value,0)}</span></div>{scoreParts.map(part=><p key={part.label}>{part.label} {part.value>=0?'+':''}{part.value}</p>)}{selectedQuote.reason&&<p className="service-warning" role="status">{selectedQuote.reason}</p>}</ActionDialog>}
 {w.realm&&onIntrigue&&<CommandButton label="筹划谋略" icon="wary" pending={pending} hint="前往谋略工作台，以此人为目标经营交好、离间、密约、控制或高风险行动。" onClick={()=>onIntrigue(targetId)}/>}<MobilityPanel world={w} target={targetId} send={send} pending={pending}/>
 {tab==='personal'&&<HouseholdPlansPanel key={targetId} world={w} pending={pending} send={send} target={targetId}/>}
 {tab==='personal'&&<PrivateBanquet world={w} pending={pending} send={send} target={targetId}/>}
 <section className="detail-record-group"><h4>关系往事</h4>{s.history.filter(h=>h.actor===a&&h.target===target.id||h.actor===target.id&&h.target===a).slice(-15).reverse().map((h,i)=><p key={i}>第 {h.day} 日 · {h.text}</p>)}</section>
 </div>;
}

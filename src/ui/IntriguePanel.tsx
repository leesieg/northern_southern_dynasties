import {nobleRanks,type NobleRank} from '../core/nobility';
import {policies,type CourtPolicy} from '../data/court';
import {useState} from 'react';
import {intrigueQuote,visibleSchemes,type IntrigueCommand,type Scheme} from '../core/intrigue';
import {attributes} from '../core/social';
import {allPeople} from '../core/personRegistry';
import {ageAt,isAlive} from '../core/lifeState';
import {detained} from '../core/custodyState';
import {allegianceRealm} from '../core/officeEligibility';
import {lifestyleProgress} from '../core/lifestyle';
import {lifestyleBranches,lifestyleFocuses,lifestylePerks} from '../data/lifestyles';
import {governmentOf,politicalName,currentRealm} from '../core/government';
import {powerGoalNames,type PowerGoal} from '../core/powerPolitics';
import {relationHooks} from '../core/relationships';
import {dateLabel} from '../core/world';
import type {World,GameCommand} from '../core/types';
import {CharacterPortrait} from './CharacterPortrait';
import {PersonChoice} from './PersonSelection';
import {ArtIcon,type ArtName} from './ArtIcon';
import {CommandButton} from './CommandButton';
import {DetailTabs} from './DetailTabs';
import {ActionDialog} from './ActionDialog';
import {ConfirmAction} from './ConfirmAction';
import {HoverHint} from './HoverHint';
import {ClaimPanel} from './PoliticalIdentity';
import './intrigue.css';

const schemeInfo:Record<Scheme['kind'],{name:string;icon:ArtName;effect:string;group:'personal'|'political'|'hostile'}>={
 befriend:{name:'交好',icon:'gregarious',effect:'经营友谊与好感；已有仇怨须先调解。',group:'personal'},
 woo:{name:'拉拢',icon:'influence',effect:'争取个人好感，提高此后政治交涉的接受度。',group:'personal'},
 favor:{name:'人情',icon:'generous',effect:'制造可兑现的人情；复用双方已有的人情记录。',group:'personal'},
 alienate:{name:'离间',icon:'wary',effect:'针对一段具体关系，挑起目标对另一人的疑惧。',group:'political'},
 recruit:{name:'密约',icon:'renown',effect:'约定支持一项明确的君位或执政安排；承诺按真实官职和兵权结算。',group:'political'},
 control:{name:'挟制',icon:'influence',effect:'保留君主名义，争夺实际执政权；须有真实权力基础。',group:'hostile'},
 abduct:{name:'绑架',icon:'army',effect:'将人物纳入实际拘押；后续招降、赎返、释放仍依拘押规则。',group:'hostile'},
 murder:{name:'谋害',icon:'wary',effect:'目标可能死亡并进入正常身后结算；曝光会引起仇怨和朝局后果。',group:'hostile'},
};
const statusNames={active:'筹划中',succeeded:'已达成',failed:'未达成',cancelled:'已撤回',invalid:'已中止'};
type StartCommand=Extract<IntrigueCommand,{action:'start'}>;
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void;initialTarget?:string;onPerson:(id:string)=>void;onLifestyle:()=>void;onPolitics:()=>void;onFulfill:(promise:'title'|'policy',person:string)=>void};

export function IntriguePanel({world:w,pending,send,initialTarget='',onPerson,onLifestyle,onPolitics,onFulfill}:Props){
 const actor=w.characterId!,realm=currentRealm(w),g=governmentOf(w,realm)!,progress=lifestyleProgress(w),focus=progress?.focus?lifestyleFocuses[progress.focus]:null;
 const [tab,setTab]=useState<'schemes'|'actions'|'secrets'|'claims'>('schemes'),[draft,setDraft]=useState<StartCommand|null>(null),[cancel,setCancel]=useState<number|null>(null);
 const schemes=visibleSchemes(w),own=schemes.filter(s=>s.actor===actor),active=own.filter(s=>s.status==='active'),threats=schemes.filter(s=>s.actor!==actor),people=allPeople(w).filter(p=>isAlive(w,p.id)&&p.id!==actor);
 const quote=draft?intrigueQuote(w,draft):null;
 const open=(kind:Scheme['kind'])=>{const proposal=w.politics?.proposals[realm];setDraft({type:'intrigue',action:'start',kind,target:initialTarget,realm,beneficiary:proposal?.beneficiary??g.ruler,executive:proposal?.executive??g.executives[0],powerGoal:proposal?.goal??'executive',promise:'office',nobleRank:'king',nobleName:'',nobleRites:false,courtPolicy:'consolidation'});};
 const change=(patch:Partial<StartCommand>)=>setDraft(d=>d?{...d,...patch}:null);
 const name=(id:string)=>politicalName(id,w);
 const person=(id:string)=> <button className="intrigue-person-link" onClick={()=>onPerson(id)}><CharacterPortrait world={w} characterId={id} compact/><span>{name(id)}</span></button>;
 const options=people.map(p=>({id:p.id,score:attributes(w,p.id).intrigue,metric:'谋略',detail:allegianceRealm(w,p.id)===realm?'本国人物':'异国人物'}));
 const record=(s:typeof schemes[number])=><article className="scheme-record" key={s.id}><header><ArtIcon name={schemeInfo[s.kind].icon}/><strong>{schemeInfo[s.kind].name}</strong><span>{statusNames[s.status]}</span></header><div className="scheme-targets">{person(s.target)}{s.secondary&&<><span>与</span>{person(s.secondary)}</>}</div>{s.progress!==null&&<><progress aria-label={schemeInfo[s.kind].name+'筹划进度'} max={100} value={s.progress}/><span>进度 {s.progress}%{s.due!==null?' · 最早 '+dateLabel(s.due,w.scriptId):''}</span></>}{s.chance!==null&&<div className="scheme-odds"><span>达成机会 {s.chance}%</span><span>暴露风险 {s.exposure}%</span></div>}{s.reason&&<p>{s.reason}</p>}{s.status!=='active'&&<small>{s.exposed?'谋略已经暴露':'未公开发起人'}{s.ended!==null?' · '+dateLabel(s.ended,w.scriptId):''}</small>}{s.status==='active'&&s.actor===actor&&<CommandButton label="撤回" icon="wary" hint="终止本次谋略，已花费的私财不退。" pending={pending} danger onClick={()=>setCancel(s.id)}/>}</article>;
 return <section className="intrigue-desk">
  <div className="intrigue-identity detail-landscape detail-landscape--court">{person(actor)}<span><strong>谋略 {attributes(w,actor).intrigue}</strong><small>当前生活重心：{focus?lifestyleBranches[focus.branch].name+' · '+focus.name:'尚未选择'}</small></span></div>
  <button className="lifestyle-scene-entry intrigue-lifestyle" onClick={onLifestyle}><span><strong>生活重心</strong><small>{progress?.perks.filter(id=>lifestylePerks[id].branch==='intrigue').map(id=>lifestylePerks[id].name).join('、')||'修习权谋 · 查看技能与成长'}</small></span><ArtIcon name="diligent"/></button>
  <DetailTabs label="谋略事务" value={tab} onChange={setTab} items={[{id:'schemes',label:'谋划',icon:'wary'},{id:'actions',label:'行动',icon:'influence'},{id:'secrets',label:'密约',icon:'generous'},{id:'claims',label:'宣称',icon:'renown'}]}/>
  {tab==='schemes'&&<><div className="intrigue-section-heading"><h3>正在进行</h3><button onClick={()=>setTab('actions')}>发动谋略</button></div>{active.map(record)}{!active.length&&<p className="intrigue-empty">暂无正在筹划的谋略。选择行动，比较目标和条件后再发动。</p>}<h3>已察觉的威胁</h3>{threats.map(s=><article className="scheme-record" key={s.id}><strong>{schemeInfo[s.kind].name} · 针对 {name(s.target)}</strong><p>{s.actor?'已知发起人：'+name(s.actor):'发现有人在秘密活动，幕后人物尚未查明。'}</p></article>)}{!threats.length&&<p className="intrigue-empty">尚未察觉针对你的谋略。</p>}<h3>谋略记录</h3>{own.filter(s=>s.status!=='active').slice().reverse().slice(0,12).map(record)}</>}
  {tab==='actions'&&<>{(['personal','political','hostile'] as const).map(group=><section key={group}><h3>{{personal:'经营人际',political:'经营朝局',hostile:'控制与风险'}[group]}</h3><div className="intrigue-action-grid">{(Object.keys(schemeInfo) as Scheme['kind'][]).filter(kind=>schemeInfo[kind].group===group).map(kind=><CommandButton key={kind} label={schemeInfo[kind].name} icon={schemeInfo[kind].icon} hint={schemeInfo[kind].effect} pending={pending} danger={group==='hostile'} onClick={()=>open(kind)}/>)}</div></section>)}<p className="intrigue-boundary">人际与敌对谋略各有一个筹划席位。成功和暴露分别结算；能否改变权力，仍取决于官职、关系和实际兵权。</p></>}
  {tab==='secrets'&&<><h3>秘密政治承诺</h3>{w.intrigue?.supports.filter(s=>s.until>=w.day&&(s.sponsor===actor||s.status==='awaiting'&&(s.beneficiary===actor||s.executive===actor||s.goal==='executive'&&g.ruler===actor))).slice(-20).map((s,i)=><article className="scheme-record" key={i}>{person(s.person)}<p>{powerGoalNames[s.goal]} · 受益人 {name(s.beneficiary)} · 执政者 {name(s.executive)}</p>{s.promise==='title'&&s.nobleRank&&<p>承诺：{s.nobleName}{nobleRanks[s.nobleRank].name}{s.nobleRites?' · 殊礼':''}，由新君另行册授。</p>}{s.promise==='policy'&&s.courtPolicy&&<p>承诺：安定 · {policies[s.courtPolicy].name}，由实际执政者另行确认。</p>}{s.status==='awaiting'&&<CommandButton label="前往兑现" icon="influence" hint="在朝廷使用实际册封或国策入口；这里不自动花费新君资源。" onClick={()=>onFulfill(s.promise as 'title'|'policy',s.person)}/>}{s.status==='awaiting'&&s.fulfillmentDue!==undefined&&<small>兑现期限 {dateLabel(s.fulfillmentDue,w.scriptId)}</small>}<small>{{pledged:'已订密约',honored:'承诺已承接',awaiting:'事成待兑现',broken:'承诺已失效',expired:'密约已到期'}[s.status]} · 有效至 {dateLabel(s.until,w.scriptId)}；仅影响该项安排。</small></article>)}<CommandButton label="权力议案" icon="influence" hint="查看当前安排和重臣的支持理由；密约只适用于所约定的安排。" onClick={onPolitics}/><h3>掌握的人情</h3>{people.filter(p=>relationHooks(w,actor,p.id)>0).map(p=><article className="scheme-record" key={p.id}>{person(p.id)}<small>可兑现人情 {relationHooks(w,actor,p.id)}</small></article>)}</>}
  {tab==='claims'&&<ClaimPanel world={w} realm={realm} pending={pending} send={send} onPerson={onPerson} onPolitics={onPolitics}/>}
  {draft&&quote&&<ActionDialog title={schemeInfo[draft.kind].name+' · 筹划谋略'} className="intrigue-dialog" onClose={()=>setDraft(null)} actions={<><span className="intrigue-confirm-reason" role="status">{quote.reason||'由 '+name(actor)+'支出私财 '+quote.cost+' 钱；确认后开始筹划。'}</span><button className="primary" disabled={pending||!!quote.reason} onClick={()=>{if(pending||intrigueQuote(w,draft).reason)return;send(draft);setDraft(null);}}>确认{schemeInfo[draft.kind].name} · 私财 {quote.cost} 钱</button></>}>
   <p>{schemeInfo[draft.kind].effect}</p><div className="intrigue-selections"><PersonChoice world={w} title="目标人物" value={draft.target} onChange={target=>change({target,agent:undefined,nobleName:''})} options={options} pending={pending} onPerson={onPerson}/>{draft.kind==='alienate'&&<PersonChoice world={w} title="另一方" value={draft.secondary??''} onChange={secondary=>change({secondary})} options={options.filter(p=>p.id!==draft.target)} pending={pending} onPerson={onPerson}/>}<PersonChoice world={w} title="内应（可选）" value={draft.agent??''} onChange={agent=>change({agent})} options={people.filter(p=>p.id!==draft.target&&!detained(w,p.id)&&(ageAt(w,p.id)??0)>=16).map(p=>({id:p.id,score:attributes(w,p.id).intrigue,metric:'谋略'}))} pending={pending} onPerson={onPerson}/></div>{draft.agent&&<button onClick={()=>change({agent:undefined})}>撤下内应</button>}
   {draft.kind==='recruit'&&<><fieldset className="intrigue-options"><legend>约定的权力安排</legend>{(Object.keys(powerGoalNames) as PowerGoal[]).map(goal=><label key={goal}><input type="radio" name="scheme-goal" checked={draft.powerGoal===goal} onChange={()=>change({powerGoal:goal})}/><span>{powerGoalNames[goal]}</span></label>)}</fieldset><div className="intrigue-selections"><PersonChoice world={w} title="受益君主" value={draft.beneficiary??''} onChange={beneficiary=>change({beneficiary})} options={options.filter(p=>allegianceRealm(w,p.id)===realm).concat({id:actor,score:attributes(w,actor).intrigue,metric:'谋略',detail:'本人'})} onPerson={onPerson}/><PersonChoice world={w} title="拟任执政者" value={draft.executive??''} onChange={executive=>change({executive})} options={options.filter(p=>allegianceRealm(w,p.id)===realm).concat({id:actor,score:attributes(w,actor).intrigue,metric:'谋略',detail:'本人'})} onPerson={onPerson}/></div><fieldset className="intrigue-options"><legend>交换条件</legend>{(['office','command','gift','title','policy'] as const).map(promise=><label key={promise}><input type="radio" name="scheme-promise" checked={draft.promise===promise} onChange={()=>change({promise})}/><span>{{office:'保留官职',command:'保留兵权',gift:'馈赠私财',title:'晋爵／封王',policy:'安定国策'}[promise]}</span></label>)}</fieldset>{draft.promise==='title'&&<><fieldset className="intrigue-options"><legend>事成后授爵</legend>{(Object.keys(nobleRanks) as NobleRank[]).map(rank=><label key={rank}><input type="radio" name="promised-title" checked={draft.nobleRank===rank} onChange={()=>change({nobleRank:rank})}/><span>{nobleRanks[rank].name} · 中央 {nobleRanks[rank].cost} 钱</span></label>)}</fieldset><label className="political-input">封号<input maxLength={4} value={draft.nobleName??''} onChange={e=>change({nobleName:e.target.value})}/></label><label><input type="checkbox" checked={draft.nobleRites??false} onChange={e=>change({nobleRites:e.target.checked})}/>加殊礼 · 另需中央 160 钱</label></>}{draft.promise==='policy'&&<fieldset className="intrigue-options"><legend>事成后安定国策</legend>{(Object.keys(policies) as CourtPolicy[]).map(policy=><label key={policy}><input type="radio" name="promised-policy" checked={draft.courtPolicy===policy} onChange={()=>change({courtPolicy:policy})}/><span>{policies[policy].name}</span></label>)}</fieldset>}</>}
   <div className="intrigue-preview"><span>执行者<strong>{name(actor)}</strong></span><span>筹划<strong>{quote.days} 日</strong></span><HoverHint label="达成机会来源" content={quote.parts.map(p=><p key={p.label}>{p.label} {p.value>=0?'+':''}{p.value}</p>)}><span tabIndex={0}>达成机会<strong>{quote.chance}%</strong></span></HoverHint><span>暴露风险<strong>{quote.exposure}%</strong></span></div>{quote.futureCost&&<p className="scheme-warning">事成后由 {name(quote.futureCost.payer)}另行兑现：中央 {quote.futureCost.centralCoins} 钱、本人影响力 {quote.futureCost.influence}。{quote.futureCost.condition}；不在本次筹办时扣除。</p>}<p>{quote.gift>0?'其中 '+quote.gift+' 钱立即转入目标私财，其余为筹办支出。':'筹办费用为发起者私财支出。'}{quote.hookCost?'另兑现 '+quote.hookCost+' 份已有的人情。':''}</p><p>选择只调整本次草稿。目标或朝局变化可能导致中止，已付成本不退。</p>{draft.kind==='murder'&&<p className="scheme-warning">此行动可能导致死亡，无法撤销已经结算的结果。</p>}
  </ActionDialog>}
  {cancel!==null&&<ConfirmAction title="撤回谋略" detail="终止本次筹划，已经花费的私财不退。" confirmLabel="确认撤回" danger pending={pending} onCancel={()=>setCancel(null)} onConfirm={()=>{if(pending||!w.intrigue?.schemes.some(s=>s.id===cancel&&s.actor===actor&&s.status==='active'))return;send({type:'intrigue',action:'cancel',scheme:cancel});setCancel(null);}}/>}
 </section>;
}

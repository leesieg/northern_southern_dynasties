import {px} from './peopleScale';
import {useEffect,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {War} from '../core/wars';
import {activeWars} from '../core/wars';
import {civilResponseReview,civilStanceNames,civilStanceEvaluation,civilStanceQuote,civilPoliticsReason,civilFixedSide,civilAvailability,type CivilStance,type CivilPoliticsCommand} from '../core/civilMobilization';
import {civilCommitments,civilPromiseOptions,civilPromiseNames} from '../core/civilPromises';
import {allegianceRealm} from '../core/officeEligibility';
import {governmentOf,governingExecutives,politicalName,regimeName} from '../core/government';
import {personResidence} from '../core/residence';
import {armyCommander} from '../core/mobility';
import {militaryArmyView} from '../core/militaryView';
import {siteById} from '../data/scenario';
import {personSheetPresentation} from './personSheetPresentation';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';
import {CharacterPortrait} from './CharacterPortrait';
import {CommandButton} from './CommandButton';
import './civilMobilization.css';

type Props={world:World;war:War;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onPerson?:(id:string)=>void;error?:string};
export function CivilMemberDialog({world:w,war,person,onClose,pending,send,intent,error}:Props&{person:string;onClose:()=>void;intent?:'appeal'|'pledge'}){
 const actor=w.characterId!,m=war.civil!.mobilization!,member=m.members[person],self=person===actor,r=allegianceRealm(w,actor),side=r===war.attacker?'rebel':'loyal',chief=!!r&&[war.attacker,war.defender].includes(r)&&governingExecutives(w,r).includes(actor);
 const [choice,setChoice]=useState<CivilStance>(()=>member?.choice==='pending'?'watch':member?.choice??'watch'),[offer,setOffer]=useState(''),[confirm,setConfirm]=useState<CivilPoliticsCommand|null>(null);
 useEffect(()=>{setChoice(member?.choice==='pending'?'watch':member?.choice??'watch');setOffer('');setConfirm(null);},[person,war.id,actor,member?.choice]);
 const evaluation=civilStanceEvaluation(w,war,person),quote=civilStanceQuote(w,war,actor,choice),options=chief&&!self?civilPromiseOptions(w,war,actor,person):[],option=options.find(o=>o.target.kind+':'+o.target.id===offer);
 useEffect(()=>{if(evaluation.reason)onClose();},[evaluation.reason]);
 const appeal:CivilPoliticsCommand={type:'civilWar',action:'appeal',war:war.id!,person,side},pledge:CivilPoliticsCommand|null=option?{type:'civilWar',action:'pledge',war:war.id!,person,side,target:option.target,mode:option.mode}:null,stance:CivilPoliticsCommand={type:'civilWar',action:'stance',war:war.id!,choice,revision:quote.revision};
 useEffect(()=>{if(intent==='appeal')setConfirm(appeal);},[intent,person,war.id,actor]);
 const commitments=civilCommitments(w).filter(q=>q.civil.war===war.id&&q.person===person&&(q.person===actor||q.chief===actor)),shown=self?evaluation.parts:evaluation.parts.filter(p=>!['有效待遇承诺','定向劝说'].includes(p.label)),reason=confirm?civilPoliticsReason(w,confirm):'';
 const submit=async(c:CivilPoliticsCommand)=>{if(pending||civilPoliticsReason(w,c))return;if(await send(c))onClose();};
 const response=civilResponseReview(w,war,person,side);
 const q=quote.transfer,model=personSheetPresentation(w,person);
 return <ActionDialog className={'civil-member-dialog'+(intent?' hou-civil-dialog':'')} art="staff" title={(self?'本人的战时立场':intent==='pledge'?'向'+model.name+'承诺待遇':intent==='appeal'?'劝说'+model.name:'与'+model.name+'交涉')+' · '+(war.civil?.name??'内战')} onClose={onClose} actions={confirm?<><span role="status">{reason}</span>{intent!=='appeal'&&<button onClick={()=>setConfirm(null)}>调整方案</button>}<button className="primary" disabled={pending||!!reason} onClick={()=>void submit(confirm)}>确认{confirm.action==='stance'?civilStanceNames[confirm.choice]:confirm.action==='appeal'?'劝说 · 影响力 10':'承诺 · 影响力 10'}</button></>:self?<button className="primary" disabled={pending||!!quote.reason} onClick={()=>setConfirm(stance)}>预览并确认立场</button>:null}>
  <div className="civil-member-summary"><CharacterPortrait world={w} characterId={person} compact/><span><strong>{model.name}</strong><small>{model.title} · {siteById[personResidence(w,person).site]?.name}</small></span><b>{member?.unavailable??civilStanceNames[member?.choice??'pending']}</b></div>
  <p>朝廷：{politicalName(governmentOf(w,war.defender)!.executives[0]??governmentOf(w,war.defender)!.ruler,w)} · 起兵方：{politicalName(war.civil!.claimant,w)}</p>
  {self&&<><div className="civil-stance-options" role="radiogroup" aria-label="本人的战时立场">{(['loyal','rebel','watch'] as const).map(value=><label key={value} data-selected={choice===value}><input type="radio" name={'civil-stance-'+war.id} value={value} checked={choice===value} onChange={()=>{setChoice(value);setConfirm(null);}}/><strong>{civilStanceNames[value]}</strong><small>{value==='watch'?'保持当前效忠、治理与税收，暂不远征；遭攻击仍须防卫':(value==='rebel'?'归附起兵军府':'支持原朝廷')+'，只交接真实跟随的兵员与实控县域'}</small></label>)}</div>
   <section className="civil-transfer-preview" aria-label="当前立场交接预览"><h4>此次选择的后果</h4>{q?<><p>{regimeName(w,q.from)} → {regimeName(w,q.to)}；本人私产不转为公款，旧誓约及旧公职按当前效忠复核。</p><dl><div><dt>实控交接</dt><dd>{q.cities.map(id=>siteById[id].name).join('、')||'没有可交接县域'}</dd></div><div><dt>实际追随</dt><dd>{px(q.troops)} 人 · {q.armies.length} 支部队</dd></div><div><dt>公款交接</dt><dd>{q.accounts.reduce((n,p)=>n+p.coins,0)} 钱，由原地方公库转至新阵营对应账户</dd></div></dl>{q.offices.length>0&&<p>原县域公职复核：{q.offices.map(id=>siteById[id].name).join('、')}。未交接地区的原职撤除；州郡职权不随本人自动转移。</p>}{q.oldOath&&<p>离开原誓约领主将使双方关系 −25；与原阵营执政者的关系也将受损。</p>}{q.blocked.length>0&&<div><h4>未能带走的兵地</h4>{q.blocked.map((v,i)=><p key={i}>{siteById[v.label]?.name??v.label}：{v.reason}</p>)}</div>}<p>人口、粮仓、建筑与实际伤亡保留；本人按真实道路移动。</p></>:<p>{choice==='watch'?'保持效忠及现有兵地，继续治理、输税和防卫；不自动参加本场远征。':'当前已属所选阵营，兵地不再重复交接。出兵、供粮另按实际权限办理。'}</p>}{quote.reason&&<p className="civil-warning" role="status">{quote.reason}</p>}</section>
  </>}
  <section className="civil-factors"><h4>{self?'本人处境':'可见的政治因素'}</h4>{shown.filter(p=>p.value!==0).map(p=><p key={p.label}><span>{p.label}</span><b>{p.value>0?'+':''}{p.value}</b></p>)}{self&&<p>倾向 {evaluation.score}，正值偏向起兵方、负值偏向朝廷；这是处境分析，立场由你决定。</p>}{evaluation.reason&&<p role="status">{evaluation.reason}</p>}</section>
  {!self&&chief&&<section className="civil-transfer-preview"><h4>响应条件</h4><p>可见因素合计 {shown.reduce((n,p)=>n+p.value,0)}；{side==='rebel'?'响应门槛 ≥':'勤王门槛 ≤−'}{response.threshold}。未公开交涉不计入这里的合计；实际响应还会复核个人处境，不能视为成功率。</p>{response.remaining>0&&<p role="status">距可再次改投还需 {response.remaining} 日；劝说效果持续三十日，请在可响应时机内安排。</p>}{response.reason&&<p>{response.reason}</p>}<p>首次表态有十五日考虑期；收到劝说、有效待遇或前线变化时提前复议。首次支持原阵营不消耗改投机会，实际跨阵营后才受六十日限制。</p></section>}
  {!self&&chief&&!civilFixedSide(w,war,person)&&intent!=='appeal'&&<section className="civil-talk-actions"><h4>争取地方响应</h4>{!intent&&<div className="person-quick-actions"><CommandButton label={side==='rebel'?'劝其响应':'劝其勤王'} icon="gregarious" pending={pending} reason={civilPoliticsReason(w,appeal)} hint="本人影响力 10；三十日内增加对本方的倾向，不替对方选择。" onClick={()=>setConfirm(appeal)}/></div>}{intent==='pledge'?<SingleChoiceCards label="选择可兑现的待遇" value={offer||null} disabled={pending} onChange={value=>{setOffer(value);setConfirm(null);}} options={options.map(o=>({id:o.target.kind+':'+o.target.id,title:o.label,description:o.mode==='retain'?'明确响应本方后生效，战中持续核对职权；不额外赠兵或转城。':'本方获胜后须在期限内按实际资格任命及赴任；不会提前授官。',art:o.target.kind==='army'?'military':'staff'}))}/>:<label>待遇方案<select value={offer} onChange={e=>{setOffer(e.target.value);setConfirm(null);}}><option value="">选择可兑现的职位或兵权</option>{options.map(o=><option key={o.target.kind+':'+o.target.id} value={o.target.kind+':'+o.target.id}>{o.label}</option>)}</select></label>}<div className="person-quick-actions"><CommandButton label={intent?'预览承诺待遇':'承诺待遇'} icon="influence" pending={pending} reason={pledge?civilPoliticsReason(w,pledge):'请选择真实可处分的职权；已经承诺的席位不能再许给别人'} hint="本人影响力 10；对方接受后受履约约束，不立即生成职位、兵员或钱粮。" onClick={()=>{if(pledge)setConfirm(pledge);}}/></div>{!options.length&&<p>当前没有可承诺的合法空席、可保留的县域职权或实际兵权。</p>}</section>}
  {commitments.length>0&&<section><h4>与本人有关的待遇约定</h4>{commitments.map((q,i)=><p key={i}>{q.civil.target.kind==='county'?siteById[q.civil.target.id]?.name:q.civil.target.kind==='army'?'第 '+q.civil.target.id+' 军':'中央职掌'} · {q.civil.mode==='retain'?'保留职权':'战后授官'} · {civilPromiseNames[q.civil.status]}{q.civil.due===null?'':` · 办理余 ${Math.max(0,q.civil.due-w.day)} 日`}</p>)}</section>}
  {confirm&&<p className="civil-confirm-note">{confirm.action==='stance'?'将执行上方所见立场与兵地交接。':confirm.action==='appeal'?'消耗本人影响力 10，三十日内倾向修正 15；对方仍自行决定。':'消耗本人影响力 10，登记具体待遇；失约造成关系损失，授官仍需合法任命及赴任。'}</p>}
  {error&&<p className="civil-dialog-error" role="alert">{error}</p>}
 </ActionDialog>;
}

export function CivilMobilizationPanel({world:w,war,pending,send,onPerson}:Props){
 const [selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState('');
 useEffect(()=>{setSelected(null);setQuery('');},[war.id,w.characterId]);
 const m=war.civil?.mobilization;if(!m)return null;
 const actor=w.characterId!,own=m.members[actor],rows=Object.entries(m.members).filter(([id])=>!query||politicalName(id,w).includes(query));
 return <section className="civil-mobilization" aria-label="地方战时响应">
  <header><div><h3>地方响应</h3><p>官员与将领分别选择；观望仍属原阵营，税收和防卫照常。</p></div>{own&&!civilFixedSide(w,war,actor)&&<button onClick={()=>setSelected(actor)}>{own.choice==='pending'?`本人待表态 · 余 ${Math.max(0,own.due-w.day)} 日`:'调整本人立场'}</button>}</header>
  <label className="civil-search">查找人物<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="人物姓名"/></label>
  <div className="civil-roster">{(['loyal','rebel','watch','pending'] as const).map(choice=><section key={choice} className="civil-roster-group"><h4>{civilStanceNames[choice]} · {rows.filter(([,q])=>q.choice===choice&&!q.unavailable).length}</h4>{rows.filter(([,q])=>q.choice===choice&&!q.unavailable).map(([id])=>{const model=personSheetPresentation(w,id),armies=w.realm!.armies.filter(a=>a.owner===id||armyCommander(w,a)===id),exact=armies.every(a=>militaryArmyView(w,a).exact);return <article key={id}><button className="civil-person" disabled={!onPerson} onClick={()=>onPerson?.(id)}><CharacterPortrait world={w} characterId={id} compact/><span><strong>{model.name}</strong><small>{model.title} · {siteById[personResidence(w,id).site]?.name}</small></span></button><small>{exact?px(armies.reduce((n,a)=>n+a.troops,0))+' 人': '兵力未详'}</small><button onClick={()=>setSelected(id)}>{id===actor?'本人立场':'详情／交涉'}</button></article>;})}</section>)}</div>
  {Object.entries(m.members).some(([,q])=>!!q.unavailable)&&<p className="civil-unavailable">暂不能自主表态：{Object.entries(m.members).filter(([,q])=>q.unavailable).map(([id,q])=>politicalName(id,w)+'（'+q.unavailable+'）').join('、')}</p>}
  {selected&&m.members[selected]&&<CivilMemberDialog key={war.id+':'+selected} world={w} war={war} person={selected} pending={pending} send={send} onClose={()=>setSelected(null)}/>}
 </section>;
}
export function CivilMobilizationEntry({world:w,person,pending,send}:{world:World;person:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>}){
 const [open,setOpen]=useState(false);useEffect(()=>setOpen(false),[person,w.characterId]);
 const war=activeWars(w).find(v=>v.civil?.mobilization?.members[person]);if(!war)return null;
 const self=person===w.characterId;
 return <><CommandButton label={self?'战时立场':'战时交涉'} icon="army" pending={pending} reason={civilAvailability(w,war,person)} hint="查看本场内战的地方立场与实际职权，预览后选择或交涉。" onClick={()=>setOpen(true)}/>{open&&<CivilMemberDialog world={w} war={war} person={person} pending={pending} send={send} onClose={()=>setOpen(false)}/>}</>;
}

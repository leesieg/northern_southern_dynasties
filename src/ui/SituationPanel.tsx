import {useEffect,useState} from 'react';
import {countyTerritory} from '../core/localAdministration';
import {nextMonthStart} from '../core/calendar';
import {politicalAction,type PolicyDomain} from '../core/politicalActions';
import {courtOf,courtEnabled,courtLocalPressures,courtMonthPreview,courtBonus,movementMood,movementPower,movementPowerParts,courtReason,foundingPause,type CourtCommand} from '../core/court';
import {currentRealm,governmentOf,politicalName} from '../core/government';
import {siteById} from '../data/scenario';
import {phases,movements,movementIds,policies,type MovementId} from '../data/court';
import type {RealmId} from '../core/realm';
import type {World,GameCommand} from '../core/types';
import {RealmBadge} from './RealmBadge';
import {CivilWarPanel} from './CareerSystems';
import {SituationWheel} from './SituationWheel';
import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {CharacterPortrait} from './CharacterPortrait';
import {CourtPetitionAudience} from './PetitionCases';
import {PersonSelectionDialog} from './PersonSelection';
import {ActionDialog} from './ActionDialog';
import {ConfirmAction} from './ConfirmAction';
import './situation.css';

const icons:Record<MovementId,ArtName>={dynastic:'renown',expansion:'army',reform:'diligent',conservative:'frugal',unaligned:'person'};
export function SituationPanel({world:w,realm,pending,send,onPerson,onTerritory,onService}:{world:World;realm?:RealmId;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void;onTerritory?:(id:string)=>void;onService?:(id?:number,site?:string)=>void;embedded?:boolean}){
 const [selected,setSelected]=useState<MovementId>('dynastic'),[cancel,setCancel]=useState(false),[recruit,setRecruit]=useState(false),[candidate,setCandidate]=useState('');
 const [petitionOpen,setPetitionOpen]=useState(false),[revoltOpen,setRevoltOpen]=useState(false),[previewOpen,setPreviewOpen]=useState(false);
 const r=realm??currentRealm(w),ownRealm=r===currentRealm(w),c=courtOf(w,r),g=governmentOf(w,r)!;
 useEffect(()=>{setCancel(false);setRecruit(false);setPetitionOpen(false);setRevoltOpen(false);setPreviewOpen(false);},[r]);
 if(!c)return null;
 const own=c.members[w.characterId!]??'unaligned',m=movementMood(w,r,selected),bonus=courtBonus(w,r),projection=courtMonthPreview(w,r),local=courtLocalPressures(w,r),enabled=courtEnabled(w,r);
 const action=(cmd:CourtCommand,label:string,icon:ArtName,detail:string)=>{
  if(!ownRealm)return null;
  const reason=courtReason(w,cmd);
  return <HoverHint label={label} content={<>{detail}{reason&&<p>{reason}</p>}</>}><button className="court-icon-button" aria-label={label} disabled={pending||!!reason} onClick={()=>{if(pending||courtReason(w,cmd))return;send(cmd);}}><ArtIcon name={icon} size={25}/></button></HoverHint>;
 };
 const portrait=(id:string)=><button className="faction-person" key={id} onClick={()=>onPerson(id)} aria-label={'查看'+politicalName(id)}><CharacterPortrait characterId={id} world={w} compact/><span>{politicalName(id)}</span></button>;
 const cancelCommand={type:'court',action:'cancel'} as const;
 return <div className="court-situation-desk">
  <section className="court-factions court-desk-column">
   <header className="court-desk-heading detail-landscape detail-landscape--court"><h3>政治集团</h3><small>{ownRealm?'你的归属 · '+movements[own].name:'他国集团'}</small></header>
   <div className="court-group-select court-group-ledger" aria-label="政治集团势力与满意度">{movementIds.map(group=>{const mood=movementMood(w,r,group);return <button key={group} aria-label={'查看'+movements[group].name+'，势力 '+mood.share+'%，满意度 '+mood.satisfaction} aria-pressed={selected===group} onClick={()=>setSelected(group)}>{mood.leader?<CharacterPortrait characterId={mood.leader} world={w} compact/>:<ArtIcon name={icons[group]} size={32}/>}<span><strong>{movements[group].name}</strong><small>{mood.leader?politicalName(mood.leader):'无领袖'} · {movements[group].goal}</small></span><span className="court-group-numbers"><b>{mood.share}%</b><small>满意 {mood.satisfaction}</small><meter min={0} max={100} value={mood.satisfaction} aria-label={movements[group].name+'满意度'}/></span></button>;})}</div>
   <div className="court-scroll-list court-faction-detail">
    <header><ArtIcon name={icons[selected]} size={28}/><h4>{movements[selected].name}</h4><b>{m.share}%</b></header>
    <p>{movements[selected].goal}</p>
    {c.favored===selected&&<small className="court-favored">朝廷眷顾</small>}
    <div className="court-faction-metrics">
     <HoverHint label="集团势力来源" content={<>{m.members.map(id=><div key={id}><strong>{politicalName(id)}</strong>{movementPowerParts(w,r,id).filter(p=>p.value).map(p=><p key={p.label}>{p.label} +{p.value}</p>)}</div>)}</>}><span tabIndex={0}>势力 <b>{m.power}</b></span></HoverHint>
     <HoverHint label="满意度来源" content={<>{m.factors.map(f=><p key={f.label}>{f.label} {f.value>0?'+':''}{f.value}</p>)}{!m.factors.length&&'未结党或无成员不施加集团影响。'}</>}><span tabIndex={0}>满意 <b>{m.satisfaction}</b></span></HoverHint>
     <span>月紧张 <b>{m.tension>0?'+':''}{m.tension}</b></span><span>月支持 <b>{m.support>0?'+':''}{m.support}</b></span>
    </div>
    <div className="court-faction-positions">{([['appointment','任官'],['reform','改革'],['tax','征税'],['military','军务'],['migration','迁民'],['welfare','赈济'],['commerce','商贸']] as [PolicyDomain,string][]).map(([domain,label])=>{const part=politicalAction(w,r,domain).parts.find(p=>p.id===selected);return part?.value?<HoverHint key={domain} label={label+'立场'} content={'本集团影响 '+part.value+'；汇合其他集团后影响朝野支持、局势紧张及相关差事办理效率。'}><span tabIndex={0}>{label} <b>{part.value>0?'支持':'反对'}</b></span></HoverHint>:null;})}</div>
    {m.leader&&<div className="court-faction-leader">{portrait(m.leader)}<span>集团领袖<small>{m.members.length} 位成员</small></span></div>}
    <div className="faction-members">{m.members.filter(id=>id!==m.leader).map(portrait)}</div>
   </div>
   <div className="court-faction-actions">
    {g.ruler!==w.characterId&&action({type:'court',action:'join',group:selected},'加入'+movements[selected].name,'person','10 影响力，换党冷却 90 日。')}
    {selected!=='unaligned'&&action({type:'court',action:'favor',group:selected},'眷顾'+movements[selected].name,'renown','20 影响力，冷却 90 日；本派满意 +20，他派 −10。')}
    {ownRealm&&own===selected&&g.ruler!==w.characterId&&<>
     {action({type:'court',action:'debate'},'主持清议','diligent','30 私人钱；个人势力 +25，持续及冷却 180 日。')}
     {action({type:'court',action:'petition'},'集团奏议','influence','领袖消耗 15 影响力；15 日待决。批准由执政者支付 20 影响力与公款 80；缺额最多续候 60 日，冷却 90 日。')}
     <HoverHint label="游说同道" content="个人钱 30、影响力 10；选择目标比较接受度与条件，确认后才执行。"><button className="court-icon-button" aria-label="游说同道" disabled={pending} onClick={()=>{setCandidate('');setRecruit(true);}}><ArtIcon name="gregarious" size={25}/></button></HoverHint>
    </>}
    {ownRealm&&g.ruler!==w.characterId&&<HoverHint label="起兵与另立" content="查看起兵的集团支持、条件与实际后果。"><button className="court-icon-button" aria-label="查看起兵与另立条件" onClick={()=>setRevoltOpen(true)}><ArtIcon name="army" size={25}/></button></HoverHint>}
   </div>
   {ownRealm&&c.petition&&<div className="court-petition-pending"><span>{movements[c.petition.group].name}奏议<small>{c.petition.due<=w.day?'候裁决':'余 '+(c.petition.due-w.day)+' 日'}</small></span><HoverHint label="查看集团奏议" content={'由 '+politicalName(c.petition.sponsor)+' 呈奏；批复仍受实际权限、钱粮与日期限制。'}><button className="court-icon-button" aria-label="查看集团奏议" onClick={()=>setPetitionOpen(true)}><ArtIcon name="influence" size={25}/></button></HoverHint></div>}
  </section>
  <section className="court-outlook court-desk-column">
   <header className="court-desk-heading detail-landscape detail-landscape--court"><h3>朝局</h3><HoverHint label="阶段画像预览" content="比较安定、动荡与危局的画像及规则，不改变实际局势。"><button className="court-icon-button" aria-label="打开阶段画像预览" onClick={()=>setPreviewOpen(true)}><ArtIcon name="renown" size={25}/></button></HoverHint></header>
   <SituationWheel phase={c.phase} tension={c.tension} realm={<RealmBadge realm={r} world={w}/>} interactive={false}/>
   <HoverHint label="局势阈值与增益" content={<>每月 1 日结算；紧张 40 转入动荡、80 转入危局，合法性低于 15 也会进入危局。动荡须降至 35 以下恢复；危局须降至 70 以下且合法性至少 20 才缓解。税收 {bonus.tax}% · 军饷 {bonus.pay}% · 攻击 {bonus.attack}%。</>}><div className="court-outlook-forecast" tabIndex={0}><strong>{policies[c.policy].name}</strong><span>{enabled?(nextMonthStart(w.day,w.scriptId)-w.day)+' 日后月结':'暂停结算'}</span><b>{enabled?(projection.delta>=0?'+':'')+projection.delta:'—'}</b><small>{enabled?'条件预估 '+phases[projection.phase].name:'当前政体暂停集团与局势结算'}</small></div></HoverHint>
   <div className="court-scroll-list court-catalysts">
    {projection.causes.map(v=><div className="court-catalyst" key={v.label}><span>{v.label}</span><b>{v.value>0?'+':''}{v.value}</b></div>)}
    <HoverHint label="月结预估口径" content="依次结算官署、积弊、集团支持与局势；假设当前战争、任职和地方财赋条件保持，月结前的新变化会影响结果。"><span className="court-calculation-note" tabIndex={0}><ArtIcon name="diligent" size={20}/>条件预估</span></HoverHint>
    {c.settlement&&<section className="court-last-settlement"><h4>最近月结</h4><p>紧张 {c.settlement.tensionBefore} → {c.settlement.tensionAfter} · 支持 {c.settlement.supportDelta>=0?'+':''}{c.settlement.supportDelta} · 积弊 {c.settlement.corruptionDelta>=0?'+':''}{c.settlement.corruptionDelta}</p><HoverHint label="月结原因" content={c.settlement.causes.map(v=><p key={v.label}>{v.label} {v.value>0?'+':''}{v.value}</p>)}><span tabIndex={0}>查阅月结依据</span></HoverHint></section>}
   </div>
   <div className="court-outlook-actions">
    <HoverHint label="积弊" content="当前积弊存量，0—100，参与官署与朝局月结。"><span tabIndex={0}>积弊 <b>{c.corruption}</b></span></HoverHint>
    {action({type:'court',action:'audit'},'整饬吏治','diligent','60 公款、15 影响力；积弊 −20、紧张 −10、支持 −3，冷却 90 日。')}
   </div>
   {ownRealm&&c.founding&&<section className="court-founding"><header><strong>{c.founding.name} · 承统</strong><HoverHint label="撤回承统议程" content="撤回后已付成本不退。"><button className="court-icon-button" aria-label="撤回承统议程" disabled={pending||!!courtReason(w,cancelCommand)} onClick={()=>setCancel(true)}><ArtIcon name="wary" size={23}/></button></HoverHint></header><progress max={120} value={c.founding.progress}/><small>{foundingPause(w,r)||`${c.founding.progress} / 120 日`}</small></section>}
  </section>
  <section className="court-pressure court-desk-column">
   <header className="court-desk-heading detail-landscape detail-landscape--court"><h3>地方压力</h3><HoverHint label="承压人口" content={'承压地区 '+local.population.toLocaleString()+' 人，本国总人口 '+local.total.toLocaleString()+' 人。'}><small tabIndex={0}>{local.affected.length} 处</small></HoverHint></header>
   <div className="court-scroll-list">
    {local.affected.map(v=><article className="court-pressure-place" key={v.site}>
     <header><button onClick={()=>onTerritory?.(countyTerritory(v.site))}>{siteById[v.site].name}</button>{ownRealm&&<HoverHint label={v.tasks.length?'查看地方案卷':'安排地方应对'} content={!v.tasks.length&&w.realm!.cities[v.site].controller!==r?'该地未由本国控制，须先恢复控制再安排治理差事':'打开本地案卷，或带入地点拟定差事。'}><button className="court-icon-button" aria-label={(v.tasks.length?'查看案卷 · ':'安排地方应对 · ')+siteById[v.site].name} disabled={!v.tasks.length&&w.realm!.cities[v.site].controller!==r} onClick={()=>onService?.(v.tasks[0],v.site)}><ArtIcon name="diligent" size={23}/>{v.tasks.length>0&&<b>{v.tasks.length}</b>}</button></HoverHint>}</header>
     <p>秩序 <b>{v.order}</b> · 本期民食缺口 <b>{v.deficit}</b></p>
     {v.governor&&<button className="court-responsible-person" onClick={()=>onPerson(v.governor!)}><CharacterPortrait characterId={v.governor} world={w} compact/><span>当地责任官<strong>{politicalName(v.governor)}</strong></span></button>}
    </article>)}
    {!local.affected.length&&<p className="court-empty">当前没有已录承压地区</p>}
   </div>
  </section>
  {previewOpen&&<ActionDialog title="朝局阶段画像 · 仅供预览" onClose={()=>setPreviewOpen(false)} cancelLabel="返回朝局" actions={null}><SituationWheel phase={c.phase} tension={c.tension} realm={<RealmBadge realm={r} world={w}/>} /></ActionDialog>}
  {petitionOpen&&ownRealm&&c.petition&&<ActionDialog title="集团奏议" onClose={()=>setPetitionOpen(false)} cancelLabel="返回朝局" actions={null}><CourtPetitionAudience world={w} pending={pending} send={command=>{send(command);setPetitionOpen(false);}} onPerson={onPerson}/></ActionDialog>}
  {revoltOpen&&ownRealm&&g.ruler!==w.characterId&&<ActionDialog title="起兵与另立" onClose={()=>setRevoltOpen(false)} cancelLabel="返回朝局" actions={null}><CivilWarPanel world={w} pending={pending} send={send} onPerson={onPerson}/></ActionDialog>}
  {cancel&&c.founding&&<ConfirmAction title="撤回承统议程？" detail="已付成本不退，承统进度终止。" confirmLabel="确认撤回" danger pending={pending||!!courtReason(w,cancelCommand)} onCancel={()=>setCancel(false)} onConfirm={()=>{if(pending||courtReason(w,cancelCommand))return;send(cancelCommand);setCancel(false);}}/>}
  {recruit&&<PersonSelectionDialog world={w} title="游说同道" value={candidate} onSelect={setCandidate} onClose={()=>setRecruit(false)} pending={pending} description="个人钱 30、影响力 10；接受度须达到 50。成功后加入你的集团，冷却 30 日。" options={Object.keys(c.members).filter(id=>id!==w.characterId).map(id=>({id,score:movementPower(w,r,id),metric:'个人势力',reason:courtReason(w,{type:'court',action:'convince',target:id})}))} confirmLabel="游说加入" onConfirm={()=>{const command={type:'court',action:'convince',target:candidate} as const;if(pending||courtReason(w,command))return;send(command);setRecruit(false);}}/>}
 </div>;
}

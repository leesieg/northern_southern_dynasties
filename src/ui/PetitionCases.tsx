import {PetitionAudience} from './PetitionAudience';
import {assignmentTemplates} from '../data/assignments';
import {movements} from '../data/court';
import {courtOf,courtReason,type CourtCommand} from '../core/court';
import {chiefOfDuty,dutyPlans,dutyReason,type DutyCommand} from '../core/duties';
import {serviceReason,type Assignment,type ServiceCommand} from '../core/assignments';
import {servicePayer} from '../core/serviceMandates';
import {localMeritFactors,localReason,localInfluenceCost,localTitle,type LocalCommand,type LocalRequest} from '../core/localAdministration';
import {accountName,fiscalReason,grantFactors,grantPurposes,grantSource,publicBalance,type FiscalCommand,type GrantRequest} from '../core/treasury';
import {officeName} from '../core/officeEligibility';
import {playerRealm} from '../core/realm';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';

type Props={world:World;pending:boolean;send:(command:GameCommand)=>Promise<boolean>;onPerson?:(person:string)=>void};

export function CourtPetitionAudience({world:w,pending,send,onPerson}:Props){
 const petition=courtOf(w)?.petition;if(!petition)return null;
 const r=playerRealm(w),name=movements[petition.group].name;
 return <PetitionAudience identity={`court:${petition.sponsor}:${petition.due}`} world={w} person={petition.sponsor} realm={r} subject={`${name}奏议`} role={petition.due<=w.day?'候执政者核定钱粮与影响力':`集团请议 · 余 ${petition.due-w.day} 日`} speech={`臣等请议${movements[petition.group].goal}，望朝廷裁决。`} terms={<div className="service-audience-terms"><span>中央国库公款 <b>80</b></span><span>本国影响力 <b>20</b></span></div>} options={[{id:'approve',title:'准其奏议',description:'支持 +5、紧张 −8，眷顾集团并调整施政方向或合法性；不改写持续治理规则。',command:{type:'court',action:'resolve',accept:true}},{id:'reject',title:'此议不准',description:'不拨款；支持 −5、紧张 +8。',command:{type:'court',action:'resolve',accept:false}}]} reason={command=>courtReason(w,command as CourtCommand)} pending={pending} send={send} onPerson={onPerson}/>;
}

export function FiscalPetitionAudience({world:w,pending,send,onPerson,request:q}:Props&{request:GrantRequest}){
 const territory=q.territory??'city:'+q.site,source=grantSource(w,q.realm,territory,q.approver);
 return <PetitionAudience identity={`fiscal:${q.id}:${q.status}`} world={w} person={q.actor} realm={q.realm} subject={`${localTitle(territory)} · ${grantPurposes[q.purpose]}`} role="地方请款" speech={`臣请拨公款 ${q.amount}，用于${grantPurposes[q.purpose]}，以济${siteById[q.site].name}之需。`} terms={<div className="service-audience-terms"><span>请拨公款 <b>{q.amount}</b></span><span>{accountName(source)}现有 <b>{publicBalance(w,source)}</b></span></div>} options={[{id:'approve',title:'准予拨款',description:`从${accountName(source)}划转 ${q.amount} 钱至申请辖区公库。`,command:{type:'fiscal',action:'approve',id:q.id}},{id:'reject',title:'此款暂不拨',description:'申请结案，不划转公款。',command:{type:'fiscal',action:'reject',id:q.id}}]} reason={command=>fiscalReason(w,command as FiscalCommand)} pending={pending} send={send} onPerson={onPerson} detailLabel="查看请款依据" details={<p>{grantFactors(w,q).map(f=>`${f.label} ${f.value>=0?'+':''}${f.value}`).join(' · ')}。此为审批参考，不代替公库与职权校验。</p>}/>;
}

export function LocalPetitionAudience({world:w,pending,send,onPerson,request:q}:Props&{request:LocalRequest}){
 return <PetitionAudience identity={`local:${q.id}:${q.status}`} world={w} person={q.actor} realm={q.realm} subject={`${localTitle(q.territory)} · 授官奏请`} role={`候批 · 余 ${Math.max(0,60-w.day+q.created)} 日`} speech={`臣请以${officeName(q.candidate,w)}出任${localTitle(q.territory)}，望准予授官。`} terms={<div className="service-audience-terms"><span>候选人 <b>{officeName(q.candidate,w)}</b></span></div>} options={[{id:'approve',title:'准予授官',description:`本人影响力 ${localInfluenceCost(w,{type:'local',action:'approve',id:q.id})}；发出赴任文书，撤换与破格后果依当前规则结算。`,command:{type:'local',action:'approve',id:q.id}},{id:'reject',title:'此任暂缓',description:'不授此职，申请结案。',command:{type:'local',action:'reject',id:q.id}}]} reason={command=>localReason(w,command as LocalCommand)} pending={pending} send={send} onPerson={onPerson} detailLabel="查看候选依据" details={<p>{localMeritFactors(w,q.territory,q.candidate,q.approver,q.realm).map(f=>`${f.label} ${f.value>=0?'+':''}${f.value}`).join(' · ')}</p>}/>;
}

export function ServiceExtraAudience({world:w,pending,send,onPerson,task:t}:Props&{task:Assignment}){
 if(t.phase!=='aid'&&t.phase!=='report')return null;
 const payer=servicePayer(w,t,w.characterId!),aid=t.phase==='aid';
 return <PetitionAudience identity={`service:${t.id}:${t.phase}`} world={w} person={t.officer} realm={t.realm} subject={`${siteById[t.site].name} · ${assignmentTemplates[t.kind].name}`} role={aid?'请求追加':'呈报考绩'} speech={aid?'办理遇阻，臣请追加公款 20，以续此事。':`臣已将${assignmentTemplates[t.kind].name}办结，谨呈功过，请核定考绩。`} terms={<div className="service-audience-terms">{aid?<><span>追加公款 <b>20</b></span><span>从{accountName(payer.account)}拨付</span></>:<><span>已用公款 <b>{t.spent?.coins??0}</b></span><span>已用公粮 <b>{t.spent?.grain??0}</b></span></>}</div>} options={aid?[{id:'grant',title:'准予追加',description:`从${accountName(payer.account)}追加 20 公款到差事专款。`,command:{type:'service',action:'grant',id:t.id}},{id:'deny',title:'不予追加',description:'不增加专款，承办人须另作安排。',command:{type:'service',action:'deny',id:t.id}}]:[{id:'close',title:'核定考绩并结案',description:'按实际支出、质量与贡献结算，未用专款原路退回。',command:{type:'service',action:'close',id:t.id}}]} reason={command=>serviceReason(w,command as ServiceCommand)} pending={pending} send={send} onPerson={onPerson}/>;
}

export function DutyPetitionAudience({world:w,pending,send,onPerson}:Props){
 const t=w.duties?.task;if(!t||!['approval','aid','report'].includes(t.phase)||chiefOfDuty(w)!==w.characterId)return null;
 const approval=t.phase==='approval',aid=t.phase==='aid',plan=t.plan?dutyPlans[t.plan]:null;
 return <PetitionAudience identity={`duty:${t.created}:${t.phase}`} world={w} person={t.officer} realm="west" subject="天水粮务" role={approval?'请批钱粮':aid?'请求追加':'呈报考绩'} speech={approval?`臣拟以「${plan?.name}」筹措天水军民口粮，请核准钱粮。`:aid?'粮队遇险，臣请追加公款 20，以增派护送。':'天水粮务已办结，谨呈考绩。'} terms={<div className="service-audience-terms">{approval?<><span>公款 <b>{plan?.coins}</b></span><span>公粮 <b>{plan?.grain}</b></span></>:aid?<span>追加公款 <b>20</b></span>:<span>限期余 <b>{Math.max(0,t.deadline-w.day)} 日</b></span>}</div>} options={approval?[{id:'approve',title:'核准并拨款',description:`从中央国库拨公款 ${plan?.coins}、公粮 ${plan?.grain}。`,command:{type:'duty',action:'approve'}},{id:'revise',title:'退回重拟',description:'暂不拨款，由承办人重拟方案。',command:{type:'duty',action:'revise'}}]:aid?[{id:'grant',title:'批准追加',description:'从中央国库追加 20 公款。',command:{type:'duty',action:'grant'}},{id:'deny',title:'不予追加',description:'承办人须另作安排。',command:{type:'duty',action:'deny'}}]:[{id:'close',title:'核定考绩并结案',description:'按实际成果结算地方效果与考绩。',command:{type:'duty',action:'close'}}]} reason={command=>dutyReason(w,command as DutyCommand)} pending={pending} send={send} onPerson={onPerson}/>;
}

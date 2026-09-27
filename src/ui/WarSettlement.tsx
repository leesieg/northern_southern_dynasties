import {ConfirmAction} from './ConfirmAction';
import {CharacterPortrait} from './CharacterPortrait';
import {useState} from 'react';
import {peaceQuote,type War,type PeaceTerms} from '../core/wars';
import {playerRealm,realmReason} from '../core/realm';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import {ArtIcon} from './ArtIcon';
import {RealmBadge} from './RealmBadge';
import {HoverHint} from './HoverHint';
import {politicalName} from '../core/government';

export function WarSettlement({world:w,war,pending,send,onPerson}:{world:World;war:War;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void}){
 const [confirm,setConfirm]=useState<PeaceTerms|null>(null),r=playerRealm(w);
 const portrait=(id:string)=>onPerson?<button type="button" className="career-portrait-link" aria-label={'查看'+politicalName(id)+'详情'} onClick={()=>onPerson(id)}><CharacterPortrait world={w} characterId={id} compact/></button>:<CharacterPortrait world={w} characterId={id} compact/>;
 const effect=(terms:PeaceTerms)=>{const q=peaceQuote(w,war,r,terms);if(war.civil){if(terms==='white')return '赦免停战，恢复输税；既有损失、债务与私产保留。';const claimantWins=terms==='demand'?war.civil.claimant===w.characterId:war.civil.claimant!==w.characterId;return claimantWins?'起兵方取得朝廷，重建公职与统属；既有军饷欠款继续偿还。':'朝廷平定内战，撤免起兵方公职；人物保留私产继续生涯。';}return q.annexes?'攻方接管全部领土、余额与债务，废止旧公职和条约，并承担一年额外行政费用。':terms==='white'?'不割地或赔款，双方撤军并进入 360 日停战期。':q.takesLand?`攻方取得${siteById[war.target].name}，双方撤军并进入 360 日停战期。`:q.tributary?'败方承认宗属并定期朝贡，双方撤军并进入 360 日停战期。':q.coins?`败方支付 ${q.coins} 钱；不足额形成债务分期偿还，双方撤军并进入 360 日停战期。`:'放弃本次进攻要求，双方撤军并进入 360 日停战期。';};
 const labels={white:'白和平',demand:war.civil?(war.civil.claimant===w.characterId?'要求交权':'要求归顺'):r===war.attacker?'索取目标':'迫使撤军',yield:'接受要求'};
 return <section className="city-war-status"><div className="war-settlement-heading">{war.civil?<div className="career-commander">{portrait(war.civil.claimant)}<ArtIcon name="army" size={24}/>{portrait(war.civil.loyalist)}</div>:<><RealmBadge world={w} realm={war.attacker}/><ArtIcon name="army" size={24}/><RealmBadge world={w} realm={war.defender}/></>}</div><p>{war.civil?'内战 · '+war.civil.name:({territory:'争夺',reparations:'索取赔款',tributary:'迫使称臣',annexation:'吞并政权'})[war.goal??'territory']} · {siteById[war.target].name} · {w.day-war.started} 日</p><p>攻方压力 {war.score} · 战斗 {war.battles??0}</p><div className="city-policy-grid">{(['white','demand','yield'] as const).map(terms=>{const command={type:'realm',action:'peace',war:war.id,terms} as const,q=peaceQuote(w,war,r,terms),reason=realmReason(w,command);return <div className="war-settlement-choice" key={terms}><HoverHint label={labels[terms]} content={<>{!war.civil&&q.parts.map(p=><p key={p.label}>{p.label} {p.value>0?'+':''}{p.value}</p>)}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason} onClick={()=>setConfirm(terms)}><ArtIcon name={terms==='white'?'steadfast':terms==='demand'?'influence':'frugal'} size={26}/>{labels[terms]}</button></HoverHint><small>{effect(terms)}</small>{reason&&<small className="service-warning">{reason}</small>}</div>;})}</div>{confirm&&<ConfirmAction title={'确认议和 · '+labels[confirm]} detail={effect(confirm)} confirmLabel='签订和约' danger pending={pending||!!realmReason(w,{type:'realm',action:'peace',war:war.id,terms:confirm})} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(pending||realmReason(w,{type:'realm',action:'peace',war:war.id,terms:confirm}))return;send({type:'realm',action:'peace',war:war.id,terms:confirm});setConfirm(null);}}/>}</section>;
}

import {CharacterPortrait} from './CharacterPortrait';
import {useState} from 'react';
import {peaceQuote,type War,type PeaceTerms} from '../core/wars';
import {playerRealm,realmReason} from '../core/realm';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import {ArtIcon} from './ArtIcon';
import {RealmBadge} from './RealmBadge';
import {HoverHint} from './HoverHint';
export function WarSettlement({world:w,war,pending,send}:{world:World;war:War;pending:boolean;send:(c:GameCommand)=>void}){
 const [confirm,setConfirm]=useState<PeaceTerms|null>(null),r=playerRealm(w);
 return <section className="city-war-status"><h4>{war.civil?<div className="career-commander"><CharacterPortrait world={w} characterId={war.civil.claimant} compact/><ArtIcon name="army" size={24}/><CharacterPortrait world={w} characterId={war.civil.loyalist} compact/></div>:<><RealmBadge world={w} realm={war.attacker}/><ArtIcon name="army" size={24}/><RealmBadge world={w} realm={war.defender}/></>}</h4><p>{war.civil?'内战 · '+war.civil.name:({territory:'争夺',reparations:'索取赔款',tributary:'迫使称臣',annexation:'吞并政权'})[war.goal??'territory']} · {siteById[war.target].name} · {w.day-war.started} 日</p><p>攻方压力 {war.score} · 战斗 {war.battles??0}</p><div className="city-policy-grid">{(['white','demand','yield'] as const).map(terms=>{
 const command={type:'realm',action:'peace',war:war.id,terms} as const,q=peaceQuote(w,war,r,terms),reason=realmReason(w,command),label=({white:'白和平',demand:war.civil?(war.civil.claimant===w.characterId?'要求交权':'要求归顺'):r===war.attacker?'索取目标':'迫使撤军',yield:'接受要求'})[terms];
 return <HoverHint key={terms} label={label} content={<><strong>{label}</strong><p>{war.civil?'内战和约决定朝廷归属；军队、财政与战争损害按实际状态保留。':q.annexes?'接管全部领土、余额与债务；废止旧公职和条约，支付一年接管行政费用。':terms==='white'?'无新增割地赔款，返还双方占领。':q.takesLand?'割让目标城市。':q.tributary?'承认宗属，每期朝贡。':q.coins?`赔款 ${q.coins}，不足部分每期偿还 50。`:'对方放弃本次进攻要求。'}</p>{q.parts.map(p=><p key={p.label}>{p.label} {p.value>0?'+':''}{p.value}</p>)}<p>{reason||'对方接受；双方军队按和约撤离，停战 360 日。'}</p></>}><button disabled={pending||!!reason} onClick={()=>setConfirm(terms)}><ArtIcon name={terms==='white'?'steadfast':terms==='demand'?'influence':'frugal'} size={26}/>{label}</button></HoverHint>;
 })}</div>{confirm&&<div className="diplomacy-decision"><p>确认提交此项和约？生效后按条款交割。</p><button disabled={pending||!!realmReason(w,{type:'realm',action:'peace',war:war.id,terms:confirm})} onClick={()=>{send({type:'realm',action:'peace',war:war.id,terms:confirm});setConfirm(null);}}>确认和约</button><button onClick={()=>setConfirm(null)}>取消</button></div>}</section>;
}

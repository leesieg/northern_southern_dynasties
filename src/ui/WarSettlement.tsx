import {ConfirmAction} from './ConfirmAction';
import {CharacterPortrait} from './CharacterPortrait';
import {useEffect,useState} from 'react';
import {peaceQuote,warRealmSide,type War,type PeaceTerms} from '../core/wars';
import {capital,playerRealm,realmReason} from '../core/realm';
import {planRoute} from '../core/world';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import {ArtIcon} from './ArtIcon';
import {RealmBadge} from './RealmBadge';
import {HoverHint} from './HoverHint';
import {politicalName,regimeName} from '../core/government';

export function WarSettlement({world:w,war,pending,send,onPerson}:{world:World;war:War;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void}){
 const [confirm,setConfirm]=useState<PeaceTerms|null>(null),[claims,setClaims]=useState<string[]>([]),[extraCoins,setExtraCoins]=useState(0),r=playerRealm(w);
 useEffect(()=>{setConfirm(null);setClaims([]);setExtraCoins(0);},[war.id,war.target]);
 const target=w.realm!.cities[war.target],attacking=w.realm!.armies.filter(a=>warRealmSide(war,a.realm)==='attack').reduce((n,a)=>n+a.troops,0),defending=w.realm!.armies.filter(a=>warRealmSide(war,a.realm)==='defend').reduce((n,a)=>n+a.troops,0);
 const isLeader=r===war.attacker||r===war.defender;
 const occupied=Object.entries(w.realm!.cities).filter(([,c])=>c.owner!=='frontier'&&c.controller!=='frontier'&&warRealmSide(war,c.owner)&&warRealmSide(war,c.controller)&&warRealmSide(war,c.owner)!==warRealmSide(war,c.controller)).map(([id])=>id);
 const link=target.controller===war.attacker&&!!planRoute(capital(war.attacker),war.target,id=>w.realm!.cities[id].controller===war.attacker);
 const canCombine=(war.goal??'territory')==='territory'&&r===war.attacker&&!war.civil;
 const claimOptions=canCombine?occupied.filter(id=>id!==war.target&&w.realm!.cities[id].owner===war.defender):[];
 const commandFor=(terms:PeaceTerms)=>({type:'realm',action:'peace',war:war.id,terms,claims:terms==='demand'?claims:undefined,extraCoins:terms==='demand'?extraCoins:0} as const);
 const quoteFor=(terms:PeaceTerms)=>peaceQuote(w,war,r,terms,terms==='demand'?claims:[],terms==='demand'?extraCoins:0);
 const portrait=(id:string)=>onPerson?<button type="button" className="career-portrait-link" aria-label={'查看'+politicalName(id)+'详情'} onClick={()=>onPerson(id)}><CharacterPortrait world={w} characterId={id} compact/></button>:<CharacterPortrait world={w} characterId={id} compact/>;
 const effect=(terms:PeaceTerms)=>{
  const q=quoteFor(terms);
  if(war.civil){if(terms==='white')return '赦免停战，恢复输税；既有损失、债务与私产保留。';const claimantWins=terms==='demand'?war.civil.claimant===w.characterId:war.civil.claimant!==w.characterId;return claimantWins?'起兵方取得朝廷，重建公职与统属；既有军饷欠款继续偿还。':'朝廷平定内战，撤免起兵方公职；人物保留私产继续生涯。';}
  const returning=occupied.filter(id=>!q.annexes&&!q.lands.includes(id));
  const connected=q.takesLand&&!!planRoute(capital(war.attacker),war.target,id=>w.realm!.cities[id].controller===war.attacker&&(w.realm!.cities[id].owner===war.attacker||q.lands.includes(id)));
  const outcome=q.annexes?'攻方接管全部领土、余额与债务，并进入地方接管期。':terms==='white'?'不割地或赔款。':q.takesLand?'攻方取得'+q.lands.map(id=>siteById[id].name).join('、')+'县域，进入地方接管期'+(connected?'':'；议和后目标与本土不相连，接管进度将停滞并持续产生行政费用')+'。'+(q.coins?'另获赔款 '+q.coins+' 钱，不足额形成债务分期偿还。':''):q.tributary?'败方承认宗属并定期朝贡。':q.coins?'败方支付 '+q.coins+' 钱；不足额形成债务分期偿还。':'放弃本次进攻要求。';
  return outcome+(returning.length?' 其余占领归还：'+returning.map(id=>siteById[id].name).join('、')+'。':'')+' 双方撤军，停战 360 日。';
 };
 const labels={white:'白和平',demand:war.civil?(war.civil.claimant===w.characterId?'要求交权':'要求归顺'):r===war.attacker?'索取目标':'迫使撤军',yield:'接受要求'};
 return <section className="city-war-status"><div className="war-settlement-heading">{war.civil?<div className="career-commander">{portrait(war.civil.claimant)}<ArtIcon name="army" size={24}/>{portrait(war.civil.loyalist)}</div>:<><RealmBadge world={w} realm={war.attacker}/><ArtIcon name="army" size={24}/><RealmBadge world={w} realm={war.defender}/></>}</div><p>{war.civil?'内战 · '+war.civil.name:({territory:'争夺',reparations:'索取赔款',tributary:'迫使称臣',annexation:'吞并政权'})[war.goal??'territory']} · {siteById[war.target].name} · {w.day-war.started} 日</p><p>攻方压力 {war.score} · 战斗 {war.battles??0}</p>{!war.civil&&<div className="war-settlement-facts"><p>目标：法理 {regimeName(w,target.owner)} · 实控 {regimeName(w,target.controller)}{target.occupiedSince!==undefined?' · 已控制 '+(w.day-target.occupiedSince)+' 日':''}</p>{Object.entries(war.allies??{}).length>0&&<p>参战盟国：{Object.entries(war.allies??{}).map(([id,side])=>regimeName(w,id as typeof war.attacker)+(side==='attack'?'助攻':'助守')).join('、')}</p>}<p>现役（含盟军）：攻方 {attacking} 人 · 守方 {defending} 人；野战损失：攻方 {war.casualties?.attack??0} · 守方 {war.casualties?.defend??0}</p><p>已占领：{occupied.length?occupied.map(id=>siteById[id].name).join('、'):'无'}{target.controller===war.attacker?' · '+(link?'目标与攻方都城道路可通':'目标与攻方都城无己方控制通路'):''}</p></div>}{canCombine&&<fieldset className="war-settlement-claims"><legend>组合议和条款</legend><p>额外县域须实际占领并沿己方控制道路连到目标，每处使议价降低 25。</p><div>{claimOptions.map(id=><label key={id}><input type="checkbox" checked={claims.includes(id)} disabled={pending||!claims.includes(id)&&claims.length>=3} onChange={()=>{setClaims(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);setConfirm(null);}}/>{siteById[id].name}</label>)}</div><label>附加赔款 <select value={extraCoins} disabled={pending} onChange={e=>{setExtraCoins(Number(e.target.value));setConfirm(null);}}><option value={0}>无</option><option value={100}>100 钱 · 议价 −10</option><option value={300}>300 钱 · 议价 −30</option></select></label></fieldset>}{!isLeader&&<p className="military-note">本国以盟军身份参战；军队自行行动，和约由战争主导国签订。</p>}{isLeader&&<div className="city-policy-grid">{(['white','demand','yield'] as const).map(terms=>{const command=commandFor(terms),q=quoteFor(terms),reason=realmReason(w,command),total=q.parts.reduce((n,p)=>n+p.value,0);return <div className="war-settlement-choice" key={terms}><HoverHint label={labels[terms]} content={<>{!war.civil&&q.parts.map(p=><p key={p.label}>{p.label} {p.value>0?'+':''}{p.value}</p>)}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason} onClick={()=>setConfirm(terms)}><ArtIcon name={terms==='white'?'steadfast':terms==='demand'?'influence':'frugal'} size={26}/>{labels[terms]}</button></HoverHint>{!war.civil&&<small>议价依据合计 {total}{terms==='demand'?' · 需不低于 0':''}</small>}<small>{effect(terms)}</small>{reason&&<small className="service-warning">{reason}</small>}</div>;})}</div>}{isLeader&&confirm&&<ConfirmAction title={'确认议和 · '+labels[confirm]} detail={effect(confirm)} confirmLabel='签订和约' danger pending={pending||!!realmReason(w,commandFor(confirm))} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(pending||realmReason(w,commandFor(confirm)))return;send(commandFor(confirm));setConfirm(null);}}/>}</section>;
}

import {useContext,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {activeWars,warRealmSide,type War} from '../core/wars';
import {warArmySide,warCitySide} from '../core/civilWars';
import {warScoreBreakdown} from '../core/warScoring';
import {militaryArmyView} from '../core/militaryView';
import {fortificationLevel} from '../core/realm';
import {armyCommander} from '../core/mobility';
import {politicalName,regimeName} from '../core/government';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';
import {DetailTabs} from './DetailTabs';
import {RealmBadge,RealmNavigation} from './RealmBadge';
import {ArtIcon} from './ArtIcon';
import {WarSettlement} from './WarSettlement';
import {battleKey,warBattles,warOccupations,type EngagementRef} from './warPresentation';
import './warDetails.css';

type Props={world:World;war:War;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void;onRealm?:(id:War['attacker'])=>void};
const goalNames={territory:'割让目标地',reparations:'索取战争赔款',tributary:'确立宗属',annexation:'吞并政权',defection:'接纳归附领地'};
const stageNames={skirmish:'前哨交锋',clash:'主力交战',pursuit:'追击溃军'};
const signed=(n:number)=>(n>0?'+':'')+n;
export function WarDetails({world:w,war,pending,send,onPerson,onRealm}:Props){
 const [tab,setTab]=useState<'overview'|'records'|'peace'>('overview'),[engagement,setEngagement]=useState<EngagementRef|null>(null);
 const score=war.civil?null:warScoreBreakdown(w,war),battles=warBattles(w,war),sieges=(w.realm?.sieges??[]).filter(s=>war.id!==undefined&&s.war===war.id),occupations=warOccupations(w,war),target=w.realm!.cities[war.target];
 return <section className="war-details">
  <div className="war-details-parties">{(['attack','defend'] as const).map(side=>{const realm=side==='attack'?war.attacker:war.defender,leader=war.civil?(side==='attack'?war.civil.claimant:war.civil.loyalist):null,armies=w.realm!.armies.filter(a=>warArmySide(w,war,a)===side),known=armies.every(a=>militaryArmyView(w,a).exact);return <article key={side}><RealmBadge realm={realm} world={w} onOpen={onRealm}/><div><small>{side==='attack'?'进攻方':'防御方'}</small>{leader&&<button onClick={()=>onPerson?.(leader)} disabled={!onPerson}>{politicalName(leader)}</button>}<strong>{known?armies.reduce((n,a)=>n+a.troops,0)+' 人':'现役兵力未详'}</strong><small>累计野战损失 {war.casualties?.[side]??0} 人</small></div><div className="war-allies">{Object.entries(war.allies??{}).filter(([,s])=>s===side).map(([r])=><RealmBadge key={r} realm={r as War['attacker']} world={w} onOpen={onRealm}/>)}</div></article>;})}</div>
  <div className="war-details-objective"><ArtIcon name="army" size={30}/><div><h3>{war.civil?war.civil.name:siteById[war.target].name+'之战'}</h3><p>{war.civil?'争夺朝廷控制权':goalNames[war.goal??'territory']} · {siteById[war.target].name} · 已持续 {Math.max(0,w.day-war.started)} 日</p></div><strong>攻方战分 {signed(score?.total??war.score)}</strong></div>
  <DetailTabs label="战争详情" value={tab} onChange={setTab} items={[{id:'overview',label:'战况',icon:'army'},{id:'records',label:'战报',icon:'diligent'},{id:'peace',label:'议和',icon:'world'}]}/>
  {tab==='overview'&&<div className="war-details-content">
   <div className="war-score"><div className="war-score-labels"><span>守方优势</span><span>攻方优势</span></div><meter min={-100} max={100} value={score?.total??war.score} aria-label="攻方战争分数"/><p>战分表示当前优势，不是战争完成度；战争须经议和或规则结算结束。</p>{score&&<div className="war-facts">{score.parts.map(part=><span key={part.key}>{part.label}<b>{signed(part.value)}</b></span>)}{score?.decisive&&<span>决定性胜负</span>}</div>}</div>
   <div className="war-target"><h4>战争目标 · {siteById[war.target].name}</h4><p>法理归属 {regimeName(w,target.owner)} · 实际控制 {regimeName(w,target.controller)}{war.civil?' · '+(warCitySide(w,war,war.target)==='attack'?'起兵方控制':'原朝廷控制'):''}{target.occupiedSince!==undefined?' · 已占领 '+(w.day-target.occupiedSince)+' 日':''}</p></div>
   <h4>进行中的战役与围城</h4><div className="war-event-list">{battles.filter(b=>b.ended===undefined&&w.day-b.last<=1).map(b=><button key={battleKey(b)} onClick={()=>setEngagement({kind:'battle',key:battleKey(b)})}><ArtIcon name="army" size={24}/><span>{siteById[b.site??'']?.name??'道路'}战役<small>{stageNames[b.stage]} · 第 {b.round} 轮</small></span><b>查看 ›</b></button>)}{sieges.map(s=><button key={s.site+':'+s.side} onClick={()=>setEngagement({kind:'siege',war:s.war,site:s.site,side:s.side})}><ArtIcon name="city" size={24}/><span>{siteById[s.site].name}围城<small>{s.side==='attack'?'攻方':'守方'}围攻 · 进展 {s.progress}/100 · 封锁 {s.blockade??0}%</small></span><b>查看 ›</b></button>)}{!sieges.length&&!battles.some(b=>b.ended===undefined&&w.day-b.last<=1)&&<p>当前没有记录中的交战或围城。</p>}</div>
   <h4>{war.civil?'起兵方当前控制':'本场战争当前占领'}</h4>{war.civil?<p>{war.civil.cities.map(id=>siteById[id]?.name??id).join('、')||'暂无响应城市'}</p>:occupations.length?<div className="war-occupation-list">{occupations.map(([id,c])=><article key={id}><strong>{siteById[id].name}</strong><span>{regimeName(w,c.owner)} → {regimeName(w,c.controller)}</span><small>人口 {c.population.toLocaleString()} · 秩序 {c.order} · 繁荣 {c.prosperity}</small></article>)}</div>:<p>暂无可归属于本场战争的占领。</p>}<p className="war-footnote">占领改变实际控制，法理归属由和约处理。这里展示当前地方状态，不将全部变化归因于战争。</p>
  </div>}
  {tab==='records'&&<div className="war-details-content war-event-list">{battles.map(b=><button key={battleKey(b)} onClick={()=>setEngagement({kind:'battle',key:battleKey(b)})}><ArtIcon name="army" size={24}/><span>{siteById[b.site??'']?.name??'道路'}战役<small>开战后第 {b.day-war.started+1} 日 · {b.ended===undefined?(w.day-b.last<=1?'交战中':'已脱离接触，待归档'):b.winner==='attack'?'攻方获胜':b.winner==='defend'?'守方获胜':b.winner==='draw'?'未分胜负':'结果未详'}</small></span><span>野战成果 {b.scoreDelta===undefined?'待结算':signed(b.scoreDelta)}<small>损失 攻 {b.lossA} / 守 {b.lossB}</small></span></button>)}{!battles.length&&<p>尚无可关联本场战争的战报；旧档未记录的战役不补造。</p>}<p className="war-footnote">战报保留范围以存档为准。野战成果会受战争总分上限影响。</p></div>}
  {tab==='peace'&&<WarSettlement world={w} war={war} pending={pending} send={send} onPerson={onPerson}/>}
  {engagement&&<EngagementDialog world={w} selected={engagement} onClose={()=>setEngagement(null)} onRealm={onRealm}/>}
 </section>;
}
export function WarDetailsDialog({world,warId,onClose,...props}:Omit<Props,'war'>&{warId:number;onClose:()=>void}){
 const navigation=useContext(RealmNavigation);
 const war=activeWars(world).find(w=>w.id===warId);
 return <ActionDialog className="war-details-dialog" title="战争详情" cancelLabel="返回地图" onClose={onClose} actions={null}>{war?<WarDetails key={war.id} world={world} war={war} {...props} onRealm={navigation?id=>{onClose();navigation.open(id);}:undefined}/>:<p role="status">这场战争已结束。当前无待执行的议和操作。</p>}</ActionDialog>;
}
export function EngagementDialog({world:w,selected,onClose,onWar,onRealm}:{world:World;selected:EngagementRef;onClose:()=>void;onWar?:(id:number)=>void;onRealm?:(id:War['attacker'])=>void}){
 const navigation=useContext(RealmNavigation),openRealm=onRealm||navigation?((id:War['attacker'])=>{onClose();if(onRealm)onRealm(id);else navigation?.open(id);}):undefined;
 const battle=selected.kind==='battle'?w.militaryAftermath?.battles.find(b=>battleKey(b)===selected.key):undefined;
 const siege=selected.kind==='siege'?w.realm?.sieges?.find(s=>s.war===selected.war&&s.site===selected.site&&s.side===selected.side):undefined;
 const warId=battle?.war??siege?.war,war=activeWars(w).find(v=>warId!==undefined&&v.id===warId),site=battle?.site??siege?.site,title=(siteById[site??'']?.name??'道路')+(selected.kind==='battle'?'战役':'围城');
 const city=siege?w.realm?.cities[siege.site]:undefined;
 const defenders=siege&&war?w.realm!.armies.filter(a=>a.location===siege.site&&!a.journey&&warArmySide(w,war,a)!==null&&warArmySide(w,war,a)!==siege.side):[];
 const armies=siege&&war?w.realm!.armies.filter(a=>a.location===siege.site&&!a.journey&&!a.withdrawalUntil&&a.troops>=100&&warArmySide(w,war,a)===siege.side):[];
 return <ActionDialog className="war-details-dialog engagement-dialog" title={title} cancelLabel="返回" onClose={onClose} actions={war&&onWar?<button onClick={()=>onWar(war.id!)}>查看所属战争</button>:null}>
  {!battle&&!siege?<p role="status">此战役或围城已结束，或记录已不在当前存档中。</p>:<>
   {battle&&<><div className="war-facts"><span>状态<b>{battle.ended!==undefined?(battle.winner==='attack'?'攻方获胜':battle.winner==='defend'?'守方获胜':battle.winner==='draw'?'未分胜负':'结果未详'):w.day-battle.last<=1?stageNames[battle.stage]:'已脱离接触，待归档'}</b></span><span>交战轮次<b>{battle.round}</b></span><span>持续<b>{(battle.ended??w.day)-battle.day+1} 日</b></span><span>野战成果<b>{battle.scoreDelta===undefined?'待结算':signed(battle.scoreDelta)}</b></span></div><p>累计损失：攻方 {battle.lossA} 人 · 守方 {battle.lossB} 人</p><h4>参战部队与将领</h4><div className="war-unit-list">{(battle.participants??[]).map((p,i)=>{const a=w.realm?.armies.find(a=>a.id===p.army),side=p.side??(war?warRealmSide(war,p.realm):null);return <article key={p.army+':'+i}><RealmBadge world={w} realm={p.realm} onOpen={openRealm}/><span><b>{side==='attack'?'攻方':side==='defend'?'守方':'参战'} · 第 {p.army} 军</b><small>{p.commander?politicalName(p.commander):'无统帅'} · 参战时身份</small></span><span>{a&&militaryArmyView(w,a).exact?'现存 '+a.troops+' 人':a?militaryArmyView(w,a).strength:'部队已不在现役'}</span></article>;})}</div>{!battle.participants?.length&&<p>此记录没有保存参战将领与部队快照。</p>}</>}
   {siege&&<><div className="war-facts"><span>围攻方<b>{siege.side==='attack'?'战争攻方':'战争守方'}</b></span><span>围城进展<b>{siege.progress}/100</b></span><span>封锁程度<b>{siege.blockade??0}%</b></span><span>城防缺口<b>{siege.breach??0}</b></span></div><progress value={siege.progress} max={100} aria-label="围城进展"/><p>{siege.playerDecision?'等待守城主官裁定':siege.nextPhase!==undefined?(siege.nextPhase<=w.day?'等待阶段结算':'下一阶段评议：'+(siege.nextPhase-w.day)+' 日后'):'阶段评议时间未记录'}{siege.started!==undefined?' · 已围城 '+(w.day-siege.started)+' 日':''}</p><p>{siege.event??'尚无阶段战报'}</p><p className="war-footnote">进展达到 100 不等于必定攻陷；封锁、城防、补给与阶段结果共同影响围城。</p><h4>守城情况</h4>{city&&<p>实控 {regimeName(w,city.controller)} · 守城主官 {city.governor?politicalName(city.governor):"空缺"} · 城防 {fortificationLevel(w,siege.site)} 级 · 秩序 {city.order}</p>}<div className="war-unit-list">{defenders.map(a=><article key={a.id}><RealmBadge world={w} realm={a.realm} onOpen={openRealm}/><span><b>驻城第 {a.id} 军</b><small>{armyCommander(w,a)?politicalName(armyCommander(w,a)!):"无统帅"}</small></span><span>{militaryArmyView(w,a).strength}{militaryArmyView(w,a).exact?" 人":""}</span></article>)}</div>{!defenders.length&&<p>无本场守方现役驻城军队。</p>}<h4>当前围城军队</h4><div className="war-unit-list">{armies.map(a=><article key={a.id}><RealmBadge world={w} realm={a.realm} onOpen={openRealm}/><span><b>第 {a.id} 军</b><small>{armyCommander(w,a)?politicalName(armyCommander(w,a)!):'无统帅'}</small></span><span>{militaryArmyView(w,a).strength}{militaryArmyView(w,a).exact?' 人':''}</span></article>)}</div>{!armies.length&&<p>围城军队已离开，残余进展按规则衰减。</p>}</>}
  </>}
 </ActionDialog>;
}

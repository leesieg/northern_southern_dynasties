import {CombatDetails as EngagementDialog} from './CombatDetails';
import {warTargetName,warObjectiveSites} from '../core/warTerritories';
import {terrainSceneStyle} from './terrainScene';
import {HoverHint} from './HoverHint';
import {warCaptives} from '../core/warCaptives';
import {CharacterPortrait} from './CharacterPortrait';
import {useContext,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {activeWars,warRealmSide,type War} from '../core/wars';
import {warArmySide,warCitySide} from '../core/civilWars';
import {warScoreBreakdown,warWillToContinue} from '../core/warScoring';
import {militaryArmyView} from '../core/militaryView';
import {playerRealm} from '../core/realm';
import {governmentOf,governingExecutives,politicalName,regimeName} from '../core/government';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';
import {DetailTabs} from './DetailTabs';
import {RealmBadge,RealmNavigation} from './RealmBadge';
import {ArtIcon} from './ArtIcon';
import {WarSettlement} from './WarSettlement';
import {battleKey,warBattles,warOccupations,type EngagementRef} from './warPresentation';
import './warDetails.css';

type Props={world:World;war:War;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;onPerson?:(id:string)=>void;onRealm?:(id:War['attacker'])=>void};
const goalNames={claimant:'扶立宣称者',territory:'割让目标地',reparations:'索取战争赔款',tributary:'确立宗属',annexation:'吞并政权',defection:'接纳归附领地'};
const stageNames={skirmish:'前哨交锋',clash:'主力交战',pursuit:'追击阶段'};
const signed=(n:number)=>(n>0?'+':'')+n;
export function WarDetails({world:w,war,pending,send,onPerson,onRealm}:Props){
 const [tab,setTab]=useState<'overview'|'records'|'peace'>('overview'),[engagement,setEngagement]=useState<EngagementRef|null>(null);
 const score=war.civil?null:warScoreBreakdown(w,war),battles=warBattles(w,war),sieges=(w.realm?.sieges??[]).filter(s=>war.id!==undefined&&s.war===war.id),occupations=warOccupations(w,war),target=w.realm!.cities[war.target];
 const own=playerRealm(w),side=warRealmSide(war,own),enemy=side==='attack'?war.defender:war.attacker,will=!war.civil&&side&&governingExecutives(w,own).includes(w.characterId!)?warWillToContinue(w,war,enemy):null;
 return <section className="war-details">
  <div className="war-details-objective detail-landscape" style={terrainSceneStyle(war.target)}><ArtIcon name="army" size={30}/><div><h3>{war.civil?war.civil.name:warTargetName(war,w)+'之战'}</h3><p>{war.civil?'争夺朝廷控制权':goalNames[war.goal??'territory']} · {warTargetName(war,w)} · 已持续 {Math.max(0,w.day-war.started)} 日</p></div><HoverHint label="攻方战分" content={score?score.parts.map(p=>p.label+' '+signed(p.value)).join('；'):'内战当前战分'}><strong>攻方战分 {signed(score?.total??war.score)}</strong></HoverHint></div>
  {war.claimant&&<div className="war-details-claimant"><span>受益君主 <button onClick={()=>onPerson?.(war.claimant!.person)} disabled={!onPerson}>{politicalName(war.claimant.person,w)}</button></span><span>扶立发起者 <button onClick={()=>onPerson?.(war.claimant!.patron)} disabled={!onPerson}>{politicalName(war.claimant.patron,w)}</button></span><p>军事统帅逐军任命；援助国不默认接掌目标国朝廷。</p></div>}
  <div className="war-details-parties">{(['attack','defend'] as const).map(side=>{const realm=side==='attack'?war.attacker:war.defender,leader=war.civil?(side==='attack'?war.civil.claimant:war.civil.loyalist):null,armies=w.realm!.armies.filter(a=>warArmySide(w,war,a)===side),known=armies.every(a=>militaryArmyView(w,a).exact);return <article key={side}><RealmBadge realm={realm} world={w} onOpen={onRealm}/><div><small>{side==='attack'?'进攻方':'防御方'}</small>{leader&&<button onClick={()=>onPerson?.(leader)} disabled={!onPerson}>{politicalName(leader,w)}</button>}<strong>{known?armies.reduce((n,a)=>n+a.troops,0)+' 人':'现役兵力未详'}</strong><small>累计野战损失 {war.casualties?.[side]??0} 人</small></div><div className="war-allies">{Object.entries(war.allies??{}).filter(([,s])=>s===side).map(([r])=><RealmBadge key={r} realm={r as War['attacker']} world={w} onOpen={onRealm}/>)}</div></article>;})}</div>

  {will&&<HoverHint label="对方续战意愿" content={will.parts.map(p=>p.label+' '+signed(p.value)).join('；')}><span>对方续战意愿 {will.total} · 正值表示仍愿继续</span></HoverHint>}
  <DetailTabs label="战争详情" value={tab} onChange={setTab} items={[{id:'overview',label:'战况',icon:'army'},{id:'records',label:'战报',icon:'diligent'},{id:'peace',label:'议和',icon:'world'}]}/>
  {tab==='overview'&&<div className="war-details-content">
   <div className="war-score"><div className="war-score-labels"><span>守方优势</span><span>攻方优势</span></div><meter min={-100} max={100} value={score?.total??war.score} aria-label="攻方战争分数"/><p>战分表示当前优势，不是战争完成度；战争须经议和或规则结算结束。</p>{score&&<div className="war-facts">{score.parts.map(part=><span key={part.key}>{part.label}<b>{signed(part.value)}</b></span>)}{score?.decisive&&<span>决定性胜负</span>}</div>}</div>
   <div className="war-participant-columns">{(['attack','defend'] as const).map(side=>{const realms=[side==='attack'?war.attacker:war.defender,...Object.entries(war.allies??{}).filter(([,value])=>value===side).map(([realm])=>realm as War['attacker'])];return <section key={side} data-side={side} aria-label={(side==='attack'?'进攻':'防御')+'阵营参战国'}><h4>{side==='attack'?'进攻阵营':'防御阵营'}</h4>{realms.map(realm=>{const armies=w.realm!.armies.filter(a=>a.realm===realm&&warArmySide(w,war,a)===side),known=armies.every(a=>militaryArmyView(w,a).exact),leader=war.civil?(side==='attack'?war.civil.claimant:war.civil.loyalist):governmentOf(w,realm)?.ruler;return <article key={realm}><RealmBadge realm={realm} world={w} onOpen={onRealm}/>{leader&&<button className="war-leader" disabled={!onPerson} onClick={()=>onPerson?.(leader)} aria-label={'查看'+politicalName(leader,w)}><CharacterPortrait world={w} characterId={leader} compact/></button>}<span><strong>{regimeName(w,realm)}</strong><small>{armies.length} 支现役军队</small></span><b>{known?armies.reduce((n,a)=>n+a.troops,0).toLocaleString()+' 人':'兵力未详'}</b></article>;})}</section>;})}</div>
   <div className="war-target"><h4>战争目标 · {warTargetName(war,w)}</h4>{(war.territory||war.goal==='annexation')&&<p>全境目标：{warObjectiveSites(war,w).map(id=>siteById[id].name).join('、')}；须全部控制才开始目标战分积累，要求整块割让须全部控制；按现状停战仅交割仍占领县域。</p>}<p>法理归属 {regimeName(w,target.owner)} · 实际控制 {regimeName(w,target.controller)}{war.civil?' · '+(warCitySide(w,war,war.target)==='attack'?'起兵方控制':'原朝廷控制'):''}{target.occupiedSince!==undefined?' · 已占领 '+(w.day-target.occupiedSince)+' 日':''}</p></div>
   {warCaptives(w,war).length>0&&<section className="war-captive-list"><h4>被俘要人 · 当前战分筹码</h4>{warCaptives(w,war).map(p=><article key={p.person}><button disabled={!onPerson} onClick={()=>onPerson?.(p.person)}><CharacterPortrait world={w} characterId={p.person} compact/><span>{politicalName(p.person,w)}<small>{p.label} · 由{regimeName(w,p.captor)}看管</small></span></button><b>攻方 {signed(p.score)}</b></article>)}<p className="war-footnote">本项合计上限 ±60；获释或不再具备相应身份后即时重算。</p></section>}<h4>进行中的战役与围城</h4><div className="war-event-list">{battles.filter(b=>b.ended===undefined&&w.day-b.last<=1).map(b=><button key={battleKey(b)} onClick={()=>setEngagement({kind:'battle',key:battleKey(b)})}><ArtIcon name="army" size={24}/><span>{siteById[b.site??'']?.name??'道路'}战役<small>{stageNames[b.stage]} · 第 {b.round} 轮</small></span><b>查看 ›</b></button>)}{sieges.map(s=><button key={s.site+':'+s.side} onClick={()=>setEngagement({kind:'siege',war:s.war,site:s.site,side:s.side})}><ArtIcon name="city" size={24}/><span>{siteById[s.site].name}围城<small>{s.side==='attack'?'攻方':'守方'}围攻 · 进展 {s.progress}/100 · 封锁 {s.blockade??0}%</small></span><b>查看 ›</b></button>)}{!sieges.length&&!battles.some(b=>b.ended===undefined&&w.day-b.last<=1)&&<p>当前没有记录中的交战或围城。</p>}</div>
   <h4>{war.civil?'起兵方当前控制':'本场战争当前占领'}</h4>{war.civil?<p>{war.civil.cities.map(id=>siteById[id]?.name??id).join('、')||'暂无响应城市'}</p>:occupations.length?<div className="war-occupation-list">{occupations.map(([id,c])=><article key={id}><strong>{siteById[id].name}</strong><span>{regimeName(w,c.owner)} → {regimeName(w,c.controller)}</span><small>人口 {c.population.toLocaleString()} · 秩序 {c.order} · 繁荣 {c.prosperity}</small></article>)}</div>:<p>暂无可归属于本场战争的占领。</p>}<p className="war-footnote">占领改变实际控制，法理归属由和约处理。这里展示当前地方状态，不将全部变化归因于战争。</p>
  </div>}
  {tab==='records'&&<div className="war-details-content war-event-list">{(w.militaryAftermath?.siegeEvents??[]).filter(e=>e.after.war===war.id&&['assaultWon','assaultLost','surrender','withdrawal'].includes(e.kind)).slice().reverse().map(e=><button key={'scene:'+e.id} onClick={()=>setEngagement({kind:'siege',event:e.id,war:e.after.war,site:e.after.site,side:e.after.side})}><ArtIcon name="city" size={24}/><span>{siteById[e.after.site].name} · {e.kind==='assaultWon'?'强攻成功':e.kind==='assaultLost'?'强攻未克':e.kind==='surrender'?'议降交城':'撤围'}<small>结算第 {e.day} 日 · 查看已结算过程</small></span></button>)}{battles.map(b=><button key={battleKey(b)} onClick={()=>setEngagement({kind:'battle',key:battleKey(b)})}><ArtIcon name="army" size={24}/><span>{siteById[b.site??'']?.name??'道路'}战役<small>开战后第 {b.day-war.started+1} 日 · {b.ended===undefined?(w.day-b.last<=1?'交战中':'已脱离接触，待归档'):b.winner==='attack'?'攻方获胜':b.winner==='defend'?'守方获胜':b.winner==='draw'?'未分胜负':'结果未详'}</small></span><span>野战成果 {b.scoreDelta===undefined?'待结算':signed(b.scoreDelta)}<small>损失 攻 {b.lossA} / 守 {b.lossB}</small></span></button>)}{(war.captureLosses??[]).filter(c=>c.cause!=='legacy').map(c=><article key={c.site+':'+c.side}><strong>{siteById[c.site].name} · {c.cause==='surrender'?'议降交城':'战斗夺城'}</strong><p>开战后第 {c.day-war.started+1} 日 · {c.side==='attack'?'攻方':'守方'}取得控制 · 战乱死亡 {c.deaths} 名居民</p></article>)}{!battles.length&&!(war.captureLosses??[]).some(c=>c.cause!=='legacy')&&<p>尚无可关联本场战争的战报；旧档未记录的战役不补造。</p>}<p className="war-footnote">战报保留范围以存档为准。野战成果会受战争总分上限影响。</p></div>}
  {tab==='peace'&&<WarSettlement world={w} war={war} pending={pending} send={send} onPerson={onPerson}/>}
  {engagement&&<EngagementDialog world={w} selected={engagement} onClose={()=>setEngagement(null)} onRealm={onRealm} onPerson={onPerson}/>}
 </section>;
}
export function WarDetailsDialog({world,warId,onClose,...props}:Omit<Props,'war'>&{warId:number;onClose:()=>void}){
 const navigation=useContext(RealmNavigation);
 const war=activeWars(world).find(w=>w.id===warId);
 return <ActionDialog className="war-details-dialog" title="战争详情" cancelLabel="返回地图" onClose={onClose} actions={null}>{war?<WarDetails key={war.id} world={world} war={war} {...props} onRealm={navigation?id=>{onClose();navigation.open(id);}:undefined}/>:<p role="status">这场战争已结束。当前无待执行的议和操作。</p>}</ActionDialog>;
}
export {CombatDetails as EngagementDialog} from './CombatDetails';

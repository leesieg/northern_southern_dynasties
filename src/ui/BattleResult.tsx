import {terrainSceneStyle} from './terrainScene';
import type {World} from '../core/types';
import type {BattleRecord} from '../core/militaryAftermath';
import {battleReportSide} from '../core/battleReports';
import {politicalName} from '../core/government';
import {RealmFlag} from './RealmFlag';
import {CharacterPortrait} from './CharacterPortrait';
import {ArtIcon} from './ArtIcon';
import './battleResult.css';

export function BattleResult({world,battle:b}:{world:World;battle:BattleRecord}){
 return <section className="battle-result" aria-label="战役结算">
  <div className="battle-result-ribbon detail-landscape" style={terrainSceneStyle(b.site)}><ArtIcon name="army" size={28}/><strong>{b.winner==='attack'?'攻方获胜':b.winner==='defend'?'守方获胜':b.winner==='draw'?'未分胜负':'交战结束'}</strong><span>{b.round} 轮交锋 · {b.ended!==undefined?b.ended-b.day+1:'—'} 日</span></div>
  <div className="battle-result-sides">{(['attack','defend'] as const).map(side=>{const report=battleReportSide(b,side),realms=[...new Set(report.participants.map(p=>p.realm))],commanders=[...new Set(report.participants.flatMap(p=>p.commander?[p.commander]:[]))];return <section className="battle-result-side" key={side} data-winner={b.winner===side}>
   <header><h3>{side==='attack'?'进攻方':'防御方'}</h3><b>{b.winner===side?'胜':b.winner==='draw'?'平':b.winner?'败':'结案'}</b>{realms.map(realm=><RealmFlag key={realm} realm={realm} world={world} compact showLabel={false}/>)}</header>
   <div className="battle-result-commanders">{commanders.map(id=><figure key={id}><CharacterPortrait characterId={id} world={world} compact/><figcaption>{politicalName(id)}<small>{b.fates?.[id]==='dead'?'阵亡':b.fates?.[id]==='captured'?'被俘':b.fates?.[id]==='escaped'?'脱离战场':'参战将领'}</small></figcaption></figure>)}{!commanders.length&&<p>将领记录未详</p>}</div>
   <div className="battle-result-loss"><ArtIcon name="army"/><span>累计减员<strong>−{report.loss.toLocaleString()} <small>人</small></strong></span></div>
   <div className="battle-result-armies">{report.armies.map(id=><div key={id}><span>第 {id} 军</span><span>记录减员 <b>{b.losses?.[id]===undefined?'未详':'−'+b.losses[id].toLocaleString()}</b></span></div>)}</div>
  </section>;})}</div>
  <p className="battle-result-score">攻方野战成果 <strong>{b.scoreDelta===undefined?'未记录':(b.scoreDelta>0?'+':'')+b.scoreDelta}</strong><small>计入战争总分时受上限约束；减员包含伤亡、被俘与溃散，不等同于阵亡。</small></p>
 </section>;
}

import {afterCommand} from './actionFeedback';
import {ConfirmAction} from './ConfirmAction';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {assaultQuote,militaryActionReason,type MilitaryAction} from '../core/militaryAftermath';
import {playerRealm} from '../core/realm';
import {siteById} from '../data/scenario';
import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {politicalName} from '../core/government';
export function MilitaryAftermathPanel({world:w,army,site,pending,send}:{world:World;army:number;site:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>}){
 const [confirm,setConfirm]=useState<MilitaryAction|null>(null),s=w.militaryAftermath,a=w.realm!.armies.find(a=>a.id===army);if(!a)return null;
 const assault=assaultQuote(w,a),assaultDetail=site===a.location?`当前围城 ${assault.progress}/${assault.required}，城防 ${assault.fort}；预计消耗军粮 ${assault.grain}、损失 ${assault.losses} 人、士气 ${assault.success?'−10':'−15'}。按现状计算${assault.success?'可攻克':'难以攻克'}；失败退回围城进度 2 点，同日不可再攻。成功还将造成 ${assault.civilianDeaths} 名居民战乱死亡（同场同城同方向一次），降低秩序 25、繁荣 10，并损坏一级城防。`:'须在本军当前围城地点强攻。';
 const buttons:{action:MilitaryAction['action'];label:string;icon:ArtName;detail:string;policy?:MilitaryAction['policy']}[]=[
 {action:'scout',label:'侦察此地',icon:'world',detail:'随军粮 5；斥候按往返路程回报十五日路程内驻军人数区间，报告保留日期，不持续更新敌情。'},
 {action:'retreat',label:'撤往此地',icon:'world',detail:'士气 −8；沿己方控制道路撤离，途中暂不主动交战。'},
 {action:'surrender',label:'招降守城',icon:'steadfast',detail:'围城十日、无有效守军且守城秩序或存粮不足时接管城市，免除强攻破坏；议降交城损失当时居民人口的 0.5%，同场同城同方向仅结算一次，保留人口与劳力下限。'},
 {action:'assault',label:'强攻城池',icon:'army',detail:assaultDetail},
 {action:'discipline',policy:'restrained',label:'严守军纪',icon:'steadfast',detail:'禁止掠夺公库，保全当地税基。'},
 {action:'discipline',policy:'forage',label:'准许掠财',icon:'army',detail:'准许占领后押运敌方公库；每次掠取会降低当地秩序 15、繁荣 5。'},
 {action:'loot',label:'押运掠财',icon:'coins',detail:'最多押运当地现有公款 150；沿实际道路返仓，敌军可以截取。受任统帅归仓后获得 10% 分成债权。'},
 {action:'advancePay',label:'私财垫饷',icon:'coins',detail:'私财垫付最多 100 欠饷；原出资公库形成等额债务，每月 1 日偿付最多 50，缺款顺延。'},
 {action:'release',label:'释放战俘',icon:'person',detail:'释放本军驻地最多 100 名战俘，安置为当地居民，不增加兵员或功绩。'},
 {action:'ransom',label:'议赎战俘',icon:'coins',detail:'对方国库支付每人 1 钱，最多 100 人；释放后安置当地，付款方余额不足不能执行。'}];
 const intel=s?.intel[a.realm+'|'+site],pools=s?.pools.filter(p=>p.site===a.location&&(p.realm===a.realm&&p.captor===null||p.captorArmy===a.id)),battle=s?.battles.slice().reverse().find(b=>(b.a===army||b.b===army||b.attackers?.includes(army)||b.defenders?.includes(army))&&w.day-b.last<=1);
 return <section className="career-systems"><h4><ArtIcon name="army" size={24}/>军情与军纪</h4>{battle&&<p>{({skirmish:'接敌试探',clash:'正面交锋',pursuit:'追击溃军'})[battle.stage]} · 第 {battle.round} 日</p>}{s?.scouts?.filter(q=>q.army===army).map(q=><p key={q.site}><ArtIcon name="world" size={22}/>斥候赴 {siteById[q.site].name} · 预计余 {Math.max(0,q.due-w.day)} 日</p>)}{intel&&<p>{siteById[site].name}敌军 {intel.min}–{intel.max} · {w.day-intel.day} 日前侦报</p>}<div className="city-civic-metrics">{pools?.map(p=><HoverHint key={p.realm+':'+p.captor+':'+p.captorArmy} label="伤俘情况" content="伤员每月 1 日消耗本城粮食，每人 2 公粮，康复转为居民；溃散者按期重新安置，不重复计入现役。"><span>{p.captorArmy===a.id?`本军看押 · 战俘 ${p.captives}`:`本国 · 伤员 ${p.wounded} · 待安置 ${p.dispersed} · 阵亡 ${p.dead}`}</span></HoverHint>)}</div><div className="city-policy-grid">{buttons.map(b=>{const command:MilitaryAction={type:'militaryAction',army,site,action:b.action,...(b.policy?{policy:b.policy}:{})},reason=militaryActionReason(w,command);return <HoverHint key={b.action+':'+b.policy} label={b.label} content={<>{b.detail}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason} aria-pressed={b.policy?(s?.discipline[army]??'restrained')===b.policy:undefined} onClick={()=>setConfirm(command)}><ArtIcon name={b.icon} size={26}/>{b.label}</button></HoverHint>;})}</div>{confirm&&<ConfirmAction title={buttons.find(b=>b.action===confirm.action&&b.policy===confirm.policy)?.label??'确认军令'} detail={buttons.find(b=>b.action===confirm.action&&b.policy===confirm.policy)?.detail} confirmLabel='确认执行' danger pending={pending||!!militaryActionReason(w,confirm)} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(pending||militaryActionReason(w,confirm))return;void afterCommand(send(confirm),()=>{setConfirm(null);});}}/>}{s?.spoils.filter(q=>q.realm===playerRealm(w)&&q.status==='moving').map(q=><article key={q.id}><ArtIcon name="coins" size={24}/>押运 {q.coins} 钱 · {siteById[q.location].name} → {siteById[q.destination].name}<small>已归仓 {q.delivered} · 被截 {q.lost}{q.commander?' · 统帅 '+politicalName(q.commander,w):''}</small></article>)}</section>;
}

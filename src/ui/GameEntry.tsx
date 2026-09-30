import {realmAtWar} from '../core/wars';
import {plannedReinvestment} from '../core/treasury';
import {lifeOf,ageLabel} from '../core/lifeState';
import { regimeName } from '../core/government';
import { Resource } from './ArtIcon';
import { playerRealm,realmForecast } from '../core/realm';
import { DEFAULT_SCRIPT,getScript,scriptLabel } from '../data/scripts';
import {ScriptSelection} from './ScriptSelection';
import { CharacterPicker } from './CharacterPicker';
import { ConfirmAction } from './ConfirmAction';
import { characterById } from '../data/characters';
import { useState } from 'react';
import { campaignGoals,campaignTitle } from '../core/campaign';
import { dateLabel } from '../core/world';
import type { Request,SaveInfo,World } from '../core/types';
import './gameEntry.css';
import './entryRefinement.css';
import './campaignSelection.css';
import {SaveBrowser} from './SaveBrowser';
import {latestSaveInfo} from '../core/storage';
const accountSaves=import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/');

interface EntryProps {world:World|null;slots:SaveInfo[];pending:boolean;notice:{text:string;error?:boolean}|null;send:(request:Request)=>void;notify:(text:string,error?:boolean)=>void}
export function GameEntry({world,slots,pending,notice,send,notify}:EntryProps){
  const [playMode,setPlayMode]=useState<'sandbox'|'tutorial'>('sandbox');
  const [selectedScript,setSelectedScript]=useState(DEFAULT_SCRIPT);
  const script=getScript(selectedScript);
  const [selectedCharacter,setSelectedCharacter]=useState(script.defaultCharacter);
  const [tab,setTab]=useState<'home'|'scripts'|'new'|'load'>('home');
  const [newConfirm,setNewConfirm]=useState(false);const latest=latestSaveInfo(slots);
  const launch=()=>send({type:'new',mode:playMode,scriptId:selectedScript,characterId:selectedCharacter==='fictional'?undefined:selectedCharacter});
  return <main className={`game-entry ${tab==='new'?'is-selecting':tab==='load'?'is-loading-saves':tab==='scripts'?'is-choosing-script':''}`}><div className="entry-backdrop"/><section className="entry-content"><span className="eyebrow">山河流转 · 家业长存</span><h1>风云南北朝</h1><p className="entry-lead">择一段时代，续一族风云。</p>
    {!world?<div className="entry-loading" role="status"><span/>{notice?.error?'存档暂时无法读取':'正在准备世界与'+(accountSaves?'账号':'本地')+'存档…'}<small>首次进入需要加载游戏资源。</small>{notice?.error&&<button onClick={()=>send({type:'init'})}>重试读取存档</button>}</div>:<>
    {tab==='home'?<div className="entry-actions"><button className="primary" disabled={pending||!slots.length} onClick={()=>send({type:'resume'})}>继续游戏{latest&&<small>{latest.characterName??'旧行记'} · {dateLabel(latest.day,latest.scriptId)}</small>}</button><button disabled={pending} onClick={()=>setTab('scripts')}>开始新游戏</button><button disabled={pending} onClick={()=>setTab('load')}>读取／导入存档</button>{notice?.error&&<button disabled={pending} onClick={()=>send({type:'init'})}>重新检查存档</button>}<p>长期历史沙盒 · 可随时保存离开</p></div>:<><button className="entry-back" onClick={()=>setTab(tab==='new'?'scripts':'home')} disabled={pending}>{tab==='new'?'← 返回剧本选择':'← 返回主菜单'}</button>
    {(tab==='scripts'||tab==='new')&&<nav className="campaign-stage-nav" aria-label="新建游戏步骤"><button disabled={pending} aria-current={tab==='scripts'?'step':undefined} onClick={()=>setTab('scripts')}><span>壹</span>选择剧本</button><i aria-hidden="true"/><button disabled={pending} aria-current={tab==='new'?'step':undefined} onClick={()=>setTab('new')}><span>贰</span>选择人物</button><small>{scriptLabel(selectedScript)} · {playMode==='sandbox'?'历史沙盒':'营建教学'}</small></nav>}
    {tab==='scripts'?<ScriptSelection selected={selectedScript} onSelect={id=>{if(id===selectedScript)return;setSelectedScript(id);setSelectedCharacter(getScript(id).defaultCharacter);}} mode={playMode} onMode={mode=>{setPlayMode(mode);if(mode==='sandbox'&&selectedCharacter==='fictional')setSelectedCharacter(script.defaultCharacter);}} pending={pending} onNext={()=>setTab('new')}/>:tab==='new'?<div className="entry-new-game"><CharacterPicker pending={pending} sandbox={playMode==='sandbox'} key={selectedScript} scriptId={selectedScript} allowFictional={playMode==='tutorial'&&script.allowFictional} selected={selectedCharacter} onSelect={setSelectedCharacter}/><div className="entry-launch"><div className="campaign-launch-summary"><strong>{characterById[selectedCharacter]?.name??'沈行舟'}</strong><span>{scriptLabel(selectedScript)} · {playMode==='sandbox'?'历史沙盒':'营建教学'}</span></div>{slots.length>0&&<p className="entry-note">新局将替换手动存档，当前进度保留为“切换前备份”；再次切换进度会更新该备份。</p>}<button className="primary" disabled={pending} onClick={()=>slots.length?setNewConfirm(true):launch()}>{pending?'正在准备…':'以'+(characterById[selectedCharacter]?.name??'沈行舟')+'开始这一局'}</button></div></div>:<SaveBrowser slots={slots} pending={pending} send={send} notify={notify}/>}</>}
    </>}{notice&&<p className={`entry-notice ${notice.error?'is-error':''}`} role={notice.error?'alert':'status'}>{notice.text}</p>}<footer>单人策略 · {accountSaves?'账号存档':'本地存档'}</footer></section>{newConfirm&&<ConfirmAction title={'以'+(characterById[selectedCharacter]?.name??'沈行舟')+'开始新局？'} detail='新局将替换手动行记。当前已载入的进度会写入切换前备份，更新已有备份。' confirmLabel='启程' pending={pending} onCancel={()=>setNewConfirm(false)} onConfirm={()=>{if(pending)return;launch();setNewConfirm(false);}}/>}</main>;
}
export function RunOutcome({world,pending,notice,send}:Pick<EntryProps,'pending'|'notice'|'send'>&{world:World}){
  const won=world.campaign?.status==='won',death=lifeOf(world,world.characterId??'fictional')?.death;return <main className="game-entry"><div className="entry-backdrop"/><section className="entry-content"><span className="eyebrow">{campaignTitle(world)} · 本局结算</span><h1>{death?'一生落幕':won?'一方家业':'未竟之志'}</h1><p className="entry-lead">{death?world.people[0].name+'已逝，享年 '+ageLabel(world,world.characterId??'fictional')+'。没有在世且合格的家业继任者，本局结束。':won?(world.characterId?world.people[0].name+'完成本局营建目标，城邑与家业渐兴。':'市肆渐兴，田庄初成。你带着一份新的家业返回建康。'):'期限已至，本局目标尚未完成。重新筹划行程与营建，再试一次。'}</p><div className="outcome-stats"><span>历时 <strong>{world.day} 日</strong></span><span>余钱 <strong>{world.people[0].coins} 钱</strong></span></div><ul className="outcome-goals">{campaignGoals(world).map(g=><li key={g.title}><span>{g.done?'已完成':'未完成'}</span>{g.title}</li>)}</ul><div className="entry-actions"><button className="primary" disabled={pending} onClick={()=>send({type:'menu'})}>保存结局并返回主菜单</button><button disabled={pending} onClick={()=>send({type:'export'})}>导出本局存档</button></div>{notice&&<p role={notice.error?'alert':'status'}>{notice.text}</p>}</section></main>;
}
export function CampaignTracker({world,onCity,onEstate,onRealm,send}:{world:World;onRealm?:()=>void;onCity:(id:string)=>void;onEstate:()=>void;send:EntryProps['send']}){
  if(world.realm){const r=playerRealm(world),t=world.realm.treasuries[r],f=realmForecast(world,r);return <section className="campaign-tracker sandbox-tracker" aria-label="沙盒局势"><header><strong>{regimeName(world,r)} · 家国经营</strong><span>第 {world.day} 日</span></header><p><Resource name="coins" value={t.coins} label="公款"/> <Resource name="grain" value={t.grain} label="公粮"/><br/>月度财政预算 {f.income-f.expense-plannedReinvestment(world,r)>=0?'+':''}{f.income-f.expense-plannedReinvestment(world,r)} 钱<br/>亲自治理 {world.holdings.governedCities.length} 城 · {realmAtWar(world,r)?'战争中':'和平'}</p><button className={world.realm.event?'realm-alert':'primary'} onClick={onRealm}>{world.realm.event?'待决事务 · 打开政务':'政务 · 财政 / 任职 / 军事'}</button>{t.grain<100&&<p>公粮不足，动员可能导致断粮。</p>}<section className="detail-record-group"><h4>经营指引</h4><p>先检查收支与税制，再安排城市建设。通过交往取得任职与军务授权；动员前储备军粮。家族庄园使用私产，交接家业不等于继承公职。</p></section></section>;}
  const goals=campaignGoals(world),first=goals.findIndex(g=>!g.done),p=world.people[0];
  const canClaim=world.campaign?.id==='jiangzuo'&&!world.campaign?.appointed&&!p.journey&&p.location==='jingkou';
  return <section className="campaign-tracker" aria-label="本局目标"><header><strong>{campaignTitle(world)}</strong><span>余 {120-world.day} 日</span></header><div className="campaign-goals"><p>{goals.filter(g=>g.done).length} / 4 已完成</p><ol>{goals.map(g=><li key={g.title} className={g.done?'done':''}>{g.done?'✓ ':''}{g.title}</li>)}</ol><p>{goals[first]?.hint}</p></div><button className="primary" onClick={()=>canClaim?send({type:'command',command:{type:'commission'}}):first===2?onEstate():onCity(world.characterId?characterById[world.social?.founder??world.characterId].home:first===3?'jiankang':'jingkou')}>{canClaim?'领取委任 · +180 钱':first===2?'前往庄园':world.characterId?'查看辖城':first===3?'规划归程':'前往京口'}</button></section>;
}

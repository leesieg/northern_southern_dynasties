import {gameScripts,getScript} from '../data/scripts';
import {characterById} from '../data/characters';
import {RealmFlag} from './RealmFlag';
import type {Polity} from '../core/types';

export function ScriptSelection({selected,onSelect,mode,onMode,pending,onNext}:{selected:string;onSelect:(id:string)=>void;mode:'sandbox'|'tutorial';onMode:(mode:'sandbox'|'tutorial')=>void;pending:boolean;onNext:()=>void}){
 const script=getScript(selected),realms=[...new Set(script.characterIds.map(id=>characterById[id]?.polity).filter(Boolean))] as Polity[];
 return <section className="campaign-selection" aria-label="选择开局剧本">
  <div className="campaign-era-scene"><div className="campaign-era-caption"><span>公元 {script.year} 年</span><h2>{script.name}</h2><p>{script.description}</p><div className="campaign-era-realms" aria-label="剧本政权">{realms.map(realm=><RealmFlag key={realm} realm={realm} compact/>)}</div></div></div>
  <div className="campaign-era-options"><div className="campaign-era-scroll"><h3>选择时代</h3><div className="campaign-era-list" role="radiogroup" aria-label="开放剧本">{gameScripts.map(s=><label key={s.id}><input type="radio" name="campaign-script" disabled={pending} checked={s.id===selected} onChange={()=>onSelect(s.id)}/><span className="campaign-era-year">{s.year}</span><span><strong>{s.name}</strong><small>{s.characterIds.length} 位可选人物</small></span><span className="campaign-era-chosen">{s.id===selected?'已选':'选择'}</span></label>)}</div>
  <h3>选择玩法</h3><div className="campaign-mode-options" role="radiogroup" aria-label="开局玩法"><label><input type="radio" name="campaign-mode" disabled={pending} checked={mode==='sandbox'} onChange={()=>onMode('sandbox')}/><strong>历史沙盒</strong><span>经营家族、城邑与朝廷，延续一族之业。</span><small>持续游玩 · 无 120 日期限</small></label><label><input type="radio" name="campaign-mode" disabled={pending} checked={mode==='tutorial'} onChange={()=>onMode('tutorial')}/><strong>营建教学</strong><span>以旅行与营建目标熟悉游戏。</span><small>120 日目标 · 保留结局评定</small></label></div></div>
  <footer><span>{script.year} · {mode==='sandbox'?'历史沙盒':'营建教学'}</span><button className="primary" disabled={pending} onClick={onNext}>选择人物 →</button></footer></div>
 </section>;
}

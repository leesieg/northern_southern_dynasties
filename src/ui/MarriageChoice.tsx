import {useMemo,useState} from 'react';
import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import type {FamilyMarriageCommand} from '../core/familyMarriage';
import {getPerson} from '../core/personRegistry';
import {activeMarriage} from '../core/relationships';
import {ageLabel,healthLabel,lifeOf} from '../core/lifeState';
import {abilityBreakdown,abilityNames,type Ability} from '../core/social';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';
import {CharacterPortrait} from './CharacterPortrait';
import {PositionSeat} from './PersonSelection';
import {RealmBadge} from './RealmBadge';
import {FamilyCrest} from './FamilyPanel';
import {HoverHint} from './HoverHint';
import {marriageCandidates,filterMarriageCandidates,marriageFilterPreset,marriageSortNames,type MarriageFilters,type MarriageSort} from './marriageCandidates';
import './marriageChoice.css';

const maritalNames={single:'单身',married:'已婚',widowed:'丧偶'};
export function MarriageChoice({world:w,command,value,onChange,pending,onRealm}:{world:World;command:FamilyMarriageCommand;value:string;onChange:(id:string)=>void;pending:boolean;onRealm?:(realm:RealmId)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(value);
 return <><PositionSeat compact world={w} holder={value||null} title="拟议配偶" status={value?`${getPerson(w,value)?.sex==='female'?'女':'男'} · ${ageLabel(w,value)}`:'查找未婚异性与婚配条件'} onManage={()=>{setDraft(value);setOpen(true);}}/>{open&&<MarriageSelectionDialog world={w} command={command} value={draft} onRealm={onRealm} onSelect={setDraft} pending={pending} onClose={()=>setOpen(false)} onConfirm={()=>{onChange(draft);setOpen(false);}}/>}</>;
}
function MarriageSelectionDialog({world:w,command,value,onSelect,pending,onClose,onConfirm,onRealm}:{world:World;command:FamilyMarriageCommand;value:string;onSelect:(id:string)=>void;pending:boolean;onClose:()=>void;onConfirm:()=>void;onRealm?:(realm:RealmId)=>void}){
 const [filters,setFilters]=useState(()=>marriageFilterPreset('unmarried')),[query,setQuery]=useState(''),[sort,setSort]=useState<MarriageSort>('recommended'),[page,setPage]=useState(0);
 const subject=getPerson(w,command.subject),subjectMarriage=activeMarriage(w,command.subject),candidates=useMemo(()=>marriageCandidates(w,command),[w,command.subject,command.coins,command.residence,command.family]);
 const visible=useMemo(()=>filterMarriageCandidates(candidates,subject?.sex,filters,query,sort),[candidates,subject?.sex,filters,query,sort]),selected=candidates.find(p=>p.id===value);
 const pages=Math.max(1,Math.ceil(visible.length/24)),currentPage=Math.min(page,pages-1),rows=visible.slice(currentPage*24,(currentPage+1)*24),selectedVisible=visible.some(p=>p.id===value);
 const update=(patch:Partial<MarriageFilters>)=>{setFilters(f=>({...f,...patch}));setPage(0);};
 const preset=(name:'unmarried'|'ready'|'all')=>{setFilters(marriageFilterPreset(name));setPage(0);};
 const presetActive=(name:'unmarried'|'ready'|'all')=>JSON.stringify(filters)===JSON.stringify(marriageFilterPreset(name));
 const metric=command.subject===w.characterId?'对方接受度':'双方最低接受度';
 const breakdown=selected?abilityBreakdown(w,selected.id):null;
 return <ActionDialog title="查找婚配对象" scene="landscape" className="marriage-candidate-dialog" cancelLabel="返回议婚" onClose={onClose} actions={<><span className="marriage-choice-decision">{selected?'已选：'+selected.name:'请选择人物'}<small>选入草稿后，返回议婚确认婚资与家支。</small></span><button className="primary" disabled={pending||!selected} onClick={onConfirm}>选择此人</button></>}>
  <div className="marriage-subject"><CharacterPortrait world={w} characterId={command.subject}/><div><small>为谁议婚</small><strong>{subject?.name}</strong><span>{subject?.sex==='female'?'女':'男'} · {ageLabel(w,command.subject)} · {subjectMarriage?'已婚':w.relationships?.maritalBasis[command.subject]==='widowed'?'丧偶':'单身'} · {siteById[command.residence]?.name??'驻地未详'}</span></div><span>婚资 {command.coins} 钱<small>议婚者私财支付</small></span></div>
  <div className="marriage-search"><input autoFocus type="search" aria-label="搜索婚配候选人" placeholder="姓名、家族、官职、驻地、文化、特质" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><button onClick={()=>{setFilters(marriageFilterPreset('unmarried'));setQuery('');setSort('recommended');setPage(0);}}>重置</button></div>
  <div className="marriage-presets" role="group" aria-label="婚配快捷筛选">{([['unmarried','未婚异性'],['ready','同城可议'],['all','全部人物']] as const).map(([key,label])=><button key={key} aria-pressed={presetActive(key)} onClick={()=>preset(key)}>{label}</button>)}<small>未婚筛选包含丧偶且无配偶者</small></div>
  <div className="marriage-filters">
   <label>性别<select value={filters.sex} onChange={e=>update({sex:e.target.value as MarriageFilters['sex']})}><option value="opposite">异性</option><option value="all">不限</option><option value="male">男性</option><option value="female">女性</option></select></label>
   <label>婚姻<select value={filters.marital} onChange={e=>update({marital:e.target.value as MarriageFilters['marital']})}><option value="unmarried">无配偶</option><option value="all">不限</option><option value="married">已婚</option><option value="widowed">丧偶</option></select></label>
   <label>最小年龄<input type="number" min="0" max="120" value={filters.minAge} onChange={e=>update({minAge:e.target.value})} placeholder="不限"/></label>
   <label>最大年龄<input type="number" min="0" max="120" value={filters.maxAge} onChange={e=>update({maxAge:e.target.value})} placeholder="不限"/></label>
   <label className="marriage-sort">排序<select value={sort} onChange={e=>{setSort(e.target.value as MarriageSort);setPage(0);}}>{(Object.keys(marriageSortNames) as MarriageSort[]).map(key=><option value={key} key={key}>{marriageSortNames[key]}</option>)}</select></label>
   <div className="marriage-filter-checks">{([['adult','在世成年'],['sameRealm','同一政权'],['sameCity','同城驻留'],['ready','现在可议婚']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={filters[key]} onChange={e=>update({[key]:e.target.checked})}/>{label}</label>)}</div>
  </div>
  <div className="marriage-comparison">
   <section className="marriage-results" aria-label="婚配候选名单"><div className="marriage-results-heading"><strong>{visible.length} / {candidates.length} 人</strong><small>{metric} · 门槛 70</small></div><div className="marriage-candidate-list">
    {rows.map(p=><button key={p.id} className="marriage-candidate" aria-pressed={value===p.id} onClick={()=>onSelect(p.id)}><span className="marriage-candidate-portrait"><CharacterPortrait characterId={p.id} world={w}/></span><span className="marriage-candidate-info"><strong>{p.name}{p.status==='fictional'?'（架空）':''}<small>{p.sex==='female'?'女':'男'} · {ageLabel(w,p.id)} · {maritalNames[p.marital]}</small></strong><span>{p.familyName} · {p.title}</span><span>{p.realmName} · {p.location}{p.residence.traveling?'（在途）':''}</span><span className="marriage-candidate-stats">外交 {p.stats.diplomacy} · 军事 {p.stats.martial} · 管理 {p.stats.stewardship} · 谋略 {p.stats.intrigue}</span><span className={'marriage-candidate-status '+(p.quote.reason?'is-blocked':'is-ready')}>{p.quote.reason||'当前可议婚'}</span></span><b className="marriage-candidate-score">{p.score}<small>接受度</small></b></button>)}
    {!visible.length&&<div className="marriage-empty"><p>没有符合条件的人物。</p><p>{filters.minAge&&filters.maxAge&&Number(filters.minAge)>Number(filters.maxAge)?'最小年龄不能大于最大年龄。':'可放宽年龄、同城或可议婚条件，或查看全部人物。'}</p><button onClick={()=>{preset('all');setQuery('');}}>查看全部人物</button></div>}
   </div><nav className="marriage-pagination" aria-label="婚配名单分页"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage+1} / {pages}</span><button disabled={currentPage>=pages-1} onClick={()=>setPage(currentPage+1)}>下一页</button></nav></section>
   <aside className="marriage-preview" aria-label="已选婚配对象预览">{selected?<>
    <div className="marriage-preview-identity"><CharacterPortrait characterId={selected.id} world={w}/><div><h3>{selected.name}{selected.status==='fictional'&&<small>架空人物</small>}</h3><p>{selected.sex==='female'?'女':'男'} · {ageLabel(w,selected.id)}</p><p>{maritalNames[selected.marital]}{selected.spouse?' · 配偶 '+(getPerson(w,selected.spouse)?.name??'未详'):''}</p><p>{healthLabel(w,selected.id)}{lifeOf(w,selected.id)?' · 健康 '+lifeOf(w,selected.id)!.health+'/100':''}</p><div className="marriage-preview-emblems">{selected.realm&&<RealmBadge realm={selected.realm} world={w} onOpen={onRealm?realm=>{onClose();onRealm(realm);}:undefined}/>}<span title={selected.familyName}><FamilyCrest family={getPerson(w,selected.id)!.family} small/></span><span>{selected.familyName}</span></div></div></div>
    {!selectedVisible&&<p className="marriage-selection-notice" role="status">当前选择不在筛选结果中；可继续比较或改选。</p>}
    <dl className="marriage-preview-facts"><dt>身份</dt><dd>{selected.title}</dd><dt>文化</dt><dd>{selected.culture}</dd><dt>驻地</dt><dd>{selected.location}{selected.residence.traveling?' · 在途':selected.sameCity?' · 与议婚者同城':' · 与议婚者异地'}</dd><dt>家族威望</dt><dd>{selected.prestige}</dd><dt>对{subject?.name}好感</dt><dd>{selected.opinion}</dd><dt>性格</dt><dd>{selected.traits.join('、')||'未录特质'}</dd></dl>
    <div className="marriage-preview-abilities">{(Object.keys(abilityNames) as Ability[]).map(key=><HoverHint key={key} label={abilityNames[key]} content={breakdown?.[key].parts.map(p=><p key={p.label}>{p.label} {p.value>=0?'+':''}{p.value}</p>)}><span>{abilityNames[key]}<b>{selected.stats[key]}</b></span></HoverHint>)}</div>
    <section className="marriage-acceptance"><h4>双方婚意</h4>{[{id:command.subject,label:subject?.name,acceptance:selected.quote.left},{id:selected.id,label:selected.name,acceptance:selected.quote.right}].map(p=><HoverHint key={p.id} label={p.label+'的婚姻接受度'} content={<>{p.acceptance.parts.map(part=><p key={part.label}>{part.label} {part.value>=0?'+':''}{part.value}</p>)}<p>接受度是当前意愿分数。</p></>}><div><strong>{p.label}</strong><span>{p.id===w.characterId?'本人意愿由最终确认表达':p.acceptance.score+' / 70'}</span></div></HoverHint>)}</section>
    <p className={'marriage-candidate-status '+(selected.quote.reason?'is-blocked':'is-ready')} role="status">{selected.quote.reason||'当前可议婚；返回后核对婚资与子女家支。'}</p>
   </>:<div className="marriage-empty"><h3>选择一位人物</h3><p>在左侧比较婚姻、年龄、能力和接受度，在此查看详细条件。</p></div>}</aside>
  </div>
 </ActionDialog>;
}

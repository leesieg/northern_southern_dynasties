import {useMemo,useState,type ReactNode} from 'react';
import {CharacterPortrait} from './CharacterPortrait';
import {ArtIcon,type ArtName} from './ArtIcon';
import {politicalName} from '../core/government';
import type {World} from '../core/types';
import './personSelection.css';
import {ActionDialog} from './ActionDialog';
import {PersonAbilities} from './PersonAbilities';
import {ageLabel,healthLabel} from '../core/lifeState';
import {allegianceRealm} from '../core/officeEligibility';
import {siteById} from '../data/scenario';
import {abilityNames,type Ability} from '../core/social';
import {personCandidates,filterPersonCandidates,personFilterPreset,personSortNames,type PersonOption,type PersonSelectionContext,type PersonFilters,type PersonSort} from './personCandidates';
export type {PersonOption,PersonSelectionContext} from './personCandidates';
export function PositionSeat({world,holder,title,icon='influence',status,onPerson,onManage,children,compact=false}:{world:World;holder?:string|null;title:string;icon?:ArtName;status?:ReactNode;onPerson?:(id:string)=>void;onManage?:()=>void;children?:ReactNode;compact?:boolean}){
 return <article className={'position-seat'+(compact?' position-seat--compact':'')}><button type="button" className="position-image" disabled={holder?!onPerson:!onManage} onClick={()=>holder?onPerson?.(holder):onManage?.()} aria-label={holder?politicalName(holder,world)+' · 查看人物':(compact?'选择':'任命')+title}>{holder?<CharacterPortrait characterId={holder} world={world}/>:<span className="position-vacant"><ArtIcon name={icon} size={40}/><span>虚位以待</span>{onManage&&<b>＋</b>}</span>}</button><strong className="position-name">{holder?politicalName(holder,world):'空缺'}</strong><button className="position-title" disabled={!onManage} onClick={onManage}><ArtIcon name={icon} size={22}/>{title}{onManage&&' ›'}</button>{status&&<small className="position-status">{status}</small>}{children}</article>;
}
export function PersonSelectionDialog({world,title,options,value,onSelect,onClose,onConfirm,confirmLabel='确定人选',pending=false,children,description,context={}}:{world:World;title:string;options:PersonOption[];value:string;onSelect:(id:string)=>void;onClose:()=>void;onConfirm:()=>void;confirmLabel?:string;pending?:boolean;children?:ReactNode;description?:ReactNode;context?:PersonSelectionContext}){
 const [query,setQuery]=useState(''),[sort,setSort]=useState<PersonSort>('recommended'),[filters,setFilters]=useState(()=>personFilterPreset('all')),[page,setPage]=useState(0);
 const realm=context.realm??(world.characterId?allegianceRealm(world,world.characterId):undefined),site=context.site??world.people[0].location;
 const candidates=useMemo(()=>personCandidates(world,options,{realm,site}),[world,options,realm,site]),selected=candidates.find(p=>p.id===value);
 const visible=useMemo(()=>filterPersonCandidates(candidates,filters,query,sort),[candidates,filters,query,sort]),pages=Math.max(1,Math.ceil(visible.length/24)),currentPage=Math.min(page,pages-1),rows=visible.slice(currentPage*24,(currentPage+1)*24);
 const update=(patch:Partial<PersonFilters>)=>{setFilters(f=>({...f,...patch}));setPage(0);},preset=(name:'all'|'available'|'local')=>{setFilters(personFilterPreset(name));setPage(0);};
 return <ActionDialog title={title} onClose={onClose} className="person-selection-dialog person-selection-dialog--compare" actions={<>{children&&<div className="person-selection-extra">{children}</div>}<span className="person-selection-summary">{selected?selected.name:'请选择人物'}{selected?.reason&&<small role="status">{selected.reason}</small>}</span><button className="primary" disabled={pending||!selected||!!selected.reason} onClick={()=>{if(!pending&&selected&&!selected.reason)onConfirm();}}>{confirmLabel}</button></>}>
  {description&&<div className="person-selection-description">{description}</div>}
  <div className="person-selection-tools"><input autoFocus type="search" aria-label="搜索候选人" placeholder="姓名、家族、官职、驻地、文化、特质" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><button onClick={()=>{preset('all');setQuery('');setSort('recommended');}}>重置</button></div>
  <div className="person-selection-presets" role="group" aria-label="候选人快捷筛选">{([['all','全部人选'],['available','可用人选'],['local','同地可用']] as const).map(([key,label])=><button key={key} aria-pressed={JSON.stringify(filters)===JSON.stringify(personFilterPreset(key))} onClick={()=>preset(key)}>{label}</button>)}<small>办理地：{siteById[site]?.name??'未详'}</small></div>
  <div className="person-selection-filters">
   <label>性别<select value={filters.sex} onChange={e=>update({sex:e.target.value as PersonFilters['sex']})}><option value="all">不限</option><option value="male">男性</option><option value="female">女性</option></select></label>
   <label>任职<select value={filters.office} onChange={e=>update({office:e.target.value as PersonFilters['office']})}><option value="all">不限</option><option value="vacant">未任职</option><option value="held">已有任职</option></select></label>
   <label>最小年龄<input type="number" min="0" max="120" placeholder="不限" value={filters.minAge} onChange={e=>update({minAge:e.target.value})}/></label>
   <label>最大年龄<input type="number" min="0" max="120" placeholder="不限" value={filters.maxAge} onChange={e=>update({maxAge:e.target.value})}/></label>
   <label>最低功绩<input type="number" min="0" placeholder="不限" value={filters.minMerit} onChange={e=>update({minMerit:e.target.value})}/></label>
   <label className="person-selection-ability-filter">能力<select aria-label="筛选能力" value={filters.ability} onChange={e=>update({ability:e.target.value as Ability})}>{(Object.keys(abilityNames) as Ability[]).map(key=><option value={key} key={key}>{abilityNames[key]}</option>)}</select><input type="number" aria-label="最低能力" min="0" max="40" placeholder="最低值" value={filters.minAbility} onChange={e=>update({minAbility:e.target.value})}/></label>
   <label className="person-selection-sort">排序<select value={sort} onChange={e=>{setSort(e.target.value as PersonSort);setPage(0);}}>{(Object.keys(personSortNames) as PersonSort[]).map(key=><option value={key} key={key}>{personSortNames[key]}</option>)}</select></label>
   <div className="person-selection-checks">{([['available','仅可用人选'],['sameRealm','同目标政权'],['sameSite','同办理地驻留']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={filters[key]} onChange={e=>update({[key]:e.target.checked})}/>{label}</label>)}</div>
  </div>
  <div className="person-selection-comparison"><section className="person-selection-results" aria-label="候选名单"><div className="person-selection-result-count"><strong>{visible.length} / {candidates.length} 人</strong><small>本次行动的资格与指标</small></div><div className="person-selection-list">
   {rows.map(p=><button key={p.id} className="person-option" aria-pressed={value===p.id} data-unavailable={!!p.reason} onClick={()=>onSelect(p.id)}><span className="person-option-portrait"><CharacterPortrait characterId={p.id} world={world}/></span><span className="person-option-info"><strong>{p.name}{p.fictional?'（架空）':''}</strong><small>{p.sex===undefined?'性别未详':p.sex==='female'?'女':'男'} · {ageLabel(world,p.id)} · {p.familyName}</small><span>{p.title}</span><span>{p.realmName} · {p.location}{p.residence.traveling?'（在途）':''}</span><span>外交 {p.stats.diplomacy} · 军事 {p.stats.martial} · 管理 {p.stats.stewardship} · 谋略 {p.stats.intrigue}</span><span>功绩 {p.merit??'未详'} · 家族威望 {p.prestige}</span><small className={p.reason?'person-option-reason':'person-option-available'}>{p.reason||'当前可选用'}</small></span><span className="person-option-metric">{p.score!==undefined&&<><b>{p.score}</b><small>{p.metric??'本次评价'}</small></>}</span></button>)}
   {!rows.length&&<div className="person-selection-empty"><p>{options.length?'没有符合筛选条件的人物。':'暂无候选人。'}</p>{options.length>0&&<><p>{filters.minAge&&filters.maxAge&&Number(filters.minAge)>Number(filters.maxAge)?'最小年龄不能大于最大年龄。':'可放宽任职、功绩、能力或驻地条件。'}</p><button onClick={()=>{preset('all');setQuery('');}}>重置筛选</button></>}</div>}
  </div><nav className="person-selection-pagination" aria-label="候选名单分页"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage+1} / {pages}</span><button disabled={currentPage>=pages-1} onClick={()=>setPage(currentPage+1)}>下一页</button></nav></section>
  <aside className="person-selection-preview" aria-label="候选人详细预览">{selected?<><div className="person-selection-preview-identity"><CharacterPortrait characterId={selected.id} world={world}/><div><h3>{selected.name}</h3><p>{selected.sex===undefined?'性别未详':selected.sex==='female'?'女':'男'} · {ageLabel(world,selected.id)}</p><p>{healthLabel(world,selected.id)}</p>{selected.fictional&&<small>架空人物</small>}</div></div>
   {!visible.some(p=>p.id===value)&&<p className="person-selection-notice" role="status">当前选择不在筛选结果中，仍可在此查看条件。</p>}
   <p className={selected.reason?'person-option-reason':'person-option-available'} role="status">{selected.reason||'当前满足本次行动的选择条件。'}</p>
   {selected.score!==undefined&&<p className="person-selection-post-score"><strong>{selected.metric??'本次评价'} {selected.score}</strong></p>}{selected.detail&&<p className="person-selection-factors">{selected.detail}</p>}
   <dl><dt>当前任职</dt><dd>{selected.title}</dd><dt>效忠政权</dt><dd>{selected.realmName}</dd><dt>家族</dt><dd>{selected.familyName}</dd><dt>文化</dt><dd>{selected.culture}</dd><dt>驻地</dt><dd>{selected.location}{selected.residence.traveling?' · 在途':selected.sameSite?' · 与办理地相同':' · 异地'}</dd><dt>状态</dt><dd>{!selected.alive?'已故':selected.detained?'被拘押':'自由'}</dd><dt>性格</dt><dd>{selected.traits.join('、')||'未录特质'}</dd></dl>
   <PersonAbilities world={world} person={selected.id}/>
  </>:<div className="person-selection-empty"><h3>选择一位人物</h3><p>比较身份、能力、功绩与任用条件，再确认本次选择。</p></div>}</aside></div>
 </ActionDialog>;
}
/** Choice-only control for an action with additional parameters. No command is sent until its parent confirms. */
export function PersonChoice({world,title,value,onChange,options,pending=false,onPerson}:{world:World;title:string;value:string;onChange:(id:string)=>void;options:PersonOption[];pending?:boolean;onPerson?:(id:string)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(value);
 const selected=options.find(option=>option.id===value);
 return <><PositionSeat compact world={world} holder={value||null} title={title} status={selected?.score!==undefined?`${selected.metric??'能力'} ${selected.score}`:undefined} onPerson={onPerson} onManage={()=>{setDraft(value);setOpen(true);}}/>{open&&<PersonSelectionDialog world={world} title={title} value={draft} options={options} onSelect={setDraft} onClose={()=>setOpen(false)} pending={pending} onConfirm={()=>{onChange(draft);setOpen(false);}}/>}</>;
}

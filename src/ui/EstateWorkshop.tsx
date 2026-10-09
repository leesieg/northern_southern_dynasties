import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {EstatePainting} from './EstatePainting';
import {MobilityPanel} from './MobilityPanel';
import {ArtIcon} from './ArtIcon';
import {ActionDialog} from './ActionDialog';
import {CommandButton} from './CommandButton';
import {SingleChoiceCards} from './SingleChoiceCards';
import {DetailTabs} from './DetailTabs';
import {HoverHint} from './HoverHint';
import {CharacterPortrait} from './CharacterPortrait';
import {RealmBadge} from './RealmBadge';
import {buildQuote,estateBuildings,estateName,type EstateBuilding} from '../core/construction';
import {estateById,estateCapacity,estateGrainCapacity,estateForecast,estateQuote,estateRents,estatePolicies,actualEstatePolicy,estateAccessReason,ordinaryPopulation,ownedEstates,type EstateRent,type EstateCommand} from '../core/estates';
import {manpower,sourceOccupied} from '../core/manpower';
import {accountWallet} from '../core/obligations';
import {nextMonthStart} from '../core/calendar';
import {getPerson} from '../core/personRegistry';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import type {ArtName} from './ArtIcon';
import './estateManagement.css';
type EstateTab='build'|'manage'|'grain'|'family';
const tabs=[{id:'build',label:'营建',icon:'estate'},{id:'manage',label:'经营',icon:'coins'},{id:'grain',label:'庄粮',icon:'grain'},{id:'family',label:'家事',icon:'person'}] as const;
export function EstateWorkshop({world:w,send,pending=false,estateId,onEstate,onPerson,onMilitary,onCity}:{world:World;pending?:boolean;estateId?:string;onEstate?:(id:string)=>void;onPerson?:(id:string)=>void;onMilitary?:()=>void;onCity?:(id:string)=>void;send:(c:GameCommand)=>void}){
 const [selected,setSelected]=useState<EstateBuilding|null>(null),[tab,setTab]=useState<EstateTab>('build'),[draft,setDraft]=useState<EstateCommand|null>(null),close=useRef<HTMLButtonElement>(null),draftOpener=useRef<HTMLElement|null>(null);
 const e=estateId?estateById(w,estateId)??w.holdings.estate:ownedEstates(w)[0]??w.holdings.estate;
 useEffect(()=>{draftOpener.current=null;setSelected(null);setTab('build');setDraft(null);},[e.id,w.characterId]);
 useEffect(()=>{if(!selected)return;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;close.current?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[selected]);
 const d=selected?estateBuildings[selected]:null,cmd=selected?{type:'build',scope:'estate',site:e.location,estate:e.id,building:selected} as const:null,q=cmd?buildQuote(w,cmd):null,level=selected?e.levels[selected]:0,forecast=estateForecast(w,e),own=e.owner===(w.characterId??'fictional'),policy=estatePolicies[actualEstatePolicy(w,e.location)],army=w.realm?manpower(w,e.location,e.owner):null,source=army?.sources.find(s=>s.id===e.id),blocked=w.realm?estateAccessReason(w,e,w.characterId):'',owner=getPerson(w,e.owner),others=ownedEstates(w),occupied=sourceOccupied(w,e.location,e.id).total,free=Math.max(0,estateCapacity(e)-e.population-occupied),coins=own?w.people[0].coins:accountWallet(w,'person:'+e.owner)?.read(),regime=w.realm?.cities[e.location]?.controller;
 const metric=(icon:ArtName,label:string,value:ReactNode,hint:ReactNode)=><HoverHint label={label} content={hint}><div className="estate-summary-resource"><ArtIcon name={icon} size={27}/><span><small>{label}</small><strong>{value}</strong></span></div></HoverHint>;
 useEffect(()=>{if(!draft&&!pending&&draftOpener.current){if(draftOpener.current.isConnected)draftOpener.current.focus({preventScroll:true});draftOpener.current=null;}},[draft,pending]);
 const openDraft=(command:EstateCommand)=>{draftOpener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setDraft(command);};
 const chooseTab=(value:EstateTab)=>{setSelected(null);setDraft(null);setTab(value);};
 const action=(kind:'tenants'|'rent'|'relief'|'withdraw')=><CommandButton label={{tenants:'招佃',rent:'调租',relief:'赈粮',withdraw:'提粮'}[kind]} icon={kind==='tenants'?'person':kind==='rent'?'coins':'grain'} pending={pending} reason={!own?'仅庄主可以支配家产':blocked||(!w.realm?'完整经营需在沙盒中开放':'')} hint={{tenants:'安置本县编户，先比较钱粮、月租与兵源变化',rent:'比较三档租额的收益与留存，每次调整间隔 90 日',relief:'真实庄粮转入本县公仓供民食',withdraw:'本人抵达后，同额提取庄粮作为随身行粮'}[kind]} onClick={()=>openDraft(kind==='rent'?{type:'estate',action:kind,estate:e.id,rent:e.rent}:{type:'estate',action:kind,estate:e.id,amount:kind==='tenants'?100:10})}/>;
 return <div className="estate-detail-layout">
  <aside className="estate-identity-summary" aria-label="庄园身份与资源">
   <div className="estate-location"><button onClick={()=>onCity?.(e.location)} disabled={!onCity}><ArtIcon name="city" size={22}/>{siteById[e.location].name}</button>{regime&&<RealmBadge realm={regime} world={w}/>}</div>
   <button className="estate-owner-seat" onClick={()=>onPerson?.(e.owner)} disabled={!onPerson} aria-label={'查看庄主'+(owner?.name??'沈行舟')}><CharacterPortrait characterId={e.owner} world={w}/><span><strong>{owner?.name??w.people[0].name}</strong><small>庄主</small></span></button>
   <div className="estate-summary-resources">
    {metric('coins',own?'私人钱':'庄主钱',coins?.toLocaleString()??'—','庄主本人现钱；营建及安置由这个钱包支出，与公库隔离')}
    {metric('grain','庄粮',w.realm?`${e.grain} / ${estateGrainCapacity(e)}`:'—',`本庄库存与容量；下次粮租 ${forecast.grain}，预计保管及溢出损失 ${forecast.loss}。不计入公粮`)}
    {metric('person','庄户',w.realm?`${e.population.toLocaleString()} / ${estateCapacity(e).toLocaleString()}`:'—',`在庄民用人口 / 田产承载；另有 ${occupied} 名同源未落户兵员占安置规模，空余 ${free} 人`)}
    {metric('coins','月租钱','+'+forecast.coins,'下期按现有庄户、作坊、租额与实际赋役预测，非已收款；失守暂停提租')}
    {metric('army','私人兵额',source?.privateAvailable??'—',`本庄剩余私人来源额度；总动员比例 4%，在军、训练、伤俘与返乡继续占额。庄主本县所有来源合计 ${army?.privateAvailable??0}`)}
    {metric('influence','赋役',w.realm?policy.name:'教学经营',`本县实际执行：农业税普通口径的 ${Math.round(policy.tax*100)}%，庄园兵额分公军 ${Math.round(policy.publicShare*100)}%；朝廷改目标后仍需地方完成核籍`)}
   </div>
   <div className="estate-summary-status"><strong>{estateRents[e.rent].name}经营</strong><small>下期结算 {nextMonthStart(w.day,w.scriptId)-w.day} 日</small>{blocked&&<p role="status">{blocked}</p>}</div>
   {others.length>1&&<label className="estate-property-switch">本人庄园<select value={own?e.id:''} onChange={event=>onEstate?.(event.target.value)}>{!own&&<option value="">正在查阅他人庄园</option>}{others.map(a=><option key={a.id} value={a.id}>{siteById[a.location].name} · {estateName(a.family)}</option>)}</select></label>}
   <small className="estate-history-note">开局庄产规模为剧本设定。</small>
  </aside>
  <section className="estate-workspace" aria-label="庄园事务">
   <DetailTabs label="庄园页签" value={tab} onChange={chooseTab} items={tabs}/>
   <div className={'estate-tab-content estate-tab-'+tab}>
    {tab==='build'&&<EstatePainting estate={e} day={w.day} economy={!!w.realm} selected={selected} onSelect={id=>setSelected(current=>current===id?null:id)}>
     {selected&&d&&q&&cmd&&<section className={'estate-building-popover at-'+selected} role="dialog" aria-label={d.name+'营建'} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setSelected(null);}}}><header><h3>{d.name}<small>{level}/3 级</small></h3><button ref={close} aria-label="关闭营建详情" onClick={()=>setSelected(null)}>×</button></header><div className="estate-building-body"><p>{w.realm?d.effect:selected==='fields'?'教学局每级每月行粮 +6':selected==='workshop'?'教学局每级每月收入 +6 钱':selected==='storehouse'?'教学局每级每月行粮 +3':d.effect}</p>{e.project?.building===selected&&<div><progress max={e.project.due-e.project.started} value={w.day-e.project.started}/><small>余 {Math.max(0,e.project.due-w.day)} 日 · 完工后 {e.project.level} 级</small></div>}{level<3&&<div className="estate-building-cost"><span><ArtIcon name="coins" size={22}/>{q.cost} 私人钱</span><span>{q.days} 日</span></div>}{(q.reason||!own)&&<small className="estate-requirement" role="status">{q.reason||'仅庄主可动用私财营建'}</small>}</div><footer><button onClick={()=>setSelected(null)}>返回</button><button className="primary" disabled={pending||!!q.reason||!own} onClick={()=>{if(pending||buildQuote(w,cmd).reason||!own)return;send(cmd);setSelected(null);}}>{level>=3?'已满级':level?'扩建至 '+q.level+' 级':'确认兴建'}</button></footer></section>}
    </EstatePainting>}
    {tab==='manage'&&<section className="estate-business-page"><header><h3>庄户与经营</h3><span>{estateRents[e.rent].name} · {own?'本人经营':'查阅家产'}</span></header><div className="estate-business-facts"><span>空余安置<strong>{free.toLocaleString()} 人</strong></span><span>本县编户<strong>{w.realm?ordinaryPopulation(w,e.location).toLocaleString():'—'} 人</strong></span><span>下期租入<strong>{forecast.coins} 钱</strong></span></div><p className="estate-note">{estateRents[e.rent].description}。招佃只改变本县人口依附，现役及返乡兵员仍占安置规模。</p><div className="estate-page-actions">{action('tenants')}{action('rent')}<CommandButton label="置业" icon="estate" pending={pending} reason={!own?'仅可为本人开办庄园':blocked||(!w.realm?'完整经营需在沙盒中开放':'')} hint="比较地点与私人支出，田庄需十日竣工后再招佃" onClick={()=>openDraft({type:'estate',action:'found',site:w.people[0].location})}/>{onMilitary&&<CommandButton label="军队" icon="army" hint="进入军事页，按真实来源选择征募与训练" onClick={onMilitary}/>}</div><div className="estate-policy-note"><h4>本县赋役 · {policy.name}</h4><p>农业赋税 {Math.round(policy.tax*100)}% · 庄园兵额公军 / 私人 {Math.round(policy.publicShare*100)}% / {100-Math.round(policy.publicShare*100)}%。实际政策由地方核籍差事执行。</p></div></section>}
    {tab==='grain'&&<section className="estate-grain-page"><header><h3>庄仓收支</h3><span>粮租留在本庄</span></header><div className="estate-business-facts"><span>现有庄粮<strong>{e.grain} / {estateGrainCapacity(e)}</strong></span><span>下期粮租<strong>+{forecast.grain}</strong></span><span>预计损失<strong>{forecast.loss}</strong></span></div><p className="estate-note">保管与溢出损失按实际库存和仓容结算。庄粮与公粮分开；本地部曲优先取粮，远方收成不会自动进入旅囊。</p><div className="estate-page-actions">{action('relief')}{action('withdraw')}</div><section className="estate-local-troops"><h4>本地部曲</h4>{(w.realm?.armies??[]).filter(a=>a.owner===e.owner&&a.location===e.location&&!a.journey).map(a=><p key={a.id}>第 {a.id} 军 · {a.troops} 人 · 随军粮 {a.supply}</p>)}{!(w.realm?.armies??[]).some(a=>a.owner===e.owner&&a.location===e.location&&!a.journey)&&<p>本地暂无庄主部曲。</p>}</section></section>}
    {tab==='family'&&<section className="estate-family-page"><header><h3>家族相聚</h3><span>{siteById[e.location].name}</span></header>{own&&w.mobility?<MobilityPanel world={w} site={e.location} estate embedded send={send} pending={pending}/>:<p className="estate-note">{own?'家事在沙盒人物中办理。':'请进入庄主的人物详情，查阅其家族与关系。'}</p>}{!own&&onPerson&&<CommandButton label="庄主" icon="person" hint="查看庄主的人物、家族和关系" onClick={()=>onPerson(e.owner)}/>}</section>}
   </div>
  </section>
  {draft&&<EstateOrder world={w} estate={e.id} draft={draft} onDraft={setDraft} pending={pending} send={send} onClose={()=>setDraft(null)}/>}
 </div>;
}
function EstateOrder({world:w,estate,draft,onDraft,pending,send,onClose}:{world:World;estate:string;draft:EstateCommand;onDraft:(c:EstateCommand)=>void;pending:boolean;send:(c:GameCommand)=>void;onClose:()=>void}){
 const e=estateById(w,estate)!,quote=estateQuote(w,draft),tenants=draft.action==='tenants',forecast=estateForecast(w,e),before=manpower(w,e.location,e.owner);
 const after=tenants&&Number.isSafeInteger(draft.amount)&&draft.amount>0&&draft.amount<=Math.min(ordinaryPopulation(w,e.location),estateCapacity(e)-e.population-sourceOccupied(w,e.location,e.id).total)?(()=>{const next=structuredClone(w);estateById(next,e.id)!.population+=draft.amount;return {army:manpower(next,e.location,e.owner),income:estateForecast(next,estateById(next,e.id)!)};})():null;
 return <ActionDialog title={{found:'开办庄园',tenants:'招佃安置',rent:'调整租额',relief:'庄粮赈济',withdraw:'提取行粮'}[draft.action]} scene="landscape" className="estate-management-dialog" onClose={onClose} actions={<button className="primary" disabled={pending||!!quote.reason} onClick={()=>{if(pending||estateQuote(w,draft).reason)return;send(draft);onClose();}}>确认{draft.action==='rent'?'调租':draft.action==='found'?'置业':draft.action==='tenants'?'安置 '+draft.amount+' 人':'支粮'} · {Number.isFinite(quote.coins)?quote.coins:'—'} 钱 / {Number.isFinite(quote.grain)?quote.grain:'—'} 粮</button>}>
  <p>{getPerson(w,w.characterId??'fictional')?.name} · {draft.action==='found'?siteById[draft.site]?.name:estateName(e.family)+'，'+siteById[e.location].name} · 使用本人私财与庄粮。</p>
  {draft.action==='found'?<label>置业县域<select value={draft.site} onChange={event=>onDraft({...draft,site:event.target.value})}>{Object.keys(w.realm!.cities).map(site=><option key={site} value={site}>{siteById[site].name}</option>)}</select></label>:draft.action==='rent'?<SingleChoiceCards label="租额 · 单选" value={draft.rent} onChange={rent=>onDraft({...draft,rent:rent as EstateRent})} options={Object.entries(estateRents).map(([id,r])=>{const next=structuredClone(w),proposed=estateById(next,e.id)!;proposed.rent=id as EstateRent;const income=estateForecast(next,proposed);return {id,title:r.name,description:r.description,detail:`月租钱 ${income.coins}、粮租 ${income.grain}；份额 ${Math.round(r.share*100)}%，90 日冷却`};})}/>:<label>{tenants?'安置人口':'庄粮数量'}<input type="number" min={1} max={2000} step={1} value={Number.isFinite(draft.amount)?draft.amount:''} onChange={event=>onDraft({...draft,amount:event.target.valueAsNumber})}/></label>}
  {tenants&&<><p>本县普通编户 {ordinaryPopulation(w,e.location).toLocaleString()} 人；空余安置规模 {Math.max(0,estateCapacity(e)-e.population-sourceOccupied(w,e.location,e.id).total)} 人。同源现役与返乡在途仍占规模。</p><p>县域民用人口保持 {w.realm!.cities[e.location].population.toLocaleString()} 人；月租钱 {forecast.coins} → {after?.income.coins??forecast.coins}，公共兵额 {before.publicAvailable} → {after?.army.publicAvailable??before.publicAvailable}，本人私人兵额 {before.privateAvailable} → {after?.army.privateAvailable??before.privateAvailable}。普通农业税源减少，商业税不变。</p></>}
  {draft.action==='found'&&<p>民间置业 80 钱、田庄施工 40 钱；十日竣工后承载 2000 人，招佃须另付安置钱粮。建造期间预留县域经营容量。</p>}{draft.action==='relief'&&<p>庄粮减少 {draft.amount}，本县民食公仓增加同额；不发钱、不制造人口。</p>}{draft.action==='withdraw'&&<p>庄粮减少 {draft.amount}，本人随身行粮增加同额；远方收成不会自动送进旅囊。</p>}{quote.reason&&<p role="status">{quote.reason}</p>}
 </ActionDialog>;
}

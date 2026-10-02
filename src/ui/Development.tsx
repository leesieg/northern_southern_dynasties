import {nextMonthStart} from '../core/calendar';
import {TerritoryTabs} from './TerritoryNavigation';
import {EstateWorkshop} from './EstateWorkshop';
import {localBalance} from '../core/treasury';
import {accountName,publicBalance} from '../core/treasury';
import {canCommission,servicePayer} from '../core/serviceMandates';
import {assignmentBudget,assignmentPlanQuote,serviceCandidates,serviceReason} from '../core/assignments';
import {civicBuildings} from '../core/officialDuties';
import {assignmentPlans,type AssignmentKind,type AssignmentPlan} from '../data/assignments';
import {politicalName} from '../core/government';
import {playerRealm} from '../core/realm';
import {countyTerritory,localAncestors,localHolder,localTitle} from '../core/localAdministration';
import {PersonChoice} from './PersonSelection';
import {ActionDialog} from './ActionDialog';
import {attributes} from '../core/social';
import {CitySummary} from './CitySummary';
import {CityDistrict} from './CityDistrict';
import type {RealmId} from '../core/realm';
import {isSovereign,centralMinistry} from '../core/officialDuties';
import {constructionModifiers} from '../core/construction';
import {postStatus} from '../core/retinue';
import {TravelStatus} from './MobilityPanel';
import {HoverHint} from './HoverHint';
import {CityManagement} from './CityManagement';
import {LocalRequests} from './LocalAdministration';
import './cityNavigation.css';
import { ArtIcon } from './ArtIcon';
import { buildingModifiers,traitsFor } from '../core/social';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { siteById } from '../data/scenario';
import { buildQuote, cityBuildings, emptyCity, type CityBuilding } from '../core/construction';
import type { GameCommand, World } from '../core/types';

const CityViewport=lazy(()=>import('../city/CityViewport'));

export type CityTab='model'|'build'|'governance'|'military'|'coordination'|'service'|'finance'|'population'|'offices'|'people'|'travel'|'history';
export function LocationDevelopment({world,selected,onSelect,onPerson,onRetinue,onService,send,pending=false,tab:requestedTab,onTab,localTasks,overview,travel,people,peopleCount,onDiplomacy,onTerritory}:{onDiplomacy:(r:RealmId)=>void;onTerritory:(id:string)=>void;onPerson?:(id:string)=>void;onRetinue?:()=>void;onService?:()=>void;pending?:boolean;tab:CityTab;onTab:(tab:CityTab)=>void;people:ReactNode;localTasks:ReactNode;peopleCount:number;overview:ReactNode;travel:ReactNode;world:World;selected:string;onSelect:(id:string)=>void;send:(command:GameCommand)=>void}){
  const tab:CityTab=!world.realm&&['governance','service','military','finance','population','coordination','offices'].includes(requestedTab)?'history':requestedTab==='coordination'?'service':requestedTab==='offices'?'governance':requestedTab;
  const [cityBuilding,setCityBuilding]=useState<CityBuilding|null>(null);
  useEffect(()=>setCityBuilding(null),[selected]);

  return <section className="location-development">
    <CitySummary key={selected} world={world} site={selected} pending={pending} send={send} onPerson={onPerson} onDiplomacy={onDiplomacy} onDistrict={()=>onTab('history')}/>
    <TerritoryTabs tab={tab} onTab={onTab} peopleCount={peopleCount} governance={!!world.realm}/>
    {tab==='model'&&<Suspense fallback={<div className="city-model-loading">正在载入城市模型…</div>}><CityViewport key={selected} holding={world.holdings.cities[selected]??emptyCity()} day={world.day} name={siteById[selected].name} capital={!!siteById[selected].capital} selected={cityBuilding} onSelect={id=>{setCityBuilding(id);onTab('build');}}/></Suspense>}
    {(['governance','service','military','finance','population'].includes(tab))&&<CityManagement onTransport={()=>onTab('population')} section={tab} localTasks={localTasks} onPerson={onPerson} key={selected} world={world} selected={selected} pending={pending} send={send}/>}
    {tab==='governance'&&world.realm?.local?.requests.some(q=>q.status==='pending'&&q.territory===countyTerritory(selected)&&(q.actor===world.characterId||q.approver===world.characterId))&&<LocalRequests world={world} pending={pending} send={send} territory={countyTerritory(selected)} pendingOnly/>}
    {tab==='people'?people:tab==='travel'?<><TravelStatus world={world}/>{travel}</>:tab==='history'?<><CityDistrict world={world} site={selected} onTerritory={onTerritory} onCity={onSelect}/>{overview}</>:tab==='build'?<ConstructionPanel key={selected} world={world} scope="city" site={selected} send={send} onPerson={onPerson} onService={onService} onRetinue={onRetinue} pending={pending} selectedCityBuilding={cityBuilding}/>:null}
  </section>;
}
export function ConstructionPanel({world,scope,site,send,onPerson,onService,onRetinue,pending=false,selectedCityBuilding=null}:{onPerson?:(id:string)=>void;onService?:()=>void;onRetinue?:()=>void;pending?:boolean;selectedCityBuilding?:CityBuilding|null;world:World;scope:'city'|'estate';site:string;send:(command:GameCommand)=>void}){
  const [orderOpen,setOrderOpen]=useState(false);
  const [orderedBuilding,setOrderedBuilding]=useState<CityBuilding|null>(selectedCityBuilding),[officer,setOfficer]=useState(''),[plan,setPlan]=useState<AssignmentPlan>('balanced');
  useEffect(()=>{setOrderedBuilding(selectedCityBuilding);setOrderOpen(false);},[selectedCityBuilding]);
  if(scope==='estate')return <EstateWorkshop world={world} send={send} pending={pending}/>;
  const holding=world.holdings.cities[site]??emptyCity(),definitions=cityBuildings,project=holding.project;
  const r=world.realm?playerRealm(world):null,actor=world.characterId!,delegated=!!r&&canCommission(world,actor,r,site,'marketworks')&&(!world.holdings.governedCities.includes(site)||isSovereign(world));
  const selected=orderedBuilding,kind=selected?(Object.keys(civicBuildings) as AssignmentKind[]).find(k=>civicBuildings[k as keyof typeof civicBuildings]===selected):undefined;
  const candidates=r?serviceCandidates(world,r):[],chosen=candidates.some(c=>c.id===officer)?officer:candidates[0]?.id??'';
  const order=kind?{type:'service' as const,action:'open' as const,kind,site,officer:chosen,plan}:null;
  const orderReason=order?serviceReason(world,order):'',budget=kind?assignmentBudget(kind,plan):null,quote=kind&&r&&chosen?assignmentPlanQuote(world,{kind,site,officer:chosen,helper:null,realm:r},plan):null;
  const payer=kind&&r?servicePayer(world,{kind,site,realm:r,officer:chosen,mandate:{issuer:actor,automatic:false,orderFloor:40,qualityFloor:85,reserve:0}},actor):null;
  const active=world.service?.tasks.find(t=>t.site===site&&t.phase!=='closed'&&Object.hasOwn(civicBuildings,t.kind));
  const office=r?(isSovereign(world)?'君主':localAncestors(countyTerritory(site)).find(n=>localHolder(world,n.id,r)===actor)?.id):null;
  return <div className="construction-panel city-development">
    {world.holdings.governedCities.includes(site)&&world.retinue&&!isSovereign(world)&&!['secretariat','finance'].includes(centralMinistry(world,world.characterId!)??'')&&postStatus(world,'engineer',site).reason&&onRetinue&&<button onClick={onRetinue}><ArtIcon name="person" size={24}/>安排营造参军 ›</button>}
    {delegated?<p className="construction-note">你以{office&&office!=='君主'?localTitle(office):office??'执政者'}身份统辖此地；下令后由承办人赴任办理，按实际贡献考绩。</p>:!world.holdings.governedCities.includes(site)&&<p className="construction-note">尚无本城治理权或上级统辖权；可在官职席位申请任职。</p>}
    {world.social&&!delegated&&<HoverHint label="营建费用与修正" content={<p>{world.realm?`使用本城公库（余额 ${localBalance(world,site)} 钱）；不足时前往公库页申请拨款。`:''}新工程造价 {buildingModifiers(world).costRate}% · 工期 {constructionModifiers(world,scope,site).timeRate}%，已计入报价。{traitsFor(world).includes('diligent')&&'勤勉：每次动工压力 +6。'}现有工程不受后续修正影响。</p>}><span className="construction-note"><ArtIcon name="coins" size={22}/>{world.realm?'本城公库 · 报价明细':'营建报价明细'}</span></HoverHint>}
    {project&&<div className="construction-progress" role="status"><strong>{cityBuildings[project.building as CityBuilding].name} · 扩建至 {project.level} 级</strong><progress value={world.day-project.started} max={project.due-project.started}/><span>还需 {project.due-world.day} 日 · 已支付 {project.cost} 钱</span></div>}
    {active&&<p className="construction-note">{siteById[site].name}已有营建差事，由{politicalName(active.officer)}承办；本城不能并行开工。{onService&&<button onClick={onService}>查看差事簿 →</button>}</p>}
    <CityConstructionScene world={world} site={site} selected={selected} onSelect={id=>{setOrderedBuilding(id);setOrderOpen(false);}} onClose={()=>setOrderedBuilding(null)}>
      {selected&&(()=>{const command={type:'build',scope:'city',site,building:selected} as const,q=buildQuote(world,command),level=holding.levels[selected],d=definitions[selected];return <>
        <h3>{d.name} <small>{level} / 3 级</small></h3><p>{d.effect}</p>
        {project?.building===selected&&<p>施工中 · 余 {Math.max(0,project.due-world.day)} 日</p>}
        {delegated?<><p>由承办人赴任营建，下一步选择方案与人员并核准专款。</p><button className="primary" disabled={pending||level>=3||!!active} onClick={()=>setOrderOpen(true)}>{level>=3?'已满级':'选择承办人与方案'}</button>{active&&<small>本城已有营建差事，不能并行开工。</small>}</>:<>
          <div className="estate-plot-cost"><ArtIcon name="coins" size={22}/><b>{q.cost} 钱</b><span>{q.days} 日</span></div><small>来源：{world.realm?'本城公库':'个人盘缠'} · 确认后动工</small>
          <button className="primary" disabled={pending||!!q.reason} onClick={()=>{if(pending||buildQuote(world,command).reason)return;send(command);setOrderedBuilding(null);}}> {level>=3?'已满级':`确认${level?'扩建':'兴建'} · ${q.cost} 钱`}</button>{q.reason&&<small role="status">{q.reason}</small>}
        </>}
      </>;})()}
    </CityConstructionScene>
    {orderOpen&&delegated&&kind&&r&&<ActionDialog title={`下令营建 · ${definitions[selected!].name}`} onClose={()=>setOrderOpen(false)} actions={world.service?.enabled?<button className="primary" disabled={pending||!!orderReason} onClick={()=>{if(!order||serviceReason(world,order))return;send(order);setOrderedBuilding(null);}}>确认下令 · {assignmentPlans[plan].name}</button>:null}>
      {!world.service?.enabled?<p>开启公务办理后，可选承办人和方案，下达本城营建委任。<button onClick={()=>send({type:'service',action:'begin'})} disabled={pending}>开启公务办理</button></p>:<>
        <div className="action-summary"><p>下令人：{politicalName(actor)} · 承办：{chosen?politicalName(chosen):'待选'} · 方案：<strong>{assignmentPlans[plan].name}</strong></p><p>核准后从 {payer?accountName(payer.account):'主管公库'}（现有 {payer?publicBalance(world,payer.account):0} 钱）与{payer?.grainSite?'本城公粮':'中央公粮'}划拨 {budget?.coins} 钱／{budget?.grain} 粮，赴任并实际办理后生效。</p><p>预计核准、赴任后约 {quote?.days??0} 个有效办理日；阻碍和等待另计。</p></div>
        <PersonChoice world={world} title="承办人" value={chosen} onChange={setOfficer} onPerson={onPerson} pending={pending} options={candidates.map(c=>({id:c.id,score:attributes(world,c.id).stewardship,metric:'管理',reason:serviceReason(world,{type:'service',action:'open',kind,site,officer:c.id,plan})}))}/>
        <fieldset className="construction-plan-options"><legend>办理方案 · 单选</legend><div className="construction-plan-grid">{(Object.keys(assignmentPlans) as AssignmentPlan[]).map(p=>{const planBudget=assignmentBudget(kind,p),estimate=chosen?assignmentPlanQuote(world,{kind,site,officer:chosen,helper:null,realm:r},p):null;return <label key={p} className={`construction-plan-card ${plan===p?'is-selected':''}`}><input type="radio" name={`construction-plan-${site}`} value={p} checked={plan===p} onChange={()=>setPlan(p)} disabled={pending}/><strong>{assignmentPlans[p].name}</strong><span className="construction-plan-state" aria-hidden="true">{plan===p?'已选':'选择'}</span><span className="construction-plan-description">{assignmentPlans[p].description}</span><span className="construction-plan-metrics"><span><small>拨款</small><b>{planBudget.coins} 钱 · {planBudget.grain} 粮</b></span><span><small>有效办理</small><b>{estimate?`约 ${estimate.days} 日`:'待选承办人'}</b></span><span><small>基础质量</small><b>{estimate?`${estimate.quality}%`:'—'}</b></span></span></label>;})}</div></fieldset>
        {orderReason&&<p className="service-warning" role="status">{orderReason}</p>}
      </>}
    </ActionDialog>}
    <p className="construction-note">下一次收支结算：{nextMonthStart(world.day,world.scriptId)-world.day} 日后。时间暂停时，工期与收益暂停结算。</p>
  </div>;
}

function CityConstructionScene({world,site,selected,onSelect,onClose,children}:{world:World;site:string;selected:CityBuilding|null;onSelect:(id:CityBuilding)=>void;onClose:()=>void;children:ReactNode}){
 const scene=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!selected)return;close.current?.focus();return()=>{scene.current?.querySelector<HTMLButtonElement>(`[data-city-building="${selected}"]`)?.focus();};},[selected]);
 const dismiss=onClose;
 return <div className="city-construction-scene" ref={scene}>
  <Suspense fallback={<div className="city-model-loading">正在载入营建城景…</div>}><CityViewport holding={world.holdings.cities[site]??emptyCity()} day={world.day} name={siteById[site].name} capital={!!siteById[site].capital} selected={selected} onSelect={onSelect}/></Suspense>
  {selected&&<section className="city-construction-popover" aria-label={cityBuildings[selected].name+'营建详情'} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();dismiss();}}}><button ref={close} className="scene-preview-close" aria-label="关闭营建详情" onClick={dismiss}>×</button>{children}</section>}
 </div>;
}

import {InkTreasury} from './InkTreasury';
import {BuildingArtwork} from './TerritoryArtwork';
import {RulerHistoryPanel} from './PoliticalIdentity';
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
import { useEffect, useState, type ReactNode } from 'react';
import { siteById } from '../data/scenario';
import { buildQuote, cityBuildings, emptyCity, type CityBuilding } from '../core/construction';
import type { GameCommand, World } from '../core/types';



export type CityTab='model'|'build'|'governance'|'military'|'coordination'|'service'|'finance'|'population'|'offices'|'people'|'travel'|'history';
export function LocationDevelopment({world,selected,onPerson,onRetinue,onService,send,pending=false,tab:requestedTab,onTab,localTasks,overview,travel,people,peopleCount,onDiplomacy,onTerritory}:{onDiplomacy:(r:RealmId)=>void;onTerritory:(id:string)=>void;onPerson?:(id:string)=>void;onRetinue?:()=>void;onService?:()=>void;pending?:boolean;tab:CityTab;onTab:(tab:CityTab)=>void;people:ReactNode;localTasks:ReactNode;peopleCount:number;overview:ReactNode;travel:ReactNode;world:World;selected:string;onSelect:(id:string)=>void;send:(command:GameCommand)=>void}){
  const tab:CityTab=!world.realm&&['governance','service','military','finance','population','coordination','offices'].includes(requestedTab)?'build':requestedTab==='coordination'?'service':requestedTab==='offices'?'governance':requestedTab==='model'?'build':requestedTab;

  const [building,setBuilding]=useState<CityBuilding|null>(null);
  return <section className="location-development" data-tab={tab}>
    <CitySummary key={selected} world={world} site={selected} pending={pending} send={send} onPerson={onPerson} onDiplomacy={onDiplomacy}/>
    <TerritoryTabs tab={tab} onTab={onTab} peopleCount={peopleCount} governance={!!world.realm}/>
    <div key={selected+'|'+tab} className="territory-page-content">
    {tab!=='build'&&<button className="territory-page-close" aria-label="收起辖区事务" onClick={()=>onTab('build')}>×</button>}
    {tab==='finance'&&world.realm&&world.realm.cities[selected].controller!=='frontier'&&<InkTreasury key={selected} world={world} territory={'city:'+selected} realm={world.realm.cities[selected].controller as RealmId} pending={pending} send={send} onSelect={onTerritory} onPerson={onPerson}/>}
    {tab==='finance'&&world.realm?.cities[selected].controller==='frontier'&&<p>此地尚无所属政权公库。</p>}
    {(['governance','service','military','population'].includes(tab))&&<CityManagement onTransport={()=>onTab('population')} section={tab} localTasks={localTasks} onPerson={onPerson} key={selected} world={world} selected={selected} pending={pending} send={send}/>}
    {tab==='governance'&&world.realm?.local?.requests.some(q=>q.status==='pending'&&q.territory===countyTerritory(selected)&&(q.actor===world.characterId||q.approver===world.characterId))&&<LocalRequests world={world} pending={pending} send={send} territory={countyTerritory(selected)} pendingOnly/>}
    {tab==='people'?people:tab==='travel'?<><TravelStatus world={world}/>{travel}{overview}</>:tab==='build'?<ConstructionPanel key={selected} world={world} scope="city" site={selected} send={send} onPerson={onPerson} onService={onService} onRetinue={onRetinue} pending={pending} selectedCityBuilding={building} onCloseBuilding={()=>setBuilding(null)}/>:null}
    {tab==='history'&&world.realm&&<RulerHistoryPanel world={world} territory={countyTerritory(selected)} onPerson={onPerson??(()=>{})}/>}
    </div>
    <nav className="territory-building-strip" aria-label="县域建筑">{(Object.keys(cityBuildings) as CityBuilding[]).map(id=><button key={id} data-city-building={id} aria-pressed={tab==='build'&&building===id} onClick={()=>{setBuilding(id);onTab('build');}}><BuildingArtwork building={id} level={world.holdings.cities[selected]?.levels[id]??0}/><strong>{cityBuildings[id].name}</strong><small>{world.holdings.cities[selected]?.levels[id]?world.holdings.cities[selected].levels[id]+' 级':'未建'}</small></button>)}</nav>
  </section>;
}
export function ConstructionPanel({world,scope,site,send,onPerson,onService,onRetinue,pending=false,selectedCityBuilding=null,onCloseBuilding}:{onCloseBuilding?:()=>void;onPerson?:(id:string)=>void;onService?:()=>void;onRetinue?:()=>void;pending?:boolean;selectedCityBuilding?:CityBuilding|null;world:World;scope:'city'|'estate';site:string;send:(command:GameCommand)=>void}){
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
    {active&&<p className="construction-progress" role="status">{siteById[site].name}已有营建差事，由{politicalName(active.officer,world)}承办；本城不能并行开工。{onService&&<button onClick={onService}>查看差事簿 →</button>}</p>}
    <CityConstructionScene world={world} site={site} selected={selected} onSelect={id=>{setOrderedBuilding(id);setOrderOpen(false);}} onClose={()=>{setOrderedBuilding(null);onCloseBuilding?.();}} actions={selected&&(()=>{const command={type:'build',scope:'city',site,building:selected} as const,q=buildQuote(world,command),level=holding.levels[selected];return delegated?<button className="primary" disabled={pending||level>=3||!!active} onClick={()=>setOrderOpen(true)}>{level>=3?'已满级':'选择承办人与方案'}</button>:<button className="primary" disabled={pending||!!q.reason} onClick={()=>{if(pending||buildQuote(world,command).reason)return;send(command);setOrderedBuilding(null);onCloseBuilding?.();}}>{level>=3?'已满级':`确认${level?'扩建':'兴建'} · ${q.cost} 钱`}</button>;})()}>
      {selected&&(()=>{const command={type:'build',scope:'city',site,building:selected} as const,q=buildQuote(world,command),level=holding.levels[selected],d=definitions[selected];return <>
        <h3>{d.name} <small>{level} / 3 级</small></h3><p>{world.realm?d.effect.split('；教学局')[0]:d.effect}</p>
        {project?.building===selected&&<p>施工中 · 余 {Math.max(0,project.due-world.day)} 日</p>}
        {delegated?<><p>由承办人赴任营建，下一步选择方案与人员并核准专款。</p><div className="construction-quote-metrics"><span><small>核准专款</small><b>{budget?.coins??0} 钱 · {budget?.grain??0} 粮</b></span><span><small>有效办理</small><b>{quote?quote.days+' 日':'待选承办人'}</b></span></div><small>当前预览：{assignmentPlans[plan].name} · {payer?accountName(payer.account):'主管公库'}；赴任和等待另计。</small>{active&&<small>本城已有营建差事，不能并行开工。</small>}</>:<>
          <div className="estate-plot-cost"><ArtIcon name="coins" size={22}/><b>{q.cost} 钱</b><span>{q.days} 日</span></div><small>来源：{world.realm?'本城公库':'个人盘缠'} · 确认后动工</small>
          {q.reason&&<small role="status">{q.reason}</small>}
        </>}
      </>;})()}
    </CityConstructionScene>
    {orderOpen&&delegated&&kind&&r&&<ActionDialog title={`下令营建 · ${definitions[selected!].name}`} onClose={()=>setOrderOpen(false)} actions={world.service?.enabled?<button className="primary" disabled={pending||!!orderReason} onClick={()=>{if(!order||serviceReason(world,order))return;send(order);setOrderedBuilding(null);setOrderOpen(false);onCloseBuilding?.();}}>确认下令 · {assignmentPlans[plan].name}</button>:null}>
      {!world.service?.enabled?<p>开启公务办理后，可选承办人和方案，下达本城营建委任。<button onClick={()=>{send({type:'service',action:'begin'});setOrderOpen(false);setOrderedBuilding(null);onCloseBuilding?.();}} disabled={pending}>开启公务办理</button></p>:<>
        <div className="action-summary"><p>下令人：{politicalName(actor,world)} · 承办：{chosen?politicalName(chosen,world):'待选'} · 方案：<strong>{assignmentPlans[plan].name}</strong></p><p>核准后从 {payer?accountName(payer.account):'主管公库'}（现有 {payer?publicBalance(world,payer.account):0} 钱）与{payer?.grainSite?'本城公粮':'中央公粮'}划拨 {budget?.coins} 钱／{budget?.grain} 粮，赴任并实际办理后生效。</p><p>预计核准、赴任后约 {quote?.days??0} 个有效办理日；阻碍和等待另计。</p></div>
        <PersonChoice world={world} title="承办人" value={chosen} onChange={setOfficer} onPerson={onPerson} pending={pending} options={candidates.map(c=>({id:c.id,score:attributes(world,c.id).stewardship,metric:'管理',reason:serviceReason(world,{type:'service',action:'open',kind,site,officer:c.id,plan})}))}/>
        <fieldset className="construction-plan-options"><legend>办理方案 · 单选</legend><div className="construction-plan-grid">{(Object.keys(assignmentPlans) as AssignmentPlan[]).map(p=>{const planBudget=assignmentBudget(kind,p),estimate=chosen?assignmentPlanQuote(world,{kind,site,officer:chosen,helper:null,realm:r},p):null;return <label key={p} className={`construction-plan-card ${plan===p?'is-selected':''}`}><input type="radio" name={`construction-plan-${site}`} value={p} checked={plan===p} onChange={()=>setPlan(p)} disabled={pending}/><strong>{assignmentPlans[p].name}</strong><span className="construction-plan-state" aria-hidden="true">{plan===p?'已选':'选择'}</span><span className="construction-plan-description">{assignmentPlans[p].description}</span><span className="construction-plan-metrics"><span><small>拨款</small><b>{planBudget.coins} 钱 · {planBudget.grain} 粮</b></span><span><small>有效办理</small><b>{estimate?`约 ${estimate.days} 日`:'待选承办人'}</b></span><span><small>基础质量</small><b>{estimate?`${estimate.quality}%`:'—'}</b></span></span></label>;})}</div></fieldset>
        {orderReason&&<p className="service-warning" role="status">{orderReason}</p>}
      </>}
    </ActionDialog>}
    <p className="construction-note">下一次收支结算：{nextMonthStart(world.day,world.scriptId)-world.day} 日后。时间暂停时，工期与收益暂停结算。</p>
  </div>;
}

function CityConstructionScene({world,site,selected,onSelect,onClose,children,actions}:{world:World;site:string;selected:CityBuilding|null;onSelect:(id:CityBuilding)=>void;onClose:()=>void;children:ReactNode;actions:ReactNode}){
 const level=selected?(world.holdings.cities[site]??emptyCity()).levels[selected]:0;
 return <div className="city-construction-scene">
  {!selected&&<nav className="construction-inline-buildings" aria-label="选择营建建筑">{(Object.keys(cityBuildings) as CityBuilding[]).map(id=><button key={id} onClick={()=>onSelect(id)}><BuildingArtwork building={id}/>{cityBuildings[id].name}</button>)}</nav>}
  {selected&&<ActionDialog className="territory-construction-dialog" title={siteById[site].name+' · '+cityBuildings[selected].name} onClose={onClose} cancelLabel="返回县域" actions={actions}>
   <div className="construction-art-summary"><BuildingArtwork building={selected} level={Math.max(1,level)}/><h3>{cityBuildings[selected].name}</h3><p>当前 · {level?level+' 级':'未建'}</p><p>{world.realm?cityBuildings[selected].effect.split('；教学局')[0]:cityBuildings[selected].effect}</p></div>
   <div className="construction-level-detail"><div className="construction-levels" aria-label="建筑等级">{[1,2,3].map(n=><div key={n} className={n===level+1?'is-next':n<=level?'is-built':'is-locked'}><BuildingArtwork building={selected} level={n}/><strong>{n} 级</strong><small>{n<=level?'已建':n===level+1?'本次营建':'后续'}</small></div>)}</div><div className="construction-live-quote">{children}</div></div>
  </ActionDialog>}
 </div>;
}

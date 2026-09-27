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
import {ConfirmAction} from './ConfirmAction';
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
import './cityNavigation.css';
import { ArtIcon } from './ArtIcon';
import { buildingModifiers,traitsFor } from '../core/social';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { siteById } from '../data/scenario';
import { buildQuote, cityBuildings, emptyCity, type Building, type CityBuilding } from '../core/construction';
import type { GameCommand, World } from '../core/types';

const CityViewport=lazy(()=>import('../city/CityViewport'));

export type CityTab='model'|'build'|'governance'|'military'|'coordination'|'service'|'finance'|'population'|'offices'|'people'|'travel'|'history';
export function LocationDevelopment({world,selected,onSelect,onPerson,onRetinue,onService,send,pending=false,tab:requestedTab,onTab,localTasks,overview,travel,people,peopleCount,onDiplomacy,onTerritory}:{onDiplomacy:(r:RealmId)=>void;onTerritory:(id:string)=>void;onPerson?:(id:string)=>void;onRetinue?:()=>void;onService?:()=>void;pending?:boolean;tab:CityTab;onTab:(tab:CityTab)=>void;people:ReactNode;localTasks:ReactNode;peopleCount:number;overview:ReactNode;travel:ReactNode;world:World;selected:string;onSelect:(id:string)=>void;send:(command:GameCommand)=>void}){
  const tab:CityTab=requestedTab==='coordination'?'service':requestedTab==='offices'?'governance':requestedTab;
  const [cityBuilding,setCityBuilding]=useState<CityBuilding|null>(null);

  return <section className="location-development">
    <CitySummary world={world} site={selected} pending={pending} send={send} onPerson={onPerson} onDiplomacy={onDiplomacy} onDistrict={()=>onTab('history')}/>
    <TerritoryTabs tab={tab} onTab={onTab} peopleCount={peopleCount} governance={!!world.realm}/>
    {tab==='model'&&<Suspense fallback={<div className="city-model-loading">正在载入城市模型…</div>}><CityViewport key={selected} holding={world.holdings.cities[selected]??emptyCity()} day={world.day} name={siteById[selected].name} capital={!!siteById[selected].capital} selected={cityBuilding} onSelect={id=>{setCityBuilding(id);onTab('build');}}/></Suspense>}
    {(['governance','service','military','finance','population'].includes(tab))&&<CityManagement section={tab} localTasks={localTasks} onPerson={onPerson} key={selected} world={world} selected={selected} pending={pending} send={send}/>}
    {tab==='people'?people:tab==='travel'?<><TravelStatus world={world}/>{travel}</>:tab==='history'?<><CityDistrict world={world} site={selected} onTerritory={onTerritory} onCity={onSelect}/>{overview}</>:tab==='build'?<ConstructionPanel world={world} scope="city" site={selected} send={send} onPerson={onPerson} onService={onService} onRetinue={onRetinue} pending={pending} selectedCityBuilding={cityBuilding}/>:null}
  </section>;
}
export function ConstructionPanel({world,scope,site,send,onPerson,onService,onRetinue,pending=false,selectedCityBuilding=null}:{onPerson?:(id:string)=>void;onService?:()=>void;onRetinue?:()=>void;pending?:boolean;selectedCityBuilding?:CityBuilding|null;world:World;scope:'city'|'estate';site:string;send:(command:GameCommand)=>void}){
  const [orderedBuilding,setOrderedBuilding]=useState<CityBuilding|null>(null),[officer,setOfficer]=useState(''),[plan,setPlan]=useState<AssignmentPlan>('balanced'),[confirm,setConfirm]=useState(false);
  if(scope==='estate')return <EstateWorkshop world={world} send={send}/>;
  const holding=world.holdings.cities[site]??emptyCity(),definitions=cityBuildings,project=holding.project;
  const r=world.realm?playerRealm(world):null,actor=world.characterId!,delegated=!!r&&canCommission(world,actor,r,site,'marketworks')&&(!world.holdings.governedCities.includes(site)||isSovereign(world));
  const selected=orderedBuilding??selectedCityBuilding,kind=selected?(Object.keys(civicBuildings) as AssignmentKind[]).find(k=>civicBuildings[k as keyof typeof civicBuildings]===selected):undefined;
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
    <div className="building-list">{Object.entries(definitions).map(([id,d])=>{
      const command={type:'build' as const,scope,site,building:id as Building};
      const quote=buildQuote(world,command),level=(holding.levels as Record<string,number>)[id];
      const duty=(Object.keys(civicBuildings) as AssignmentKind[]).find(k=>civicBuildings[k as keyof typeof civicBuildings]===id),blocked=delegated?serviceReason(world,{type:'service',action:'open',kind:duty!,site,officer:chosen,plan}):quote.reason;
      return <article key={id} className={`building-row ${(selected===id)?'is-selected':''}`}><div><h4>{d.name}<span>{level} / 3 级</span></h4><p>{d.effect}</p></div>{level<3&&<small title={delegated?'按选定方案核定差事预算':`造价 ${quote.cost} 钱，工期 ${quote.days} 日`}><ArtIcon name="coins" size={24}/>{delegated?'委任营建':`${quote.cost} · ${quote.days} 日`}</small>}<HoverHint label={d.name+'营建要求'} content={blocked|| (delegated?'选择方案和承办人后下令，核准专款后开办。':`支付 ${quote.cost} 钱，工期 ${quote.days} 日`)}><button disabled={pending||(delegated?level>=3||!!active:!!blocked)} onClick={()=>delegated?setOrderedBuilding(id as CityBuilding):send(command)}>{level>=3?'已满级':delegated?'选定工程':level?'扩建至 '+quote.level+' 级':'兴建'}</button></HoverHint></article>;
    })}</div>
    {delegated&&kind&&r&&<section className="construction-order"><h4>下令营建 · {definitions[selected!].name}</h4>{!world.service?.enabled?<button onClick={()=>send({type:'service',action:'begin'})} disabled={pending}>开启公务办理</button>:<><PersonChoice world={world} title="承办人" value={chosen} onChange={setOfficer} onPerson={onPerson} pending={pending} options={candidates.map(c=>({id:c.id,score:attributes(world,c.id).stewardship,metric:'管理',reason:serviceReason(world,{type:'service',action:'open',kind,site,officer:c.id,plan})}))}/><div className="service-plan-grid">{(Object.keys(assignmentPlans) as AssignmentPlan[]).map(p=>{const budget=assignmentBudget(kind,p),estimate=chosen?assignmentPlanQuote(world,{kind,site,officer:chosen,helper:null,realm:r},p):null;return <button key={p} aria-pressed={plan===p} onClick={()=>setPlan(p)}><strong>{assignmentPlans[p].name}</strong><span>{budget.coins} 钱 · {budget.grain} 粮{estimate?` · 约 ${estimate.days} 办理日 · 质量 ${estimate.quality}%`:''}</span></button>;})}</div><p>下令人：{politicalName(actor)} · 承办：{chosen?politicalName(chosen):'待选'} · 支出：{payer?accountName(payer.account):'待核'}（现有 {payer?publicBalance(world,payer.account):0} 钱）与{payer?.grainSite?'本城公粮':'中央公粮'} · 预算 {budget?.coins} 钱／{budget?.grain} 粮。预计核准、赴任后约 {quote?.days??0} 个有效办理日，阻碍和等待另计。</p>{orderReason&&<p className="service-warning">{orderReason}</p>}<button className="primary" disabled={pending||!!orderReason} onClick={()=>setConfirm(true)}>下令营建</button>{confirm&&order&&<ConfirmAction title="确认下令营建？" detail={`由 ${politicalName(chosen)} 承办；核准后从 ${payer?accountName(payer.account):'主管公库'} 拨 ${budget?.coins} 钱、${budget?.grain} 粮，赴任并实际办理后生效。`} confirmLabel="确认下令" pending={pending||!!orderReason} onCancel={()=>setConfirm(false)} onConfirm={()=>{if(serviceReason(world,order))return;send(order);setConfirm(false);}}/>}</>}</section>}
    <p className="construction-note">下一次收支结算：{30-world.day%30} 日后。时间暂停时，工期与收益暂停结算。</p>
  </div>;
}

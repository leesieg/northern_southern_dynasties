import {TerritoryTabs} from './TerritoryNavigation';
import {EstateWorkshop} from './EstateWorkshop';
import {localBalance} from '../core/treasury';
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
export function LocationDevelopment({world,selected,onSelect,onPerson,onRetinue,send,pending=false,tab:requestedTab,onTab,localTasks,overview,travel,people,peopleCount,onDiplomacy,onTerritory}:{onDiplomacy:(r:RealmId)=>void;onTerritory:(id:string)=>void;onPerson?:(id:string)=>void;onRetinue?:()=>void;pending?:boolean;tab:CityTab;onTab:(tab:CityTab)=>void;people:ReactNode;localTasks:ReactNode;peopleCount:number;overview:ReactNode;travel:ReactNode;world:World;selected:string;onSelect:(id:string)=>void;send:(command:GameCommand)=>void}){
  const tab:CityTab=requestedTab==='coordination'?'service':requestedTab==='offices'?'governance':requestedTab;
  const [cityBuilding,setCityBuilding]=useState<CityBuilding|null>(null);

  return <section className="location-development">
    <CitySummary world={world} site={selected} pending={pending} send={send} onPerson={onPerson} onDiplomacy={onDiplomacy} onDistrict={()=>onTab('history')}/>
    <TerritoryTabs tab={tab} onTab={onTab} peopleCount={peopleCount} governance={!!world.realm}/>
    {tab==='model'&&<Suspense fallback={<div className="city-model-loading">正在载入城市模型…</div>}><CityViewport key={selected} holding={world.holdings.cities[selected]??emptyCity()} day={world.day} name={siteById[selected].name} capital={!!siteById[selected].capital} selected={cityBuilding} onSelect={id=>{setCityBuilding(id);onTab('build');}}/></Suspense>}
    {(['governance','service','military','finance','population'].includes(tab))&&<CityManagement section={tab} localTasks={localTasks} onPerson={onPerson} key={selected} world={world} selected={selected} pending={pending} send={send}/>}
    {tab==='people'?people:tab==='travel'?<><TravelStatus world={world}/>{travel}</>:tab==='history'?<><CityDistrict world={world} site={selected} onTerritory={onTerritory} onCity={onSelect}/>{overview}</>:tab==='build'?<ConstructionPanel world={world} scope="city" site={selected} send={send} onRetinue={onRetinue} selectedCityBuilding={cityBuilding}/>:null}
  </section>;
}
export function ConstructionPanel({world,scope,site,send,onRetinue,selectedCityBuilding=null}:{onPerson?:(id:string)=>void;onRetinue?:()=>void;selectedCityBuilding?:CityBuilding|null;world:World;scope:'city'|'estate';site:string;send:(command:GameCommand)=>void}){
  if(scope==='estate')return <EstateWorkshop world={world} send={send}/>;
  const holding=world.holdings.cities[site]??emptyCity(),definitions=cityBuildings,project=holding.project;
  return <div className="construction-panel city-development">
    {world.holdings.governedCities.includes(site)&&world.retinue&&!isSovereign(world)&&!['secretariat','finance'].includes(centralMinistry(world,world.characterId!)??'')&&postStatus(world,'engineer',site).reason&&onRetinue&&<button onClick={onRetinue}><ArtIcon name="person" size={24}/>安排营造参军 ›</button>}
    {!world.holdings.governedCities.includes(site)&&<p className="construction-note">尚无本城治理权，请点击县令席位申请任职。</p>}
    {world.social&&<HoverHint label="营建费用与修正" content={<p>{world.realm?`使用本城公库（余额 ${localBalance(world,site)} 钱）；不足时前往公库页申请拨款。`:''}新工程造价 {buildingModifiers(world).costRate}% · 工期 {constructionModifiers(world,scope,site).timeRate}%，已计入报价。{traitsFor(world).includes('diligent')&&'勤勉：每次动工压力 +6。'}现有工程不受后续修正影响。</p>}><span className="construction-note"><ArtIcon name="coins" size={22}/>{world.realm?'本城公库 · 报价明细':'营建报价明细'}</span></HoverHint>}
    {project&&<div className="construction-progress" role="status"><strong>{cityBuildings[project.building as CityBuilding].name} · 扩建至 {project.level} 级</strong><progress value={world.day-project.started} max={project.due-project.started}/><span>还需 {project.due-world.day} 日 · 已支付 {project.cost} 钱</span></div>}
    <div className="building-list">{Object.entries(definitions).map(([id,d])=>{
      const command={type:'build' as const,scope,site,building:id as Building};
      const quote=buildQuote(world,command),level=(holding.levels as Record<string,number>)[id];
      return <article key={id} className={`building-row ${(selectedCityBuilding===id)?'is-selected':''}`}><div><h4>{d.name}<span>{level} / 3 级</span></h4><p>{d.effect}</p></div>{level<3&&<small title={`造价 ${quote.cost} 钱，工期 ${quote.days} 日`}><ArtIcon name="coins" size={24}/>{quote.cost} · {quote.days} 日</small>}<HoverHint label={d.name+'营建要求'} content={quote.reason||`支付 ${quote.cost} 钱，工期 ${quote.days} 日`}><button disabled={!!quote.reason} onClick={()=>send(command)}>{level>=3?'已满级':level?'扩建至 '+quote.level+' 级':'兴建'}</button></HoverHint></article>;
    })}</div><p className="construction-note">下一次收支结算：{30-world.day%30} 日后。时间暂停时，工期与收益暂停结算。</p>
  </div>;
}

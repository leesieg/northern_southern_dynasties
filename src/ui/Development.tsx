import {CityOfficeSeat} from './CityOfficeSeat';
import {OfficialActions} from './OfficialActions';
import {isSovereign,centralMinistry} from '../core/officialDuties';
import {constructionModifiers} from '../core/construction';
import {postStatus} from '../core/retinue';
import {MobilityPanel,TravelStatus} from './MobilityPanel';
import {HoverHint} from './HoverHint';
import {CityManagement} from './CityManagement';
import './cityNavigation.css';
import { ArtIcon,type ArtName } from './ArtIcon';
import { buildingModifiers,traitsFor } from '../core/social';
import { familyName } from '../data/characters';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { administration, administrationPath, countyGroups, historySources } from '../data/administration';
import { siteById, sites } from '../data/scenario';
import { buildQuote, cityBuildings, emptyCity, estateBuildings, type Building, type EstateBuilding, type CityBuilding } from '../core/construction';
import { EstatePainting } from './EstatePainting';
import type { GameCommand, World } from '../core/types';

const CityViewport=lazy(()=>import('../city/CityViewport'));

export type CityTab='model'|'build'|'governance'|'military'|'people'|'travel'|'history';
export function LocationDevelopment({world,selected,onSelect,onPerson,onRetinue,send,pending=false,tab,onTab,overview,travel,people,peopleCount}:{onPerson?:(id:string)=>void;onRetinue?:()=>void;pending?:boolean;tab:CityTab;onTab:(tab:CityTab)=>void;people:ReactNode;peopleCount:number;overview:ReactNode;travel:ReactNode;world:World;selected:string;onSelect:(id:string)=>void;send:(command:GameCommand)=>void}){
  const [cityBuilding,setCityBuilding]=useState<CityBuilding|null>(null);
  const a=administration[selected];
  return <section className="location-development">
    {world.realm&&<div className="city-lord-heading"><CityOfficeSeat world={world} site={selected} pending={pending} send={send} onPerson={onPerson}/><OfficialActions world={world} site={selected} pending={pending} send={send}/></div>}
    <nav className="development-tabs city-icon-tabs" aria-label="城市操作">{([['model','城景','city'],['build','营建','estate'],['governance','治理','coins'],['military','军务','army'],['people','人物','person'],['travel','出行','world'],['history','区划','influence']] as [CityTab,string,ArtName][]).filter(([id])=>!!world.realm||!['governance','military'].includes(id)).map(([id,label,icon])=><button key={id} aria-pressed={tab===id} title={id==='model'?'城市模型':id==='people'?`驻留人物 ${peopleCount} 人`:label} onClick={()=>onTab(id)}><ArtIcon name={icon} size={26}/><span>{label}{id==='people'&&<small>{peopleCount}</small>}</span></button>)}</nav>
    {tab==='model'&&<Suspense fallback={<div className="city-model-loading">正在载入城市模型…</div>}><CityViewport key={selected} holding={world.holdings.cities[selected]??emptyCity()} day={world.day} name={siteById[selected].name} capital={!!siteById[selected].capital} selected={cityBuilding} onSelect={id=>{setCityBuilding(id);onTab('build');}}/></Suspense>}
    {(tab==='governance'||tab==='military')&&<CityManagement onPerson={onPerson} key={selected+tab} world={world} selected={selected} tab={tab} pending={pending} send={send}/>}
    {tab==='people'?people:tab==='travel'?<><TravelStatus world={world}/>{travel}<MobilityPanel world={world} site={selected} send={send} pending={pending}/></>:tab==='history'?<><div className="history-card">
      <p className="admin-path">{administrationPath(selected)}</p>
      {a?<><span className="source-status">{a.status==='period-source'?'同代地志记载':'较早地志基底 · 梁／西魏沿革待校'}</span><p>{a.note}</p>
        <div className="county-register"><span>辖县记载 · 部分</span><div>{(countyGroups[a.group as keyof typeof countyGroups]??[a.county.replace(/县$/,'')]).map(name=>{
          const linked=sites.find(s=>administration[s.id]?.group===a.group&&administration[s.id]?.county===(name.endsWith('县')?name:name+'县'));
          return linked?<button key={name} className={linked.id===selected?'active':''} onClick={()=>onSelect(linked.id)}>{name}<small>{linked.capital?'都城':'县治'}</small></button>:<span key={name} className="unmapped-county">{name}<small>未定位</small></span>;
        })}</div></div>
        <details><summary>史料与地图精度</summary><p>辖县记载尚不完整；城址为近似位置，色块不代表精确历史县界。</p>{a.sources.map(key=><a key={key} href={historySources[key].url} target="_blank" rel="noreferrer">{historySources[key].title} ↗</a>)}</details>
      </>:<p>此城行政隶属待考。</p>}
    </div>{overview}</>:tab==='build'?<ConstructionPanel world={world} scope="city" site={selected} send={send} onRetinue={onRetinue} selectedCityBuilding={cityBuilding}/>:null}
  </section>;
}
export function ConstructionPanel({world,scope,site,send,onRetinue,selectedCityBuilding=null}:{onPerson?:(id:string)=>void;onRetinue?:()=>void;selectedCityBuilding?:CityBuilding|null;world:World;scope:'city'|'estate';site:string;send:(command:GameCommand)=>void}){
  const [selectedBuilding,setSelectedBuilding]=useState<EstateBuilding>('hall');
  const estate=scope==='estate',holding=estate?world.holdings.estate:world.holdings.cities[site]??emptyCity();
  const definitions=estate?estateBuildings:cityBuildings;
  const project=holding.project;
  return <div className={`construction-panel ${estate?'estate-development':'city-development'}`}>
    {!estate&&world.holdings.governedCities.includes(site)&&world.retinue&&!isSovereign(world)&&!['secretariat','finance'].includes(centralMinistry(world,world.characterId!)??'')&&postStatus(world,'engineer',site).reason&&onRetinue&&<button onClick={onRetinue}><ArtIcon name="person" size={24}/>安排营造参军 ›</button>}
    {estate?<><div className="estate-overview"><span className="estate-seal" style={{fontSize:familyName(world.holdings.estate.family).length>1?20:undefined}}>{familyName(world.holdings.estate.family)}</span><div><span className="eyebrow">家族产业 · 不附属于官职</span><h3>{siteById[site].name} · {familyName(world.holdings.estate.family)}氏庄园</h3><p>主宅 {world.holdings.estate.levels.hall} 级 · 附属建筑 {Object.entries(holding.levels).filter(([id,n])=>id!=='hall'&&n>0).length} / {world.holdings.estate.levels.hall}</p></div></div><p className="construction-note">基础家产每 30 日收入 4 钱。主宅扩建开放建筑位；田庄、作坊与庄仓可升级。</p></>:<p className="construction-note">{!world.holdings.governedCities.includes(site)&&'尚无本城治理权，请前往政务请求任职。'}</p>}
    {estate&&<MobilityPanel world={world} site={site} estate send={send}/>}
    {estate&&<EstatePainting estate={world.holdings.estate} day={world.day} selected={selectedBuilding} onSelect={setSelectedBuilding}/>}
    {world.social&&<p className="construction-note">{world.realm?(estate?'使用个人钱粮营建家产。':'使用本政权公库营建城市。'):''}新工程造价 {buildingModifiers(world).costRate}% · 工期 {constructionModifiers(world,scope,site).timeRate}%，已计入报价。{traitsFor(world).includes('diligent')&&'勤勉：每次动工压力 +6。'}现有工程不受后续修正影响。</p>}
    {project&&<div className="construction-progress" role="status"><strong>{({...cityBuildings,...estateBuildings})[project.building].name} · 扩建至 {project.level} 级</strong><progress value={world.day-project.started} max={project.due-project.started}/><span>还需 {project.due-world.day} 日 · 已支付 {project.cost} 钱</span></div>}
    <div className="building-list">{Object.entries(definitions).map(([id,d])=>{
      const command={type:'build' as const,scope,site,building:id as Building};
      const quote=buildQuote(world,command),level=(holding.levels as Record<string,number>)[id];
      return <article key={id} className={`building-row ${(estate?selectedBuilding===id:selectedCityBuilding===id)?'is-selected':''}`}><div><h4>{estate?<button className="estate-building-picker" aria-pressed={selectedBuilding===id} onClick={()=>setSelectedBuilding(id as EstateBuilding)}>{d.name}<span>{level} / 3 级</span></button>:<>{d.name}<span>{level} / 3 级</span></>}</h4><p>{d.effect}</p></div>{level<3&&<small title={`造价 ${quote.cost} 钱，工期 ${quote.days} 日`}><ArtIcon name="coins" size={24}/>{quote.cost} · {quote.days} 日</small>}<HoverHint label={d.name+'营建要求'} content={quote.reason||`支付 ${quote.cost} 钱，工期 ${quote.days} 日`}><button disabled={!!quote.reason} onClick={()=>send(command)}>{level>=3?'已满级':level?'扩建至 '+quote.level+' 级':'兴建'}</button></HoverHint></article>;
    })}</div><p className="construction-note">下一次收支结算：{30-world.day%30} 日后。时间暂停时，工期与收益暂停结算。{estate&&'关闭庄园窗口后可继续推进时间。'}</p>
  </div>;
}

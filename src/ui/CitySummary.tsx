import {civilWar} from '../core/civilWars';
import {politicalName} from '../core/government';
import {localEfficiency} from '../core/localAdministration';
import {populationEstimates,populationBasisLabel} from '../data/populationEstimates';
import {RealmBadge} from './RealmBadge';
import {WarDeclaration} from './WarDeclaration';
import {useState} from 'react';
import {RealmFlag} from './RealmFlag';
import {CityOfficeSeat} from './CityOfficeSeat';
import {ArtIcon,type ArtName} from './ArtIcon';
import {grainCapacity} from '../core/population';
import {HoverHint} from './HoverHint';
import {siteById} from '../data/scenario';
import {localBalance,fiscalPath} from '../core/treasury';
import {personInfluence,influenceIncome,influenceIncomeHint} from '../core/personalInfluence';
import {regimeName} from '../core/government';
import {cityYield,integrationGain,playerRealm} from '../core/realm';
import type {RealmId} from '../core/realm';
import type {World,GameCommand} from '../core/types';
export function CitySummary({world:w,site,pending,send,onPerson,onDiplomacy,onDistrict}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void;onDiplomacy:(r:RealmId)=>void;onDistrict:()=>void}){
 const [warOpen,setWarOpen]=useState(false);
 const city=siteById[site],c=w.realm?.cities[site],owner=c?.owner??city.polity,controller=c?.controller??owner,r=controller==='frontier'?null:controller,holder=c?.governor;
 const internal=r?civilWar(w,r):undefined,controllerPerson=internal?.civil&&(internal.civil.cities.includes(site)?internal.civil.claimant:internal.civil.loyalist);
 const entries=w.realm?.fiscal?.entries.filter(e=>e.day>=Math.floor(w.day/30)*30&&(e.from===fiscalPath(w,site)[0]||e.to===fiscalPath(w,site)[0]))??[],net=entries.reduce((n,e)=>n+(e.to===fiscalPath(w,site)[0]?e.coins:-e.coins),0),signed=(n:number)=>(n>=0?'+':'')+n;
 const y=c?cityYield(w,site):null;
 const integration=c?.integration?integrationGain(w,site):null;
 const resource=(icon:ArtName,name:string,value:number|null,change:string,help:string)=><HoverHint label={name} content={help}><div className="city-summary-resource"><ArtIcon name={icon} size={28}/><span><small>{name}</small><strong>{value??'—'}</strong></span>{change&&<em>{change}</em>}</div></HoverHint>;
 return <header className="city-summary"><div className="city-summary-identity"><button className="city-country" aria-label={regimeName(w,owner)+'详情'} disabled={owner==='frontier'} onClick={()=>owner!=='frontier'&&onDiplomacy(owner)}><RealmFlag world={w} realm={owner} compact showLabel={false}/></button><div><h2>{city.name}</h2><small>{city.capital?'都城':'治所'} · {city.terrain}</small>{c?.integration&&integration&&<HoverHint label="新附领地接管" content={`接管 ${c.integration.progress}/100；税收恢复 ${Math.round((.5+c.integration.progress/200)*100)}%；本期行政支出 ${y?.expense??0} 钱。${c.integration.funded?'上期拨款足额':'上期接管经费不足或刚签约'}；${integration.connected?'道路可达':'无本国控制的通路'}；${integration.garrison?'有供粮驻军':'无供粮驻军'}；${c.governor?'县令在任':'县令待任'}。下期预计进展 ${integration.gain} 点，需足额拨款。`}><span className="city-integration-status">新附 · 接管 {c.integration.progress}/100</span></HoverHint>}{controllerPerson&&<button className="city-district-link" onClick={()=>onPerson?.(controllerPerson)}><ArtIcon name="army" size={20}/>{politicalName(controllerPerson)}实控</button>}{controller!==owner&&<span>占领：<RealmBadge realm={controller} world={w} onOpen={onDiplomacy}/></span>}{w.realm&&owner!=='frontier'&&(owner!==playerRealm(w)||controller!==playerRealm(w))&&<button className="city-district-link" onClick={()=>setWarOpen(true)}><ArtIcon name="army" size={20}/>军事评估</button>}<button className="city-district-link" onClick={onDistrict}>区划 ›</button></div>{c&&<CityOfficeSeat key={site} world={w} site={site} pending={pending} send={send} onPerson={onPerson}/>}</div>{warOpen&&owner!=='frontier'&&<WarDeclaration world={w} target={(owner===playerRealm(w)?controller:owner) as RealmId} initialSite={site} pending={pending} send={send} onClose={()=>setWarOpen(false)} onPerson={onPerson}/>}
 {c&&<div className="city-summary-resources">{resource('coins','本城公款',r?localBalance(w,site):null,entries.length?signed(net)+' 本期':'暂无流水',`本城公库余额。本期为当前 30 日期内账目净收支，包含拨款、营建与行政支出。预计每期税收 ${y!.coins}，行政支出 ${y!.expense}；商贸效率 ${y!.region.trade}，商路畅通 ${Math.round(y!.access*100)}%。`)}{resource('grain','本城公粮',c.grain,signed(y!.grain-y!.food)+' / 30日',`本城产粮 ${y!.grain}，民食 ${y!.food}，仓容 ${grainCapacity(w,site)}；此为保管损耗前净值，调粮须等待队伍抵达。`)}{resource('influence','县令影响力',holder?personInfluence(w,holder):null,holder?`每 30 日 +${influenceIncome(w,holder).total}`:'虚位以待',holder?influenceIncomeHint(w,holder):'职位空缺，无县令个人影响力。')}{resource('person','人口',c.population,'',`${populationBasisLabel(site)}：开局 ${populationEstimates[site].people} 人（范围 ${populationEstimates[site].low}—${populationEstimates[site].high}），包含县治和周边乡里。${populationEstimates[site].note} ${y!.region.name} · 土地承载 ${Math.round(y!.capacity)} 人 · 可用劳力 ${Math.round(y!.labor*100)}% · 农业效率 ${y!.region.fertility} · 县令管理修正 ${y!.management}%，上级统筹修正 ${localEfficiency(w,site)}%。超出土地承载的人口按较低效率生产。`)}{resource('steadfast','秩序',c.order,'','地方秩序影响生产与迁民损耗；税制、赈济和地方公务会改变秩序。')}{resource('city','繁荣',c.prosperity,'','地方繁荣参与城市产出计算，可通过地方营建和公务改善。')}</div>}</header>;
}

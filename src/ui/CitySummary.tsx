import {RealmBadge} from './RealmBadge';
import {RealmFlag} from './RealmFlag';
import {CityOfficeSeat} from './CityOfficeSeat';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {siteById} from '../data/scenario';
import {localBalance,fiscalPath} from '../core/treasury';
import {personInfluence} from '../core/personalInfluence';
import {regimeName} from '../core/government';
import type {RealmId} from '../core/realm';
import type {World,GameCommand} from '../core/types';
export function CitySummary({world:w,site,pending,send,onPerson,onDiplomacy,onDistrict}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void;onDiplomacy:(r:RealmId)=>void;onDistrict:()=>void}){
 const city=siteById[site],c=w.realm?.cities[site],owner=c?.owner??city.polity,controller=c?.controller??owner,r=controller==='frontier'?null:controller,t=r?w.realm?.treasuries[r]:null,holder=c?.governor;
 const entries=w.realm?.fiscal?.entries.filter(e=>e.day>=Math.floor(w.day/30)*30&&(e.from===fiscalPath(w,site)[0]||e.to===fiscalPath(w,site)[0]))??[],net=entries.reduce((n,e)=>n+(e.to===fiscalPath(w,site)[0]?e.coins:-e.coins),0),signed=(n:number)=>(n>=0?'+':'')+n;
 const resource=(icon:'coins'|'grain'|'influence',name:string,value:number|null,change:string,help:string)=><HoverHint label={name} content={help}><div className="city-summary-resource"><ArtIcon name={icon} size={28}/><span><small>{name}</small><strong>{value??'—'}</strong></span><em>{change}</em></div></HoverHint>;
 return <header className="city-summary"><div className="city-summary-identity"><button className="city-country" aria-label={regimeName(w,owner)+'详情'} disabled={owner==='frontier'} onClick={()=>owner!=='frontier'&&onDiplomacy(owner)}><RealmFlag world={w} realm={owner} compact showLabel={false}/></button><div><h2>{city.name}</h2><small>{city.capital?'都城':'治所'} · {city.terrain}</small>{controller!==owner&&<span>占领：<RealmBadge realm={controller} world={w} onOpen={onDiplomacy}/></span>}<button className="city-district-link" onClick={onDistrict}>区划 ›</button></div>{c&&<CityOfficeSeat key={site} world={w} site={site} pending={pending} send={send} onPerson={onPerson}/>}</div>
 {c&&<div className="city-summary-resources">{resource('coins','本城公款',r?localBalance(w,site):null,entries.length?signed(net)+' 本期':'暂无流水','本城公库余额。本期为当前 30 日期内现存账目中的净收支；包含拨款、营建与行政支出，不是税收预测。')}{resource('grain','中央公粮',t?.grain??null,r&&w.realm?.ledger.some(l=>l.realm===r)?signed(t!.lastFood)+' 上期预算':'未结算',regimeName(w,controller)+'中央粮仓余额及上期粮食净收支预算；粮食未分设城市账户。')}{resource('influence','刺史影响力',holder?personInfluence(w,holder):null,holder?'例行 +5 / 30日':'虚位以待','在任刺史的个人影响力；每 30 日例行增长 5，公务奖励和行动支出另计，最高 999。不是城市自有资源。')}</div>}</header>;
}

import {politicalAction} from '../core/politicalActions';
import {PopulationPanel} from './PopulationPanel';
import {RealmBadge} from './RealmBadge';
import {TreasuryPanel} from './TreasuryPanel';
import {ArmyCommand,MobilityPanel} from './MobilityPanel';
import {OfficialActions} from './OfficialActions';
import {HoverHint} from './HoverHint';
import {useState,type ReactNode} from 'react';
import {ArtIcon,type ArtName} from './ArtIcon';
import {armyDailyFood,armyMonthlyPay,playerRealm,realmReason,type RealmCommand,type Tax} from '../core/realm';
import {governmentOf} from '../core/government';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import './realm.css';
export function CityManagement({world:w,selected,pending,send,onPerson,localTasks}:{localTasks?:ReactNode;onPerson?:(id:string)=>void;world:World;selected:string;pending:boolean;send:(c:GameCommand)=>void}){
 const [confirm,setConfirm]=useState<string|null>(null),s=w.realm;
 if(!s)return null;
 const r=playerRealm(w),city=s.cities[selected],army=s.armies.find(a=>a.realm===r),war=s.war,musterSite=s.cities[w.people[0].home].controller===r?w.people[0].home:Object.keys(s.cities).find(id=>s.cities[id].controller===r);
 const action=(c:RealmCommand,label:string,icon:ArtName,detail:string,danger=false)=>{const reason=realmReason(w,c),key=JSON.stringify(c),current=c.action==='tax'&&c.tax===city.tax;return <div className="city-policy-item" key={key}><HoverHint label={label} content={<>{detail}{(['tax','muster','war'].includes(c.action)?politicalAction(w,r,c.action==='tax'?'tax':'military').parts:[]).filter(p=>p.value).map(p=><p key={p.id}>{p.label} · {p.value>0?'支持':'反对'} {Math.abs(p.value)}</p>)}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason||current} aria-pressed={current} className={danger?'danger':''} onClick={()=>{if(danger&&confirm!==key){setConfirm(key);return;}setConfirm(null);send(c);}}><ArtIcon name={icon} size={28}/><span><strong>{confirm===key?'确认'+label:label}</strong>{current&&<small>现行</small>}</span></button></HoverHint>{confirm===key&&<button className="city-action-cancel" onClick={()=>setConfirm(null)}>取消</button>}</div>;};
 return <div className="realm-panel city-management">
 <section><h3><ArtIcon name="city" size={24}/>民政</h3><div className="city-policy-grid">{(['light','normal','heavy'] as Tax[]).map(tax=>action({type:'realm',action:'tax',site:selected,tax},({light:'轻税',normal:'常税',heavy:'重税'})[tax],'coins',({light:'税额 70% · 秩序 +4 / 期',normal:'税额 100% · 秩序 +1 / 期',heavy:'税额 140% · 秩序 −6 / 期'})[tax]))}{action({type:'realm',action:'relief',site:selected},'赈济','grain','50 公粮 · 秩序 +15')}</div></section>
 <section><h3><ArtIcon name="diligent" size={24}/>地方公务</h3>{localTasks}<MobilityPanel embedded world={w} site={selected} send={send} pending={pending}/>{city.owner===r&&city.controller===r&&<OfficialActions world={w} site={selected} send={send} pending={pending}/>}</section>
 <section><h3><ArtIcon name="army" size={24}/>军务</h3>{army&&<div className="city-army-status"><strong><RealmBadge realm={r} world={w}/>军队 · {siteById[army.location].name}{army.journey?' → '+siteById[army.journey.route.at(-1)!].name:''}</strong><div className="city-civic-metrics"><span>兵员 <b>{army.troops}</b></span><span>士气 <b>{army.morale}</b></span><span>随军粮 <b>{army.supply}</b></span></div><small>每日需粮 {armyDailyFood(w,army)} · 每期军饷 {armyMonthlyPay(w,army)}{army.siege?` · 围城 ${army.siege} 日`:''}</small>{army.convoy&&<p><ArtIcon name="grain" size={20}/>军粮 {army.convoy.grain} · {siteById[army.convoy.from].name} → {siteById[army.convoy.to].name} · 余 {army.convoy.durations.slice(army.convoy.leg).reduce((n,d)=>n+d,0)-army.convoy.elapsed} 个通行日</p>}</div>}<div className="city-policy-grid">{action({type:'realm',action:'muster'},'动员','army',(musterSite?siteById[musterSite].name:'无驻地')+' · 600 人 · 120 钱 / 120 粮'+(governmentOf(w)?.type==='nomadic'?' · 畜群 100':governmentOf(w)?.type==='khanate'?' · 畜群 50':governmentOf(w)?.type==='tribal'?' · 需支持 50，消耗 10':''))}{action({type:'realm',action:'disband'},'遣散','person','解散本国已动员军队',true)}{action({type:'realm',action:'march',site:selected},'行军至此','world','沿道路前往'+siteById[selected].name)}{action({type:'realm',action:'war',site:selected},'边境争夺','army','40 影响力 · 对相邻敌国城市宣战',true)}</div><ArmyCommand onPerson={onPerson} world={w} send={send} pending={pending}/>{war&&<div className="city-war-status"><h4><RealmBadge realm={war.attacker} world={w}/>与<RealmBadge realm={war.defender} world={w}/> · {siteById[war.target].name}</h4><p>攻方战分 {war.score} · {w.day-war.started} 日</p>{action({type:'realm',action:'peace'},'议和','steadfast',s.cities[war.target].controller===war.attacker&&war.score>=50?'目标城割让给攻方，其他占领归还':'恢复战前归属，停战 360 日',true)}</div>}</section>
 <PopulationPanel world={w} site={selected} send={send} pending={pending}/>
 <TreasuryPanel world={w} pending={pending} send={send} site={selected} onPerson={onPerson}/>
 </div>;
}

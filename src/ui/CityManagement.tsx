import {DetailTabs} from './DetailTabs';
import {MilitaryAftermathPanel} from './MilitaryAftermathPanel';
import {playerCommandsArmy,civilWar} from '../core/civilWars';
import {MilitaryCampaignPanel,CivilWarPanel} from './CareerSystems';
import {WarSettlement} from './WarSettlement';
import {activeWars} from '../core/wars';
import {ArmyOrganizationPanel} from './ArmyOrganizationPanel';
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
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import './realm.css';
export function CityManagement({world:w,selected,pending,send,onPerson,localTasks,section='governance'}:{section?:string;localTasks?:ReactNode;onPerson?:(id:string)=>void;world:World;selected:string;pending:boolean;send:(c:GameCommand)=>void}){
 const [militaryTab,setMilitaryTab]=useState<'army'|'campaign'|'war'>('army');
 const [confirm,setConfirm]=useState<string|null>(null),[armyId,setArmyId]=useState<number|null>(null),s=w.realm;
 if(!s)return null;
 const r=playerRealm(w),city=s.cities[selected],army=s.armies.find(a=>playerCommandsArmy(w,a)&&a.id===armyId)??s.armies.find(a=>playerCommandsArmy(w,a)),wars=activeWars(w).filter(v=>[v.attacker,v.defender].includes(r));
 const action=(c:RealmCommand,label:string,icon:ArtName,detail:string,danger=false)=>{const reason=realmReason(w,c),key=JSON.stringify(c),current=c.action==='tax'&&c.tax===city.tax;return <div className="city-policy-item" key={key}><HoverHint label={label} content={<>{detail}{(['tax','muster','war'].includes(c.action)?politicalAction(w,r,c.action==='tax'?'tax':'military').parts:[]).filter(p=>p.value).map(p=><p key={p.id}>{p.label} · {p.value>0?'支持':'反对'} {Math.abs(p.value)}</p>)}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason||current} aria-pressed={current} className={danger?'danger':''} onClick={()=>{if(danger&&confirm!==key){setConfirm(key);return;}setConfirm(null);send(c);}}><ArtIcon name={icon} size={28}/><span><strong>{confirm===key?'确认'+label:label}</strong>{current&&<small>现行</small>}</span></button></HoverHint>{confirm===key&&<button className="city-action-cancel" onClick={()=>setConfirm(null)}>取消</button>}</div>;};
 return <div className="realm-panel city-management">
 {section==='governance'&&<section><h3><ArtIcon name="city" size={24}/>民政</h3><div className="city-policy-grid">{(['light','normal','heavy'] as Tax[]).map(tax=>action({type:'realm',action:'tax',site:selected,tax},({light:'轻税',normal:'常税',heavy:'重税'})[tax],'coins',({light:'税额 70% · 秩序 +4 / 期',normal:'税额 100% · 秩序 +1 / 期',heavy:'税额 140% · 秩序 −6 / 期'})[tax]))}{action({type:'realm',action:'relief',site:selected},'赈济','grain','本城公粮 50 · 秩序 +15（都城可用中央粮）')}</div></section>}
 {section==='service'&&<section><h3><ArtIcon name="diligent" size={24}/>地方公务</h3>{localTasks}<MobilityPanel embedded world={w} site={selected} send={send} pending={pending}/>{city.owner===r&&city.controller===r&&<OfficialActions world={w} site={selected} send={send} pending={pending}/>}</section>}
 {section==='military'&&<section><h3><ArtIcon name="army" size={24}/>军务</h3><DetailTabs label="军务内容" value={militaryTab} onChange={setMilitaryTab} items={[{id:'army',label:'军队',icon:'army'},{id:'campaign',label:'战役',icon:'world'},{id:'war',label:'战事',icon:'influence'}]}/>{militaryTab==='army'&&<><nav className="detail-tabs" aria-label="军队">{s.armies.filter(a=>playerCommandsArmy(w,a)).map((a,i)=><button key={a.id??i} aria-pressed={a===army} onClick={()=>setArmyId(a.id??null)}><ArtIcon name="army" size={22}/>第 {a.id??i+1} 军</button>)}</nav>{army&&<div className="city-army-status"><strong><RealmBadge realm={r} world={w}/>军队 · {siteById[army.location].name}{army.journey?' → '+siteById[army.journey.route.at(-1)!].name:''}</strong><div className="city-civic-metrics"><span>兵员 <b>{army.troops}</b></span><span>士气 <b>{army.morale}</b></span><span>随军粮 <b>{army.supply}</b></span></div><small>每日需粮 {armyDailyFood(w,army)} · 每期军饷 {armyMonthlyPay(w,army)}{army.siege?` · 围城 ${army.siege} 日`:''}</small>{army.convoy&&<p><ArtIcon name="grain" size={20}/>军粮 {army.convoy.grain} · {siteById[army.convoy.from].name} → {siteById[army.convoy.to].name} · 余 {army.convoy.durations.slice(army.convoy.leg).reduce((n,d)=>n+d,0)-army.convoy.elapsed} 个通行日（另计装运等候）{army.convoy.loaded!==undefined&&` · 装运 ${army.convoy.loaded}/${army.convoy.grain}`}</p>}</div>}<div className="city-policy-grid">{action({type:'realm',action:'disband',army:army?.id},'遣散','person','遣散所选军队，欠饷须先结清',true)}{action({type:'realm',action:'march',site:selected,army:army?.id},'行军至此','world','沿道路前往'+siteById[selected].name)}{action({type:'realm',action:'war',site:selected},'边境争夺','army','40 影响力 · 对相邻敌国城市宣战',true)}</div><MilitaryAftermathPanel key={(army?.id??0)+'|'+selected} world={w} army={army?.id??0} site={selected} pending={pending} send={send}/><ArmyOrganizationPanel key={selected} world={w} site={selected} pending={pending} send={send}/></>}{militaryTab==='campaign'&&<><MilitaryCampaignPanel world={w} site={selected} pending={pending} send={send} onPerson={onPerson}/>{!civilWar(w,r)&&army===s.armies.find(a=>playerCommandsArmy(w,a))&&<ArmyCommand onPerson={onPerson} world={w} send={send} pending={pending}/>}</>}{militaryTab==='war'&&<><CivilWarPanel world={w} pending={pending} send={send} onPerson={onPerson}/>{wars.map(war=><WarSettlement key={war.id??war.target} world={w} war={war} send={send} pending={pending} onPerson={onPerson}/>)}</>}</section>}
 {section==='population'&&<PopulationPanel world={w} site={selected} send={send} pending={pending}/>}
 {section==='finance'&&<TreasuryPanel world={w} pending={pending} send={send} site={selected} onPerson={onPerson}/>}
 </div>;
}

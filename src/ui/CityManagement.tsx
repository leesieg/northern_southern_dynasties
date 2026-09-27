import {ArmyOrganizationPanel} from './ArmyOrganizationPanel';
import {politicalAction} from '../core/politicalActions';
import {PopulationPanel} from './PopulationPanel';
import {TreasuryPanel} from './TreasuryPanel';
import {MobilityPanel} from './MobilityPanel';
import {OfficialActions} from './OfficialActions';
import {HoverHint} from './HoverHint';
import {ConfirmAction} from './ConfirmAction';
import {politicalName} from '../core/government';
import {useState} from 'react';
import type {ReactNode} from 'react';
import {ArtIcon,type ArtName} from './ArtIcon';
import {playerRealm,realmReason,type RealmCommand,type Tax} from '../core/realm';
import type {World,GameCommand} from '../core/types';
import './realm.css';
export function CityManagement({world:w,selected,pending,send,onPerson,localTasks,section='governance'}:{section?:string;localTasks?:ReactNode;onPerson?:(id:string)=>void;world:World;selected:string;pending:boolean;send:(c:GameCommand)=>void}){
 const [confirm,setConfirm]=useState<RealmCommand|null>(null);
 const s=w.realm;
 if(!s)return null;
 const r=playerRealm(w),city=s.cities[selected];
 const action=(c:RealmCommand,label:string,icon:ArtName,detail:string)=>{const reason=realmReason(w,c),key=JSON.stringify(c),current=c.action==='tax'&&c.tax===city.tax,upper=city.governor!==w.characterId&&['tax','relief'].includes(c.action),shown=upper?'下令'+label:label;return <div className="city-policy-item" key={key}><HoverHint label={shown} content={<>{detail}{(['tax','muster','war'].includes(c.action)?politicalAction(w,r,c.action==='tax'?'tax':'military').parts:[]).filter(p=>p.value).map(p=><p key={p.id}>{p.label} · {p.value>0?'支持':'反对'} {Math.abs(p.value)}</p>)}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason||current} aria-pressed={current} onClick={()=>['tax','relief'].includes(c.action)?setConfirm(c):send(c)}><ArtIcon name={icon} size={28}/><span><strong>{shown}</strong>{current&&<small>现行</small>}</span></button></HoverHint></div>;};
 return <div className="realm-panel city-management">
 {section==='governance'&&<section><h3><ArtIcon name="city" size={24}/>民政</h3><div className="city-policy-grid">{(['light','normal','heavy'] as Tax[]).map(tax=>action({type:'realm',action:'tax',site:selected,tax},({light:'轻税',normal:'常税',heavy:'重税'})[tax],'coins',({light:'税额 70% · 秩序 +4 / 期',normal:'税额 100% · 秩序 +1 / 期',heavy:'税额 140% · 秩序 −6 / 期'})[tax]))}{action({type:'realm',action:'relief',site:selected},'赈济','grain','本城公粮 50 · 秩序 +15（都城可用中央粮）')}</div>{confirm&&['tax','relief'].includes(confirm.action)&&<ConfirmAction title={confirm.action==='tax'?'确认调整税制？':'确认赈济？'} detail={`下令人：${politicalName(w.characterId!)}；由本城官署执行，不单列人物功绩。${confirm.action==='tax'?'税制立即调整，下期税收与秩序按新税制结算；不划转钱粮。':'立即消耗本城公粮 50（都城先用本城仓，不足部分取中央仓），本城秩序 +15。'}`} confirmLabel="确认下令" pending={pending||!!realmReason(w,confirm)} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(realmReason(w,confirm))return;send(confirm);setConfirm(null);}}/>}</section>}
 {section==='service'&&<section><h3><ArtIcon name="diligent" size={24}/>地方公务</h3>{localTasks}<MobilityPanel embedded world={w} site={selected} send={send} pending={pending}/>{city.owner===r&&city.controller===r&&<OfficialActions world={w} site={selected} send={send} pending={pending}/>}</section>}
 {section==='military'&&<ArmyOrganizationPanel view="raise" key={selected} world={w} site={selected} pending={pending} send={send}/>}
 {section==='population'&&<PopulationPanel world={w} site={selected} send={send} pending={pending}/>}
 {section==='finance'&&<TreasuryPanel world={w} pending={pending} send={send} site={selected} onPerson={onPerson}/>}
 </div>;
}

import {administrativeRealm} from '../core/polityRuntime';
import {CityPolicyDialog,taxPresentation} from './CityPolicyDialog';
import {EstateCountySummary} from './EstateCountySummary';
import {UnrestPanel} from './UnrestPanel';
import {ArmyOrganizationPanel} from './ArmyOrganizationPanel';
import {politicalAction} from '../core/politicalActions';
import {PopulationPanel} from './PopulationPanel';
import {TreasuryPanel} from './TreasuryPanel';
import {MobilityPanel} from './MobilityPanel';
import {OfficialActions} from './OfficialActions';
import {HoverHint} from './HoverHint';
import {useState} from 'react';
import type {ReactNode} from 'react';
import {ArtIcon,type ArtName} from './ArtIcon';
import {fortificationLevel,playerRealm,realmReason,type RealmCommand,type Tax} from '../core/realm';
import type {World,GameCommand} from '../core/types';
import './realm.css';
export function CityManagement({world:w,selected,pending,send,onPerson,localTasks,onTransport,section='governance'}:{onTransport?:()=>void;section?:string;localTasks?:ReactNode;onPerson?:(id:string)=>void;world:World;selected:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>}){
 const [confirm,setConfirm]=useState<RealmCommand|null>(null);
 const s=w.realm;
 if(!s)return null;
 const r=playerRealm(w),city=s.cities[selected];
 const action=(c:RealmCommand,label:string,icon:ArtName,detail:string)=>{const reason=realmReason(w,c),key=JSON.stringify(c),current=c.action==='tax'&&c.tax===city.tax,upper=city.governor!==w.characterId&&['tax','relief'].includes(c.action),shown=upper?'下令'+label:label;return <div className="city-policy-item" data-policy={c.action==='tax'?c.tax:c.action} key={key}><HoverHint label={shown} content={<>{detail}{(['tax','muster','war'].includes(c.action)?politicalAction(w,r,c.action==='tax'?'tax':'military').parts:[]).filter(p=>p.value).map(p=><p key={p.id}>{p.label} · {p.value>0?'支持':'反对'} {Math.abs(p.value)}</p>)}{reason&&<p>{reason}</p>}</>}><button disabled={pending||!!reason||current} aria-pressed={current} onClick={()=>['tax','relief','fortify'].includes(c.action)?setConfirm(c):send(c)}><ArtIcon name={icon} size={28}/><span><strong>{shown}</strong>{current&&<small>现行</small>}<span className="city-policy-detail">{detail}</span></span></button></HoverHint></div>;};
 return <div className="realm-panel city-management">{section==='governance'&&<EstateCountySummary world={w} sites={[selected]}/>}
 {section==='governance'&&<UnrestPanel key={selected} world={w} site={selected} pending={pending} send={send} onPerson={onPerson} onTransport={onTransport}/>}
 {section==='governance'&&<section><h3><ArtIcon name="city" size={24}/>民政</h3><div className="city-policy-grid">{(['light','normal','heavy'] as Tax[]).map(tax=>action({type:'realm',action:'tax',site:selected,tax},taxPresentation[tax].name,'coins',`税额 ${taxPresentation[tax].rate}% · 秩序 ${taxPresentation[tax].order>0?'+':''}${taxPresentation[tax].order} / 期`))}{action({type:'realm',action:'relief',site:selected},'赈济','grain','本城公粮 50 · 秩序 +15（都城可用中央粮）')}</div></section>}
 {section==='service'&&<section className="city-service-page"><h3><ArtIcon name="diligent" size={24}/>地方公务</h3><div className="city-service-actions"><MobilityPanel embedded world={w} site={selected} send={send} pending={pending}/>{administrativeRealm(w,selected)===r&&city.controller===r&&<OfficialActions world={w} site={selected} send={send} pending={pending}/>}</div>{localTasks}{!w.service?.tasks.some(t=>t.site===selected&&t.phase!=='closed')&&<p className="city-empty-ledger">本城暂无办理中的差事。</p>}</section>}
 {section==='military'&&<><section><h3><ArtIcon name="city" size={24}/>城防 · {fortificationLevel(w,selected)} / 3 级</h3><p className="military-note">城防延长围城时间，首都初建自带一级城防。修筑使用本城公款；每级每期维护 2 钱，当前首都的基础一级免维护。攻陷会损坏一级，未完工工程停建。</p>{city.fortification?.due&&<p>修筑中 · 预计 {city.fortification.due-w.day} 日后竣工</p>}<div className="city-policy-grid">{action({type:'realm',action:'fortify',site:selected},'修筑城防','city',`本城公款 ${(fortificationLevel(w,selected)+1)*80} 钱，工期 ${(fortificationLevel(w,selected)+1)*30} 日；城防升至 ${fortificationLevel(w,selected)+1} 级。`)}</div></section><ArmyOrganizationPanel view="raise" key={selected} world={w} site={selected} pending={pending} send={send}/></>}
 {section==='population'&&<PopulationPanel world={w} site={selected} send={send} pending={pending}/>}
 {section==='finance'&&<TreasuryPanel world={w} pending={pending} send={send} site={selected} onPerson={onPerson}/>}
 {confirm&&<CityPolicyDialog world={w} command={confirm} pending={pending} send={send} onClose={()=>setConfirm(null)}/>}
 </div>;
}

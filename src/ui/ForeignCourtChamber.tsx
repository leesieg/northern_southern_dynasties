import {useState} from 'react';
import {ArtIcon} from './ArtIcon';
import {DetailTabs} from './DetailTabs';
import {PositionSeat} from './PersonSelection';
import {RealmBadge} from './RealmBadge';
import {courtEnabled,courtOf,courtSalary,ministryCompetent} from '../core/court';
import {governmentOf,politicalName,regimeName} from '../core/government';
import {officeHierarchy} from '../core/offices';
import type {RealmId} from '../core/realm';
import type {World} from '../core/types';
import {ministryIds,ministries,phases,policies} from '../data/court';
import {territoryNodes} from '../data/territorialHierarchy';
import './foreignCourtChamber.css';

function belongsToProvince(territory:string,province:string){
 let node:(typeof territoryNodes)[string]|undefined=territoryNodes[territory];
 while(node){if(node.id===province)return true;node=node.parent?territoryNodes[node.parent]:undefined;}
 return false;
}

export function ForeignCourtChamber({world:w,realm,onPerson}:{world:World;realm:RealmId;onPerson:(id:string)=>void}){
 const [tab,setTab]=useState<'central'|'local'>('central'),[region,setRegion]=useState('');
 const government=governmentOf(w,realm),court=courtOf(w,realm),nodes=officeHierarchy(w).filter(node=>node.realm===realm);
 const central=nodes.filter(node=>node.id.includes(':ministry:'));
 const local=[...new Map(nodes.filter(node=>!!node.territory&&node.kind!=='city').map(node=>[node.territory!,node])).values()];
 const provinces=local.filter(node=>territoryNodes[node.territory!]?.level==='province');
 const selectedRegion=provinces.some(node=>node.territory===region)?region:provinces[0]?.territory??'';
 const localHere=selectedRegion?local.filter(node=>belongsToProvince(node.territory!,selectedRegion)):local;
 return <div className="staff-chamber foreign-court">
  <div className="staff-chamber-owner"><RealmBadge realm={realm} world={w}/><span><strong>{regimeName(w,realm)}</strong><small>他国朝廷 · 只供查阅</small></span><div className="staff-chamber-summary"><span><ArtIcon name="person" size={25}/><strong>{central.filter(node=>!!node.holder).length} / {ministryIds.length}</strong><small>中枢任官</small></span><span><ArtIcon name="city" size={25}/><strong>{local.filter(node=>!!node.holder).length} / {local.length}</strong><small>地方主官</small></span><span><ArtIcon name="coins" size={25}/><strong>{w.realm!.treasuries[realm].coins}</strong><small>中央公款</small></span><span><ArtIcon name="grain" size={25}/><strong>{w.realm!.treasuries[realm].grain}</strong><small>中央公粮</small></span></div></div>
  <DetailTabs label="他国朝廷" value={tab} onChange={setTab} items={[{id:'central',label:'中枢',icon:'influence'},{id:'local',label:'地方',icon:'city'}]}/>
  {tab==='central'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>中枢官署</h3><small>只供查阅 · 中央月俸 {courtSalary(w,realm)} 钱</small></div><div className="foreign-court-context"><span>在位君主　{government?.ruler?<button onClick={()=>onPerson(government.ruler)}>{politicalName(government.ruler)} ›</button>:'暂无'}</span><span>朝局国策　{court?`${phases[court.phase].name} · ${policies[court.policy].name}`:'暂无朝局记录'}</span></div><div className="staff-central-grid">{ministryIds.map(ministry=>{const node=central.find(item=>item.id.endsWith(':'+ministry)),holder=node?.holder??null,merit=holder?government?.merit[holder]??0:null;return <div className="staff-central-office" key={ministry}><PositionSeat compact world={w} holder={holder} title={ministries[ministry].name} status={holder?`功绩 ${merit} · ${!courtEnabled(w,realm)?'履职暂停':ministryCompetent(w,realm,ministry)?'称职':'履职不足'}`:'待任命'} onPerson={onPerson}/><p>{ministries[ministry].duty} · {ministries[ministry].effect}</p></div>;})}</div></section>}
  {tab==='local'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>地方任职</h3><small>按州查阅 · 他国官职不可在此任免</small></div>{provinces.length>0&&<nav className="staff-region-list" aria-label="选择州域">{provinces.map(node=><button key={node.id} aria-pressed={selectedRegion===node.territory} onClick={()=>setRegion(node.territory!)}>{territoryNodes[node.territory!].name}<small>{local.filter(item=>belongsToProvince(item.territory!,node.territory!)).filter(item=>!!item.holder).length} 任</small></button>)}</nav>}{(['province','prefecture','county'] as const).map(level=>{const group=localHere.filter(node=>territoryNodes[node.territory!]?.level===level);return group.length?<div className="staff-local-group" key={level}><h4>{level==='province'?'州刺史':level==='prefecture'?'郡太守':'县令／县长'} <small>{group.filter(node=>!!node.holder).length} / {group.length} 在任</small></h4><div className="staff-local-grid">{group.map(node=><div className="staff-local-office" key={node.id}><header><strong>{territoryNodes[node.territory!].name}</strong></header><PositionSeat world={w} holder={node.holder} title={node.name} status={!node.active?'治所失守':undefined} onPerson={onPerson}/></div>)}</div></div>:null;})}</section>}
 </div>;
}

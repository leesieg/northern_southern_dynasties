import {ArtIcon} from './ArtIcon';
import {OfficeHierarchy} from './OfficeHierarchy';
import {RealmBadge} from './RealmBadge';
import {courtOf,courtSalary} from '../core/court';
import {governmentOf,politicalName,regimeName} from '../core/government';
import {officeHierarchy} from '../core/offices';
import type {RealmId} from '../core/realm';
import type {World} from '../core/types';
import {phases,policies} from '../data/court';
import './foreignCourtChamber.css';

export function ForeignCourtChamber({world:w,realm,onPerson}:{world:World;realm:RealmId;onPerson:(id:string)=>void}){
 const government=governmentOf(w,realm),court=courtOf(w,realm),nodes=officeHierarchy(w).filter(node=>node.realm===realm);
 const central=nodes.filter(node=>node.id.includes(':ministry:')),local=nodes.filter(node=>!!node.territory&&node.kind!=='city');
 return <div className="staff-chamber foreign-court">
  <div className="staff-chamber-owner"><RealmBadge realm={realm} world={w}/><span><strong>{regimeName(w,realm)}</strong><small>他国朝廷 · 只供查阅</small></span><div className="staff-chamber-summary"><span><ArtIcon name="person" size={25}/><strong>{central.filter(node=>!!node.holder).length} / {central.length}</strong><small>中枢任官</small></span><span><ArtIcon name="city" size={25}/><strong>{local.filter(node=>!!node.holder).length} / {local.length}</strong><small>地方主官</small></span></div></div>
  <div className="foreign-court-facts"><div><small>在位君主</small>{government?.ruler?<button onClick={()=>onPerson(government.ruler)}>{politicalName(government.ruler)} ›</button>:<strong>暂无</strong>}</div><div><small>朝局 / 国策</small><strong>{court?`${phases[court.phase].name} · ${policies[court.policy].name}`:'暂无朝局记录'}</strong></div><div><small>中央公款 / 公粮</small><strong>{w.realm!.treasuries[realm].coins.toLocaleString('zh-CN')} / {w.realm!.treasuries[realm].grain.toLocaleString('zh-CN')}</strong></div><div><small>中央月俸</small><strong>{courtSalary(w,realm)} 钱</strong></div></div>
  <section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>官署与统属</h3><small>点击任职者查看人物；他国官职不可在此任免</small></div><OfficeHierarchy world={w} realm={realm} onPerson={onPerson} expanded/></section>
 </div>;
}

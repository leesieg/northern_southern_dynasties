import {useState,type ReactNode} from 'react';
import type {Army} from '../core/realm';
import type {World} from '../core/types';
import {troopKinds,type TroopKind,type Regiment} from '../core/armyOrganization';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';

/** Original painted sheet: each equal 2:3 cell is clipped without stretching. */
const troopCells:Record<TroopKind,[number,number]>={shield:[0,0],spear:[1,0],archer:[2,0],lightHorse:[0,1],heavyHorse:[1,1],siege:[2,1]};
export function TroopIllustration({kind}:{kind:TroopKind}){
 const [column,row]=troopCells[kind];
 return <svg className={'troop-illustration troop-illustration--'+kind} viewBox={`${column*418} ${row*627} 418 627`} aria-hidden="true"><image href={import.meta.env.BASE_URL+'art/military/regiment-portraits.png'} width="1254" height="1254"/></svg>;
}
export function RegimentCards({army,world,actions}:{army:Army;world:World;actions?:(unit:Regiment)=>ReactNode}){
 const [selected,setSelected]=useState<string|null>(null),unit=army.regiments?.find(u=>u.id===selected);
 if(!army.regiments?.length)return null;
 return <><div className="regiment-cards" aria-label={'第 '+army.id+' 军兵团'}>{army.regiments.map(u=><button type="button" key={u.id} className="regiment-card" title={troopKinds[u.kind].name+" · "+u.troops+" 人 · 查看兵团"} data-kind={u.kind} aria-pressed={selected===u.id} aria-label={`${troopKinds[u.kind].name}，${u.troops} 人，${(u.readyDay??army.trainingUntil??0)>world.day?'集训中':'已整备'}，查看兵团`} onClick={()=>setSelected(u.id)}><span className="regiment-card-name">{troopKinds[u.kind].name}</span><TroopIllustration kind={u.kind}/><span className="regiment-card-count">{u.troops}<small>{(u.readyDay??army.trainingUntil??0)>world.day?'集训':'整备'}</small></span></button>)}</div>{unit&&<ActionDialog title={'第 '+army.id+' 军 · '+troopKinds[unit.kind].name} onClose={()=>setSelected(null)} actions={<>{actions?.(unit)}<button className="primary" onClick={()=>setSelected(null)}>返回军阵</button></>}><div className="regiment-preview"><TroopIllustration kind={unit.kind}/><dl><dt>现役兵员</dt><dd>{unit.troops} 人 · {unit.service==='standing'?'常备':'征发'}</dd><dt>兵员原籍</dt><dd>{siteById[unit.origin]?.name??unit.origin}</dd><dt>经验</dt><dd>{unit.experience}</dd><dt>训练</dt><dd>{(unit.readyDay??army.trainingUntil??0)>world.day?'尚需 '+((unit.readyDay??army.trainingUntil??0)-world.day)+' 日（不含停滞）':'已整备'}</dd><dt>兵种攻防系数</dt><dd>攻击 {troopKinds[unit.kind].attack}% · 防护 {troopKinds[unit.kind].defence}%</dd></dl></div></ActionDialog>}</>;
}

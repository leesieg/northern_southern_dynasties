import {useState} from 'react';
import type {Army} from '../core/realm';
import type {World} from '../core/types';
import {troopKinds,type TroopKind} from '../core/armyOrganization';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';

/** Original ink silhouettes, one card per actual regiment; no invented unit slots. */
export function TroopIllustration({kind}:{kind:TroopKind}){
 const horse=kind==='lightHorse'||kind==='heavyHorse';
 return <svg className={'troop-illustration troop-illustration--'+kind} viewBox="0 0 64 86" aria-hidden="true"><path d="M6 78Q30 70 58 78" fill="none" stroke="#8b816b" opacity=".4"/>{kind==='siege'?<g stroke="#453e31" strokeWidth="3" fill="#9c855b"><path d="M12 65h40L38 30H27z"/><path d="m15 18 38 41M33 31 25 69M42 26l8-12 7 5-7 11"/><circle cx="19" cy="71" r="7"/><circle cx="47" cy="71" r="7"/></g>:<><g fill={horse?'#675444':'#475650'} stroke="#302e28" strokeWidth="1.2">{horse&&<path d="M10 49q14-11 31-1l7-19 10 6-5 17-8 6 2 20h-5l-5-19H22l-5 19h-5l3-24-8 11-3-2z"/>}<path d={horse?'M25 26h14l5 28-12 5-10-9z':'M22 28h20l5 30-9 3 6 18h-9l-4-17-4 17h-8l5-22-7-6z'}/><path d="m24 30-9 17 5 4 9-16m10-5 13 15-4 5-13-15"/></g><ellipse cx="32" cy="21" rx="7" ry="9" fill="#bba085" stroke="#4d4436"/><path d="M24 20q-1-14 8-15 10 3 9 16l-9-4z" fill="#63655e" stroke="#34372f"/><path d="M32 6V2m-6 33h12m-13 5h14m-14 5h15m-14 5h14m-11-19v23m5-23v23" stroke="#aba18b" strokeWidth="1"/>{kind==='shield'&&<path d="m13 40 14-3 6 7-3 21-11 7-8-10z" fill="#8b5142" stroke="#c7b17d" strokeWidth="2"/>}{(kind==='spear'||horse)&&<path d="M50 76V13m-3 2 3-13 3 13" stroke="#594c33" strokeWidth="2" fill="#bdbeb2"/>}{kind==='archer'&&<><path d="M48 24q20 22 0 43l5-22z" fill="none" stroke="#806442" strokeWidth="2"/><path d="m36 44 25 1" stroke="#453d2c"/></>}</>}</svg>;
}
export function RegimentCards({army,world}:{army:Army;world:World}){
 const [selected,setSelected]=useState<string|null>(null),unit=army.regiments?.find(u=>u.id===selected);
 if(!army.regiments?.length)return null;
 return <><div className="regiment-cards" aria-label={'第 '+army.id+' 军兵团'}>{army.regiments.map(u=><button type="button" key={u.id} className="regiment-card" data-kind={u.kind} aria-pressed={selected===u.id} aria-label={`${troopKinds[u.kind].name}，${u.troops} 人，${(u.readyDay??army.trainingUntil??0)>world.day?'集训中':'已整备'}，查看兵团`} onClick={()=>setSelected(u.id)}><span className="regiment-card-name">{troopKinds[u.kind].name}</span><TroopIllustration kind={u.kind}/><span className="regiment-card-count">{u.troops}<small>{(u.readyDay??army.trainingUntil??0)>world.day?'集训':'整备'}</small></span></button>)}</div>{unit&&<ActionDialog title={'第 '+army.id+' 军 · '+troopKinds[unit.kind].name} onClose={()=>setSelected(null)} actions={<button className="primary" onClick={()=>setSelected(null)}>返回军阵</button>}><div className="regiment-preview"><TroopIllustration kind={unit.kind}/><dl><dt>现役兵员</dt><dd>{unit.troops} 人 · {unit.service==='standing'?'常备':'征发'}</dd><dt>兵员原籍</dt><dd>{siteById[unit.origin]?.name??unit.origin}</dd><dt>经验</dt><dd>{unit.experience}</dd><dt>训练</dt><dd>{(unit.readyDay??army.trainingUntil??0)>world.day?'尚需 '+((unit.readyDay??army.trainingUntil??0)-world.day)+' 日（不含停滞）':'已整备'}</dd><dt>兵种攻防系数</dt><dd>攻击 {troopKinds[unit.kind].attack}% · 防护 {troopKinds[unit.kind].defence}%</dd></dl></div></ActionDialog>}</>;
}

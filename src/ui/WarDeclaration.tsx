import {WarSettlement} from './WarSettlement';
import {activeWars,warRealmSide} from '../core/wars';
import {useContext,useEffect,useRef,useState} from 'react';
import {playerRealm,realmReason,armyDailyFood,armyMonthlyPay,fortificationLevel,type RealmId} from '../core/realm';
import type {War} from '../core/wars';
import type {World,GameCommand} from '../core/types';
import {siteById} from '../data/scenario';
import {canEnter} from '../core/diplomacy';
import {planRoute} from '../core/world';
import {regimeName} from '../core/government';
import {RealmBadge,RealmNavigation} from './RealmBadge';
import {DrawerHeader} from './DrawerHeader';
import {DetailTabs} from './DetailTabs';
import {ConfirmAction} from './ConfirmAction';
import {ArtIcon,Resource} from './ArtIcon';
import './warDeclaration.css';
const goals={territory:{label:'割地',effect:'要求割让所选目标地'},reparations:{label:'赔款',effect:'要求赔款 300 钱，按期偿付'},tributary:{label:'宗属',effect:'迫使对方称臣'},annexation:{label:'吞并',effect:'胜利议和后接管对方政权'}};
type DeclarationGoal=Exclude<NonNullable<War['goal']>,'defection'>;
export function WarDeclaration({world:w,target,initialSite,pending,send,onClose,onPerson}:{world:World;target:RealmId;initialSite?:string;pending:boolean;send:(c:GameCommand)=>void;onClose:()=>void;onPerson?:(id:string)=>void}){
 const navigation=useContext(RealmNavigation);
 const openRealm=navigation?((id:RealmId)=>{onClose();navigation.open(id);}):undefined;
 const ref=useRef<HTMLDialogElement>(null),[goal,setGoal]=useState<DeclarationGoal>('territory'),[chosen,setChosen]=useState(initialSite??''),[confirm,setConfirm]=useState<string|null>(null);
 useEffect(()=>{const d=ref.current!,prev=document.activeElement as HTMLElement|null;d.showModal();return()=>{d.close();prev?.focus();};},[]);
 const r=playerRealm(w),sites=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===target),site=sites.includes(chosen)?chosen:sites.find(id=>!realmReason(w,{type:'realm',action:'war',site:id,goal}))??sites[0]??'',command={type:'realm',action:'war',site,goal} as const,reason=realmReason(w,command),armies=w.realm!.armies.filter(a=>a.realm===r);
 const targetCity=w.realm!.cities[site],routes=site?armies.map(a=>planRoute(a.journey?.route.at(-1)??a.location,site,id=>{const control=w.realm!.cities[id].controller;return id===site||control===target&&fortificationLevel(w,id)<1||canEnter(w,r,control,undefined,true);})).filter(v=>v!==null):[],closest=routes.length?Math.min(...routes.map(v=>v.days)):null;
 const wars=activeWars(w).filter(v=>target===r?!!warRealmSide(v,r):!!warRealmSide(v,r)&&!!warRealmSide(v,target)&&warRealmSide(v,r)!==warRealmSide(v,target)),wasWar=useRef(wars.length>0);
 if(wars.length||target===r||wasWar.current)return <dialog ref={ref} className="war-declaration" aria-label="战争与议和" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}><DrawerHeader title="战事" onClose={onClose}/><div className="war-declaration-body">{wars.map(war=><WarSettlement key={war.id} world={w} war={war} pending={pending} send={send} onPerson={onPerson?id=>{onClose();onPerson(id);}:undefined}/>)}{!wars.length&&<p className="military-note">当前没有进行中的战争</p>}</div></dialog>;
 return <dialog ref={ref} className="war-declaration" aria-label="宣战议案" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}>
 <DrawerHeader title="宣战" onClose={onClose}/><div className="war-declaration-body">
 <div className="war-parties"><article><RealmBadge world={w} realm={r} onOpen={openRealm}/><span><small>进攻方</small><Resource name="person" value={armies.reduce((n,a)=>n+a.troops,0)} label="己方现役" unit="人"/></span></article><ArtIcon name="army" size={36}/><article><RealmBadge world={w} realm={target} onOpen={openRealm}/><span><small>防御方</small><b>兵力待侦察</b></span></article></div>
 <DetailTabs label="战争诉求" value={goal} onChange={value=>{setGoal(value);setConfirm(null);}} items={[{id:'territory',label:'割地',icon:'city'},{id:'reparations',label:'赔款',icon:'coins'},{id:'tributary',label:'宗属',icon:'influence'},{id:'annexation',label:'吞并',icon:'army'}]}/>
 <div className="war-objective"><ArtIcon name="city" size={36}/><div><label htmlFor="war-target">军事目标</label><select id="war-target" value={site} onChange={e=>{setChosen(e.target.value);setConfirm(null);}}>{sites.map(id=><option key={id} value={id}>{siteById[id].name}</option>)}</select></div></div>{targetCity&&<p className="war-assessment">{siteById[site].name}法理属{regimeName(w,targetCity.owner)}，现由{regimeName(w,targetCity.controller)}控制；{targetCity.owner!==targetCity.controller?'须先核清当前占领战争，再提出割让。':`须对${regimeName(w,targetCity.owner)}宣战、实际占领，并在议和时取得割让。`}{closest!==null?`现役军队从当前位置最快约 ${closest} 日可达，未含接敌、围城与补给。`:'现役军队暂无可通行路线。'}</p>}<p className="war-demand">{goals[goal].effect}</p>
 <div className="military-metrics"><Resource name="influence" value={goal==='annexation'?120:40} label="宣战消耗影响力" caption/><Resource name="grain" value={armies.reduce((n,a)=>n+armyDailyFood(w,a),0)} label="现役每日最多耗粮" unit="/日"/><Resource name="coins" value={armies.reduce((n,a)=>n+armyMonthlyPay(w,a),0)} label="现役军饷" unit="/月"/></div>
 {!armies.length?<p className="military-warning"><ArtIcon name="army" size={22}/>尚无现役军队</p>:armies.some(a=>a.supply<armyDailyFood(w,a)*10)&&<p className="military-warning"><ArtIcon name="grain" size={22}/>部分军队随军粮不足十日</p>}
 </div><footer><small>宣战后立即开战 · 盟国参战与钱粮军援需另请</small>{reason&&<p className="military-warning" role="status">{reason}</p>}<button className="primary" disabled={pending||!!reason} onClick={()=>setConfirm(JSON.stringify(command))}><ArtIcon name="army" size={24}/>提出宣战</button></footer>
 {confirm===JSON.stringify(command)&&<ConfirmAction title="确认宣战" detail={<><p>目标：{siteById[site]?.name} · {goals[goal].label}。{goals[goal].effect}。</p><p>确认后立即开战，消耗 {goal==='annexation'?120:40} 影响力；议和需另行提出。</p>{reason&&<p role="status">当前不可执行：{reason}</p>}</>} confirmLabel="确认开战" danger pending={pending||!!reason} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(pending||reason)return;setConfirm(null);send(command);onClose();}}/>}
 </dialog>;
}

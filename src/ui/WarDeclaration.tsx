import {annexationPeaceCost} from '../core/wars';
import {warTerritoryOptions,warDeclarationCost,type RegionalWarLevel} from '../core/warTerritories';
import {WarDetails} from './WarDetails';
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
 const ref=useRef<HTMLDialogElement>(null),[goal,setGoal]=useState<DeclarationGoal>('territory'),[chosen,setChosen]=useState(initialSite??''),[scope,setScope]=useState<'city'|RegionalWarLevel>('city'),[confirm,setConfirm]=useState<string|null>(null);
 useEffect(()=>{const d=ref.current!,prev=document.activeElement as HTMLElement|null;d.showModal();return()=>{d.close();prev?.focus();};},[]);
 const r=playerRealm(w),armies=w.realm!.armies.filter(a=>a.realm===r),level=goal==='territory'?scope:'city';
 const options:{id:string;name:string;sites:string[];territory?:string}[]=level==='city'?Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===target).map(id=>({id,name:siteById[id].name,sites:[id]})):warTerritoryOptions(w,target,level).map(n=>({id:n.id,name:n.name+' · '+n.sites.length+' 县域',sites:n.sites,territory:n.id}));
 const option=options.find(o=>o.id===chosen)??options.find(o=>!realmReason(w,{type:'realm',action:'war',site:o.sites[0],goal,territory:o.territory}))??options[0],site=option?.sites.includes(initialSite??'')?initialSite!:option?.sites[0]??'',territory=option?.territory,command={type:'realm',action:'war',site,goal,...(territory?{territory}:{})} as const,reason=realmReason(w,command),cost=warDeclarationCost(goal,territory),confirmKey=JSON.stringify({command,sites:goal==='annexation'?Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===target):option?.sites??[]});
 const annexedSites=Object.keys(w.realm!.cities).filter(id=>w.realm!.cities[id].owner===target);
 const targetCity=w.realm!.cities[site],routes=site?armies.map(a=>planRoute(a.journey?.route.at(-1)??a.location,site,id=>{const control=w.realm!.cities[id].controller;return id===site||control===target&&fortificationLevel(w,id)<1||canEnter(w,r,control,undefined,true);})).filter(v=>v!==null):[],closest=routes.length?Math.min(...routes.map(v=>v.days)):null;
 const wars=activeWars(w).filter(v=>target===r?!!warRealmSide(v,r):!!warRealmSide(v,r)&&!!warRealmSide(v,target)&&warRealmSide(v,r)!==warRealmSide(v,target)),wasWar=useRef(wars.length>0);
 if(wars.length||target===r||wasWar.current)return <dialog ref={ref} className="war-declaration paper-dialog" aria-label="战争与议和" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}><DrawerHeader title="战事" onClose={onClose}/><div className="war-declaration-body">{wars.map(war=><WarDetails key={war.id} world={w} war={war} onRealm={openRealm} pending={pending} send={send} onPerson={onPerson?id=>{onClose();onPerson(id);}:undefined}/>)}{!wars.length&&<p className="military-note">当前没有进行中的战争</p>}</div></dialog>;
 return <dialog ref={ref} className="war-declaration paper-dialog" aria-label="宣战议案" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>e.stopPropagation()}>
 <DrawerHeader title="宣战" onClose={onClose}/><div className="war-declaration-body">
 <div className="war-parties"><article><RealmBadge world={w} realm={r} onOpen={openRealm}/><span><small>进攻方</small><Resource name="person" value={armies.reduce((n,a)=>n+a.troops,0)} label="己方现役" unit="人"/></span></article><ArtIcon name="army" size={36}/><article><RealmBadge world={w} realm={target} onOpen={openRealm}/><span><small>防御方</small><b>兵力待侦察</b></span></article></div>
 <DetailTabs label="战争诉求" value={goal} onChange={value=>{setGoal(value);setConfirm(null);}} items={[{id:'territory',label:'割地',icon:'city'},{id:'reparations',label:'赔款',icon:'coins'},{id:'tributary',label:'宗属',icon:'influence'},{id:'annexation',label:'吞并',icon:'army'}]}/>
 {goal==='territory'&&<label htmlFor="war-scope">目标范围 <select id="war-scope" value={scope} onChange={e=>{setScope(e.target.value as typeof scope);setChosen('');setConfirm(null);}}><option value="city">城邑</option><option value="prefecture">郡／尹</option><option value="province">州</option></select></label>}
 <div className="war-objective"><ArtIcon name="city" size={36}/><div><label htmlFor="war-target">{goal==='annexation'?'军事定位城市':'军事目标'}</label><select id="war-target" value={option?.id??''} onChange={e=>{setChosen(e.target.value);setConfirm(null);}}>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div></div>
 {targetCity&&<p className="war-assessment">目标：{goal==='annexation'?regimeName(w,target)+'全部领土':'法理属'+regimeName(w,target)}；{territory?'全部所列县域须实际占领，议和后才整块割让。':goal==='territory'?'须实际占领，并在议和时取得割让。':goal==='annexation'?'须控制全部县域并瓦解残军抵抗，或满足执政被俘后的迫降条件；最终须议和接受。':'此城用于军事目标定位，和约按所选诉求结算。'}{closest!==null?`现役军队至定位城市 ${siteById[site].name} 最快约 ${closest} 日，未含其余目标、接敌、围城与补给。`:'现役军队暂无可通行路线。'}</p>}
 {territory&&<p className="war-assessment">本局目标县域：{option!.sites.map(id=>siteById[id].name).join('、')}。仅含该国在此州郡的已建模县域；整块议和的县域价值代价封顶 60，另加{level==='province'?30:15}条款代价。</p>}{goal==='annexation'&&<p className="war-assessment">接管 {annexedSites.length} 处已建模县域：{annexedSites.map(id=>siteById[id].name).join('、')}。议和条款代价 {annexationPeaceCost}；接管中央及地方公库、粮仓与债务，原政权终止并进入地方接管期。</p>}<p className="war-demand">{goals[goal].effect}</p>
 <div className="military-metrics"><Resource name="influence" value={cost} label="宣战消耗影响力" caption/><Resource name="grain" value={armies.reduce((n,a)=>n+armyDailyFood(w,a),0)} label="现役每日最多耗粮" unit="/日"/><Resource name="coins" value={armies.reduce((n,a)=>n+armyMonthlyPay(w,a),0)} label="现役军饷" unit="/月"/></div>
 {!armies.length?<p className="military-warning"><ArtIcon name="army" size={22}/>尚无现役军队</p>:armies.some(a=>a.supply<armyDailyFood(w,a)*10)&&<p className="military-warning"><ArtIcon name="grain" size={22}/>部分军队随军粮不足十日</p>}
 </div><footer><small>宣战后立即开战 · 盟国参战与钱粮军援需另请</small>{reason&&<p className="military-warning" role="status">{reason}</p>}<button className="primary" disabled={pending||!!reason} onClick={()=>setConfirm(confirmKey)}><ArtIcon name="army" size={24}/>提出宣战</button></footer>
 {confirm===confirmKey&&<ConfirmAction title="确认宣战" detail={<><p>目标：{goal==='annexation'?regimeName(w,target)+'政权':option?.name} · {goals[goal].label}。{goals[goal].effect}。</p>{territory&&<p>割让范围：{option!.sites.map(id=>siteById[id].name).join('、')}；第三国辖地不包含在内，全部占领后仍须议和接受。</p>}{goal==='annexation'&&<p>接管范围：{annexedSites.map(id=>siteById[id].name).join('、')}。议和代价 {annexationPeaceCost}；余额与债务随政权接管，人物私财保留。</p>}<p>确认后立即开战，消耗 {cost} 个人影响力；议和需另行提出。</p>{reason&&<p role="status">当前不可执行：{reason}</p>}</>} confirmLabel="确认开战" danger pending={pending||!!reason} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(pending||reason)return;setConfirm(null);send(command);onClose();}}/>}
 </dialog>;
}

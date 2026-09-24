import {OngoingFlags} from './OngoingFlags';
import type {OngoingItem} from '../core/ongoing';
import {assignmentTemplates,assignmentPhases} from '../data/assignments';
import {PauseDialog} from './PauseDialog';
import type {PauseEvent} from '../core/pauseEvents';
import { residentsAt } from '../core/placePeople';
import { PlacePeople } from './PlacePeople';
import type { Polity } from '../core/types';
import { RealmFlagButton } from './RealmFlag';
import { DiplomacyPanel } from './DiplomacyPanel';
import { personalRoute,travelDiplomacyReason } from '../core/diplomacy';
import { playerRealm,type RealmId } from '../core/realm';
import './gameBrand.css';
const accountSaves=import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/');
import { CourtPanel,type CourtTab } from './CourtPanel';
import {courtOf} from '../core/court';
import {phases} from '../data/court';
import { regimeName } from '../core/government';
import { LifestylePanel } from './LifestylePanel';
import { lifestyleProgress } from '../core/lifestyle';
import { MapPersonPanel,type PersonTab } from './MapPersonPanel';
import {DetailTabs} from './DetailTabs';
import {DrawerHeader} from './DrawerHeader';
import {TimeControl} from './TimeControl';
import { ViewControl } from './ViewControl';
import { ArtIcon,Resource } from './ArtIcon';
import { RealmPanel,type RealmTab } from './RealmPanel';
import { scriptLabel } from '../data/scripts';
import { CharacterDirectory } from './CharacterDirectory';
import { GameEntry,RunOutcome,CampaignTracker,saveLabel } from './GameEntry';
import { HierarchyExplorer } from './HierarchyExplorer';
import { territoryNodes,descendantSites,nodeForSite,controlEvents,type TerritoryLevel } from '../data/territorialHierarchy';
import { useEffect, useMemo, useRef, useState } from 'react';
import { polities, siteById, sites } from '../data/scenario';
import { dateLabel } from '../core/world';
import { WorldMap, type MapMode } from '../map/WorldMap';
import { LocationDevelopment, ConstructionPanel,type CityTab } from './Development';
import { administrationPath } from '../data/administration';
import { provisionCost } from '../core/construction';
import { roadNeighbors } from '../map/territories';
import { useGame } from './useGame';
import './interaction.css';
import './detailPanels.css';
import './mapHud.css';
import './drawerFrame.css';

type IconName='play'|'pause'|'pin'|'layers'|'compass'|'plus'|'minus'|'arrow'|'close'|'save'|'menu';
function Icon({name,size=18}:{name:IconName;size?:number}){
  const paths:Record<IconName,React.ReactNode>={
    play:<path d="m8 5 11 7-11 7Z"/>,pause:<><path d="M8 5v14M16 5v14"/></>,pin:<><path d="M18 10c0 5-6 10-6 10S6 15 6 10a6 6 0 1 1 12 0Z"/><circle cx="12" cy="10" r="2"/></>,
    layers:<><path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,compass:<><circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/></>,plus:<path d="M5 12h14M12 5v14"/>,minus:<path d="M5 12h14"/>,arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,close:<path d="m6 6 12 12M18 6 6 18"/>,save:<><path d="M5 3h12l3 3v15H4V3ZM8 3v6h8V3M8 21v-7h8v7"/></>,menu:<path d="M5 6h14M5 12h14M5 18h14"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function App(){
  const game=useGame();
  const [selected,setSelected]=useState('jiankang'),[mode,setMode]=useState<MapMode>('political'),[showTravelers,setShowTravelers]=useState(true),[tilted,setTilted]=useState(true);
  const [modal,setModal]=useState<'situation'|'diplomacy'|'lifestyle'|'saves'|'directory'|'about'|'estate'|'menu'|'characters'|'realm'|'map-person'|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [searchTab,setSearchTab]=useState<'people'|'places'>('people');
  const [cameraAction,setCameraAction]=useState<{type:'home'|'player'|'selected'|'in'|'out';seq:number}>({type:'home',seq:0});
  const [journalOpen,setJournalOpen]=useState(false),[journalScope,setJournalScope]=useState<'all'|'player'>('all');
  const [territory,setTerritory]=useState('realm:liang'),[level,setLevel]=useState<TerritoryLevel>('realm'),[historyEvent,setHistoryEvent]=useState<string|null>(null);
  const [drawer,setDrawer]=useState<'character'|'place'|null>(null);
  const [diplomacyTarget,setDiplomacyTarget]=useState<RealmId>('west');
  const [personTab,setPersonTab]=useState<PersonTab>('overview');
  const [realmTab,setRealmTab]=useState<RealmTab>('overview'),[courtTab,setCourtTab]=useState<CourtTab>('ministries');
  const [panelTrail,setPanelTrail]=useState<{modal:typeof modal;drawer:typeof drawer;mapPeople:string[];personTab:PersonTab;diplomacyTarget:RealmId}[]>([]);
  const [serviceFocus,setServiceFocus]=useState<{id?:number;seq:number;view?:'council'|'duties'}>({seq:0});
  const [mapOptions,setMapOptions]=useState(false);
  const [cityTab,setCityTab]=useState<CityTab>('model');
  const [mapPeople,setMapPeople]=useState<string[]>([]);
  const upload=useRef<HTMLInputElement>(null);
  const person=game.world?.people[0];
  const plan=useMemo(()=>person&&!person.journey&&game.world?personalRoute(game.world,selected):null,[person,selected,game.world]);
  const site=siteById[selected],polity={...polities[game.world?.realm?.cities[selected].controller??site.polity],name:regimeName(game.world??undefined,game.world?.realm?.cities[selected].controller??site.polity)};
  const focus=(type:typeof cameraAction.type)=>setCameraAction(a=>({type,seq:a.seq+1}));
  const showDrawer=(kind:typeof drawer)=>{setModal(null);setPanelTrail([]);setMapOptions(false);if(kind==='character'){setMapPeople([game.world?.characterId??'player']);setPersonTab('overview');setModal('map-person');setDrawer(null);game.send({type:'speed',speed:0});}else setDrawer(kind);};
  const closePanel=()=>{setModal(null);setPanelTrail([]);};
  const backPanel=()=>{const previous=panelTrail.at(-1);if(!previous)return;setModal(previous.modal);setDrawer(previous.drawer);setMapPeople(previous.mapPeople);setPersonTab(previous.personTab);setDiplomacyTarget(previous.diplomacyTarget);setPanelTrail(items=>items.slice(0,-1));};
  const chooseTerritory=(id:string)=>{const node=territoryNodes[id];if(!node)return;showDrawer('place');setCityTab('model');setTerritory(id);setLevel(node.level);const city=descendantSites(id)[0];if(city)setSelected(city);setMode('domains');setCameraAction(a=>({type:'selected',seq:a.seq+1}));};
  const chooseCity=(id:string)=>{showDrawer('place');setCityTab('model');setSelected(id);setTerritory('city:'+id);setLevel('city');};
  const chooseLevel=(value:TerritoryLevel)=>{chooseTerritory(nodeForSite(selected,value).id);};
  const chooseEvent=(id:string|null)=>{setHistoryEvent(id);game.send({type:'speed',speed:0});if(id){const event=controlEvents.find(e=>e.id===id)!;chooseCity(event.site);focus('selected');}};
  const openModal=(kind:typeof modal,nested=false)=>{setMapOptions(false);game.send({type:'speed',speed:0});setPanelTrail(items=>nested?[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget}]:[]);if(kind!=='estate')setDrawer(null);setModal(kind);};
  const openPerson=(id:string,nested=true)=>{openModal('map-person',nested);setMapPeople([id]);setPersonTab('overview');};
  const openDiplomacy=(r:RealmId,nested=true)=>{openModal('diplomacy',nested);setDiplomacyTarget(r);};
  const timeLocked=game.pauses.length>0||modal==='estate'||modal==='menu'||modal==='saves';
  const disabledReason=!person?'世界载入中':person.journey?'正在途中':selected===person.location?'此刻所在之地':!plan?(game.world?travelDiplomacyReason(game.world,selected):'')||'暂无可用路线':person.food<plan.food?'行粮不足，请先整备':'';
  const allEvents=game.world?.chronicle.filter(e=>journalScope==='all'||e.person==='player').slice().reverse()??[];

  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key!=='Escape'||game.pauses.length)return;if(modal){if(panelTrail.length)backPanel();else closePanel();}else if(mapOptions)setMapOptions(false);else if(drawer)setDrawer(null);else setJournalOpen(false);};window.addEventListener('keydown',escape);return ()=>window.removeEventListener('keydown',escape);},[modal,mapOptions,drawer,panelTrail,game.pauses.length]);

  useEffect(()=>{setServiceFocus({seq:0});setModal(null);setDrawer(null);setPanelTrail([]);setJournalOpen(false);setMapOptions(false);if(game.world){const home=game.world.people[0].location;setSelected(home);setTerritory('city:'+home);setLevel('city');setHistoryEvent(null);setCameraAction(a=>({type:'player',seq:a.seq+1}));}},[game.entry]);

  if(game.blocked)return <main className="blocking"><div className="brand-seal">风云</div><h1>山河暂歇</h1><p>{game.blocked}</p><button className="primary" onClick={()=>location.reload()}>重新载入</button></main>;
  const navigatePause=(event:PauseEvent)=>{
    game.dismissPause();game.dismiss();
    if(event.kind==='arrival'||event.kind==='journey'){if(event.site){chooseCity(event.site);focus('selected');}}
    else if(event.kind==='mobility')openPerson(game.world!.characterId!,false);
    else if(event.kind==='health'||event.kind==='inheritance')openPerson(event.person??game.world!.characterId!,false);
    else if(event.kind==='retinue'){openPerson(game.world!.characterId!,false);setPersonTab('retinue');}
    else if(event.kind==='fiscal'){setRealmTab('treasury');openModal('realm');}
    else if(event.kind==='clan'){setRealmTab('clans');openModal('realm');}
    else if(event.kind==='service'){setRealmTab('duties');openModal('realm');}
    else if(event.kind==='duties'){setRealmTab('duties');openModal('realm');}
    else if(event.kind==='realm'){openModal('realm');}
    else if(event.kind==='diplomacy')openDiplomacy(playerRealm(game.world!),false);
  };
  const openOngoing=(item:OngoingItem)=>{
    const target=item.target;
    if(target.page==='city'){chooseCity(target.site);setCityTab(target.tab);focus('selected');}
    else if(target.page==='person'){openPerson(target.person,false);setPersonTab(target.person===game.world!.characterId?'overview':'interaction');}
    else if(target.page==='retinue'){openPerson(game.world!.characterId!,false);setPersonTab('retinue');}
    else if(target.page==='estate')openModal('estate');
    else if(target.page==='diplomacy')openDiplomacy(target.realm,false);
    else {setRealmTab(target.page==='service'||target.page==='duties'?'duties':target.page==='court'?'court':target.page);if(target.page==='court')setCourtTab(item.kind==='reform'?'dynasty':'situation');if(target.page==='service'||target.page==='duties')setServiceFocus(v=>({id:target.page==='service'?target.id:undefined,seq:v.seq+1,view:target.page==='duties'?'duties':item.kind==='petition'?'council':undefined}));openModal('realm');}
  };
  const pauseDialog=game.world&&game.pauses[0]?<PauseDialog key={game.pauses[0].id} event={game.pauses[0]} count={game.pauses.length} world={game.world} pending={game.pending} error={game.notice?.error?game.notice.text:undefined} onClose={game.dismissPause} onNavigate={navigatePause} send={command=>{game.dismiss();game.send({type:'command',command});}}/>:null;
  if(!game.world||game.page==='menu')return <GameEntry world={game.world} slots={game.slots} pending={game.pending} notice={game.notice} send={game.send} notify={game.notify}/>;
  if(game.world.campaign&&game.world.campaign.status!=='active')return <><RunOutcome world={game.world} pending={game.pending} notice={game.notice} send={game.send}/>{pauseDialog}</>;
  return <main className="game-shell focused-shell">
    <header className="topbar">
      <div className="sovereign-strip"><div className="brand game-brand"><h1 className="game-brand-title"><img src={import.meta.env.BASE_URL+'art/brand/fengyun-nanbeichao-logo.png'} alt="风云南北朝" width="1983" height="793" draggable={false}/></h1></div>
      <div className="realm-resources" aria-label="人物资源"><Resource name="coins" value={person?.coins??'—'} label="个人盘缠" unit="钱"/><Resource name="grain" value={person?.food??'—'} label="个人行粮" unit="日"/></div>
      </div><OngoingFlags key={game.entry} world={game.world} onOpen={openOngoing}/><TimeControl date={dateLabel(game.world.day,game.world.scriptId)} day={game.world.day} speed={game.speed} locked={!person||timeLocked} lockReason={game.pauses.length?'待处理事件':modal==='estate'?'庄园营建中':modal==='saves'?'管理存档中':'菜单已暂停'} onSpeed={speed=>game.send({type:'speed',speed})} onStep={()=>game.send({type:'step'})} onSave={()=>openModal('saves')} onMenu={()=>openModal('menu')}/>

    </header>

    <div className={`game-body ${drawer==='character'?'character-open':''} ${drawer==='place'?'place-open':''} ${modal&&modal!=='estate'&&modal!=='situation'?'utility-open':''}`}>
      <nav className="command-rail" aria-label="主要功能">{game.world.realm&&<button aria-expanded={modal==='realm'} onClick={()=>{setRealmTab('overview');openModal('realm');}}><span className="rail-emblem"><ArtIcon name="influence"/></span><span>政务{game.world.realm.event?' · !':''}</span></button>}{game.world.realm&&<button aria-expanded={modal==='diplomacy'} onClick={()=>openDiplomacy(playerRealm(game.world!),false)}><span className="rail-emblem"><ArtIcon name="influence"/></span><span>外交{game.world.diplomacy?.missions.some(m=>m.status==='audience')?' · !':''}</span></button>}<button className="rail-person" aria-label={'人物：'+(person?.name??'载入中')} aria-expanded={modal==='map-person'&&mapPeople[0]===game.world.characterId} onClick={()=>openPerson(game.world!.characterId??'player',false)}><span className="rail-emblem"><ArtIcon name="person"/></span><span>人物</span></button><button aria-expanded={modal==='lifestyle'} onClick={()=>openModal('lifestyle')}><span className="rail-emblem"><ArtIcon name="diligent"/></span><span>重心{lifestyleProgress(game.world!)?.study?' · !':''}</span></button><button aria-expanded={modal==='estate'} onClick={()=>openModal('estate')}><span className="rail-emblem"><ArtIcon name="estate"/></span><span>庄园</span></button><button aria-expanded={modal==='directory'} onClick={()=>openModal('directory')}><span className="rail-emblem"><ArtIcon name="world"/></span><span>查找</span></button><button aria-expanded={drawer==='place'} onClick={()=>showDrawer(drawer==='place'?null:'place')}><span className="rail-emblem"><ArtIcon name="city"/></span><span>所选</span></button><button aria-expanded={journalOpen} onClick={()=>setJournalOpen(v=>!v)}><span className="rail-emblem"><Icon name="menu"/></span><span>纪事</span></button></nav>

      <section className={`map-stage ${journalOpen?'journal-expanded':''}`} aria-label="战略地图">
        {game.world&&<WorldMap world={game.world} selected={selected} route={drawer==='place'&&cityTab==='travel'?plan?.route??[]:[]} mode={mode} showTravelers={showTravelers} tilted={tilted} cameraAction={cameraAction} territory={territory} territoryLevel={level} historyEvent={historyEvent} onDiplomacy={r=>openDiplomacy(r,false)} onInspectPeople={ids=>{openModal('map-person');setMapPeople(ids);setPersonTab('overview');}} onSelectTerritory={chooseTerritory} onSelect={chooseCity} onPreviewRoute={id=>{chooseCity(id);setCityTab('travel');setMode('roads');}}/>}
        {game.world.campaign&&game.world.mode!=='sandbox'&&<CampaignTracker world={game.world} send={game.send} onCity={id=>{chooseCity(id);setCityTab(game.world?.characterId||game.world?.campaign?.appointed&&id==='jingkou'?'build':'travel');focus('selected');}} onEstate={()=>openModal('estate')} onRealm={()=>openModal('realm')}/>}
        <div className="map-command-dock"><div className="map-navigation-row">        {game.world.realm&&courtOf(game.world)&&<button className="situation-map-button" aria-expanded={modal==='situation'} aria-label="查看本国局势" title="本国局势" onClick={()=>openModal('situation')}><ArtIcon name="renown" size={32}/><span>{phases[courtOf(game.world)!.phase].name}</span>{courtOf(game.world)!.petition&&<b aria-label="有待决奏议">!</b>}</button>}        <div className="zoom-tools"><ViewControl action="in" label="放大地图" onClick={()=>focus('in')}/><ViewControl action="out" label="缩小地图" onClick={()=>focus('out')}/><button className="art-map-button" title="定位当前人物" aria-label="定位当前人物" onClick={()=>focus('player')}><ArtIcon name="person"/></button><button className="art-map-button" title="定位所选城市" aria-label="定位所选城市" onClick={()=>focus('selected')}><ArtIcon name="city"/></button><button className="art-map-button" title="全国视野" aria-label="全国视野" onClick={()=>focus('home')}><ArtIcon name="world"/></button></div>
</div>        <div className="map-toolbox"><div className="map-modes" aria-label="地图模式">{([['political','势力','influence'],['domains','郡县','city'],['diplomacy','外交','gregarious'],['terrain','山川','world'],['roads','道路','grain']] as const).filter(([id])=>id!=='diplomacy'||!!game.world?.realm).map(([id,label,icon])=><button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)} title={label}>{id==='roads'?<Icon name="arrow" size={25}/>:<ArtIcon name={icon} size={25}/>}<span>{label}</span></button>)}</div><button className="map-options-toggle" aria-expanded={mapOptions} onClick={()=>setMapOptions(v=>!v)} title="地图显示选项" aria-label="地图显示选项"><Icon name="layers"/></button></div>{mapOptions&&<div className="map-options" aria-label="地图显示设置"><button className={`travelers-toggle ${showTravelers?'active':''}`} aria-pressed={showTravelers} onClick={()=>setShowTravelers(v=>!v)}>在途人物</button><button className={`atlas-view-toggle ${tilted?'active':''}`} aria-pressed={tilted} onClick={()=>setTilted(v=>!v)}>{tilted?'立体山河':'平面舆图'}</button></div>}
</div>
        <div className="map-legend">{mode==='diplomacy'?<span>金：本国 · 红：交战 · 赭：敌对 · 绿：同盟 · 蓝：通行</span>:(mode==='political'||mode==='domains')?Object.entries(polities).map(([id,p])=><span key={id}><i style={{background:p.color}}/>{id==='frontier'?p.name:regimeName(game.world!,id as RealmId)}</span>):<span>{mode==='terrain'?'真实高程 · 海拔设色与山影':'道路与行程'}</span>}</div>

        <div className="map-bottomline"><span>单击选地 · 双击拉近 · 右键操作</span><button onClick={()=>openModal('about')}>舆图说明</button></div>
        {journalOpen&&<section className={`journal ${journalOpen?'':'collapsed'}`} aria-label="行旅纪事"><div className="journal-heading"><button className="journal-title" onClick={()=>setJournalOpen(v=>!v)} aria-expanded={journalOpen}>行旅纪事 <span>{journalOpen?'收起':'展开'}</span></button>{journalOpen&&<div className="journal-filter"><button className={journalScope==='all'?'active':''} onClick={()=>setJournalScope('all')}>天下</button><button className={journalScope==='player'?'active':''} onClick={()=>setJournalScope('player')}>此身</button></div>}</div>{journalOpen&&<div className="journal-entries">{allEvents.slice(0,8).map((e,i)=><div className="journal-entry" key={`${e.day}-${e.person}-${i}`}><time>{dateLabel(e.day,game.world?.scriptId)}</time><p className={e.person==='player'?'personal':''}>{e.text.replace('起始资源与单城治理范围为玩法设定。','')}</p></div>)}</div>}</section>}
      </section>

      {drawer==='place'&&<aside key={territory} className={`place-panel panel ${territoryNodes[territory].level==='city'?'city-detail-panel':''}`}><DrawerHeader title={territoryNodes[territory].level==='city'?'城市':'辖区'} onClose={()=>setDrawer(null)} action={<button className="drawer-medallion drawer-locate" title="定位所选城市" aria-label="定位所选城市" onClick={()=>focus('selected')}><ArtIcon name="city" size={23}/></button>}/>{territoryNodes[territory].level!=='city'&&<HierarchyExplorer selected={territory} level={level} eventId={historyEvent} onSelect={chooseTerritory} onLevel={chooseLevel} onEvent={chooseEvent}/>}{territoryNodes[territory].level==='city'&&<><div className="city-detail-heading"><div><h2>{site.name}</h2><span>{game.world.realm&&game.world.realm.cities[selected].controller!=='frontier'?<button className="relationship-link" onClick={()=>openDiplomacy(game.world!.realm!.cities[selected].controller as RealmId)}>{polity.name} →</button>:polity.name} · {site.capital?'都城':'治所'} · {site.terrain}</span></div>{territoryNodes[territory].parent&&<button onClick={()=>chooseTerritory(territoryNodes[territory].parent!)}>↑ 上级</button>}</div>{game.world&&<LocationDevelopment onPerson={openPerson} onRetinue={()=>{openPerson(game.world!.characterId!);setPersonTab('retinue');}} pending={game.pending} world={game.world} selected={selected} onSelect={chooseCity} send={command=>game.send({type:'command',command})} tab={cityTab} onTab={setCityTab} peopleCount={residentsAt(game.world,[selected]).length} people={<PlacePeople world={game.world} sites={[selected]} onPerson={openPerson} onEstate={()=>openModal('estate')}/>} overview={<><p className="place-description">{site.description}</p>{!!game.world.service?.tasks.some(t=>t.site===selected&&t.phase!=='closed')&&<section className="city-local-tasks"><h3><ArtIcon name="diligent" size={26}/>本城差事</h3>{game.world.service.tasks.filter(t=>t.site===selected&&t.phase!=='closed').map(t=><p key={t.id}>{assignmentTemplates[t.kind].name} · {assignmentPhases[t.phase]}</p>)}<button onClick={()=>{setRealmTab('duties');openModal('realm');}}>查看差事簿 →</button></section>}
 <section className="territory-connections"><span className="eyebrow">通往邻近城邑</span><div>{roadNeighbors(selected).map(neighbor=><button key={neighbor.id} onClick={()=>chooseCity(neighbor.id)}><ArtIcon name="city" size={24}/>{neighbor.name}<span>→</span></button>)}</div></section>
        </>} travel={<section className="route-section"><span className="eyebrow">前往此地</span>{plan?<><div className="route-metrics"><div><strong>{plan.days}</strong><span>日行程</span></div><div><strong>{plan.distance.toLocaleString()}</strong><span>公里 · 估算</span></div></div><ol className="route-stops">{plan.route.map((id,i)=><li key={id}><i/>{siteById[id].name}{i===0&&<span>出发</span>}{i===plan.route.length-1&&<span>抵达</span>}</li>)}</ol><div className="travel-cost"><span>需备行粮</span><strong>{plan.food} 日份</strong></div></>:<p className="route-empty">{person?.journey?'请先完成当前行程。':person?.location===selected?'你已身在此地。':travelDiplomacyReason(game.world!,selected)||'没有可用道路。'}</p>}<>{plan&&person&&person.food<plan.food&&<button className="provision-button" disabled={!!person.journey||person.coins<(game.world?provisionCost(game.world):12)} onClick={()=>game.send({type:'command',command:{type:'provision'}})}>补充行粮 <span>{game.world?provisionCost(game.world):12} 钱 / 30 日</span></button>}</><button className="primary travel-button" disabled={!!disabledReason} onClick={()=>{game.send({type:'command',command:{type:'travel',destination:selected}});}}>{disabledReason?'无法启程':'启程前往'}{!disabledReason&&<Icon name="arrow"/>}</button>{plan&&<p className="route-disclaimer">每日约行 40 公里；山地耗时更长。<br/>行程沿节点推进，抵达后自动暂停。</p>}</section>}/>}</>}
      {territoryNodes[territory].level!=='city'&&<PlacePeople world={game.world} sites={descendantSites(territory)} onPerson={openPerson} onEstate={()=>openModal('estate')}/>}</aside>}
    {modal&&<div className={modal==='estate'?'modal-backdrop':modal==='situation'?'utility-drawer-host situation-drawer-host':'utility-drawer-host'} onClick={modal==='estate'?closePanel:undefined}><section key={modal} className={`modal ${modal==='estate'?'':'left-utility-drawer'} ${modal==='map-person'?'social-modal':modal==='realm'?'realm-modal':modal==='directory'?'directory-modal':modal==='estate'?'estate-modal':modal==='characters'?'characters-modal':''}`} role={modal==='estate'?'dialog':'region'} aria-modal={modal==='estate'?true:undefined} aria-label={modal==='situation'?'本国局势':modal==='diplomacy'?'国家外交':modal==='lifestyle'?'生活重心与技能树':modal==='map-person'?'人物':modal==='realm'?'政务':modal==='saves'?'行记与存档':modal==='directory'?'地点目录':modal==='estate'?'家族庄园':modal==='menu'?'游戏菜单':modal==='characters'?'历史人物名录':'游戏指南'} onClick={e=>e.stopPropagation()}>{modal==='estate'?<header><div><span className="eyebrow">风云南北朝</span><h2>一族之根，一方家产</h2></div><div className="drawer-actions"><button autoFocus aria-label="关闭窗口" onClick={closePanel}><Icon name="close"/></button></div></header>:<DrawerHeader title={modal==='situation'?'朝局':modal==='diplomacy'?'邦交':modal==='lifestyle'?'生活重心':modal==='map-person'?'人物':modal==='realm'?'政务':modal==='saves'?'行记':modal==='directory'?'查找':modal==='menu'?'游戏菜单':modal==='characters'?'人物名录':'舆图指南'} onBack={panelTrail.length?backPanel:undefined} onClose={closePanel}/>}

      {modal==='situation'&&<CourtPanel world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} tab="situation" onTab={()=>{}}/>}
      {modal==='diplomacy'&&<DiplomacyPanel key={diplomacyTarget} world={game.world} selected={diplomacyTarget} onSelect={id=>openDiplomacy(id)} onPerson={id=>openPerson(id)} pending={game.pending} send={command=>game.send({type:'command',command})}/>}
      {modal==='lifestyle'&&<LifestylePanel key={game.world.characterId??'fictional'} world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})}/>}
      {modal==='menu'&&<div className="game-menu-actions"><button className="primary" onClick={closePanel}>返回游戏</button><button onClick={()=>openModal('saves',true)}>保存／读取／导出</button><button disabled={game.pending} onClick={()=>game.send({type:'menu'})}>保存并返回主菜单</button><button onClick={()=>openModal('about',true)}>玩法与说明</button><p>关闭菜单后保持暂停，可使用顶部时间控制继续。本地保存失败时会留在当前游戏，可导出文件备份。</p></div>}
      {modal==='saves'&&<><p className="modal-description">{accountSaves?'存档保存在当前登录账号下。导出文件可用于备份或迁移；读取与导入前会保留当前进度。':'存档保存在此浏览器中。导出文件可用于备份或迁移；读取与导入前会保留当前进度。'}</p><div className="save-actions"><button className="primary" disabled={!person} onClick={()=>game.send({type:'save'})}>保存当前行程</button><button disabled={!person} onClick={()=>game.send({type:'export'})}>导出文件</button><button disabled={!person} onClick={()=>upload.current?.click()}>导入文件</button><input ref={upload} type="file" accept=".json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>2_000_000){game.notify('存档超过 2 MB，无法导入。',true);return;}try{game.send({type:'import',text:await file.text()});}catch{game.notify('读取文件失败。',true);}}}/></div><div className="save-list">{!game.slots.length?<p className="empty-state">暂无存档。现在保存，为这段旅途留下一页行记。</p>:game.slots.map(slot=><div className="save-row" key={slot.id}><div><strong>{saveLabel(slot.id)}{slot.characterName?' · '+slot.characterName:''}</strong><span>{slot.mode==='sandbox'?'历史沙盒':'原有玩法'} · {scriptLabel(slot.scriptId)} · {dateLabel(slot.day,slot.scriptId)} · {new Date(slot.savedAt).toLocaleString('zh-CN')}</span></div><button onClick={()=>game.send({type:'load',slot:slot.id})}>恢复</button></div>)}</div><p className="small-note">自动保存：出发、补给、每十个游戏日及抵达时。保留三份轮换自动行记和一份手动行记。</p></>}
      {modal==='directory'&&<><DetailTabs label="查找对象" value={searchTab} onChange={setSearchTab} items={[{id:'people',label:'人物',icon:'person'},{id:'places',label:'城邑',icon:'city'}]}/>{searchTab==='people'?<CharacterDirectory world={game.world} onPerson={id=>openPerson(id)}/>:<><input className="search" aria-label="搜索地点" placeholder="查找城邑，如建康、长安、敦煌…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="directory-filters realm-flags"><button className={'realm-filter-all '+(filter==='all'?'active':'')} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>全部</button>{(Object.keys(polities) as Polity[]).map(id=><RealmFlagButton key={id} realm={id} world={game.world??undefined} compact selected={filter===id} onClick={()=>setFilter(id)}/>)}</div><div className="directory-list">{sites.filter(s=>(s.name+administrationPath(s.id)).includes(query)&&(filter==='all'||(game.world?.realm?.cities[s.id]?.controller??s.polity)===filter)).map(s=><button key={s.id} onClick={()=>{chooseCity(s.id);setModal(null);focus('selected');}}><span><i style={{background:polities[s.polity].color}}/><strong>{s.name}</strong><small>{s.rank==='county'?'县治':s.capital?'都城':'主要城市'}</small></span><span>{regimeName(game.world??undefined,game.world?.realm?.cities[s.id]?.controller??s.polity)}<Icon name="arrow" size={15}/></span></button>)}{!sites.some(s=>(s.name+administrationPath(s.id)).includes(query)&&(filter==='all'||(game.world?.realm?.cities[s.id]?.controller??s.polity)===filter))&&<p className="empty-state">未找到匹配地点。</p>}</div></>}</>}
      {modal==='about'&&<div className="about-content"><h3>此身与天下</h3><p>在城市或辖区详情中查找驻留人物，点击查看家族、官职与关系；在途人物可直接在地图上点选。在人物页选择互动、经营世业，或前往朝廷处理政务。时间暂停时可以从容安排事务，再推进日期等待结果。</p><h3>行旅与营建</h3><p>点击城邑进行营建或规划行程，启程前备足行粮。庄园通过左侧“庄园”进入。</p><h3>舆图</h3><p>自然地理采用现代高程与水系。行政区划按剧本收录范围显示；城域示意不等同于精确历史县界。完整疆域以已收录的边界及沿革为准。</p><h3>保存旅途</h3><p>切换到后台自动暂停。{accountSaves?'存档保存在当前登录账号下，注销账号会删除存档。你也可以导出文件留作备份。':'存档保存在当前浏览器，定期导出可防止清理浏览器数据后丢失进度。'}</p><a href={import.meta.env.BASE_URL+'THIRD_PARTY_NOTICES.md'} target="_blank" rel="noreferrer">数据来源与许可 ↗</a></div>}
      {modal==='map-person'&&<MapPersonPanel key={mapPeople.join('|')} world={game.world} ids={mapPeople} tab={personTab} onTab={setPersonTab} pending={game.pending} send={command=>game.send({type:'command',command})} onSelect={id=>{setMapPeople(items=>[id,...items.filter(p=>p!==id)]);setPersonTab('overview');}} onPerson={id=>openPerson(id)} onDiplomacy={r=>openDiplomacy(r)} onLifestyle={()=>openModal('lifestyle',true)} onService={()=>{setRealmTab('duties');openModal('realm',true);}} onRealm={()=>{setRealmTab('politics');openModal('realm',true);}} onEstate={()=>openModal('estate',true)} onLocate={()=>focus('player')} onFind={()=>{setSearchTab('people');openModal('directory',true);}} onCity={chooseCity}/>}
      {modal==='realm'&&game.world&&<RealmPanel serviceFocus={serviceFocus} tab={realmTab} onTab={setRealmTab} courtTab={courtTab} onCourtTab={setCourtTab} onPerson={id=>openPerson(id)} world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onCity={id=>{chooseCity(id);setCityTab('governance');setModal(null);setCameraAction(a=>({type:'selected',seq:a.seq+1}));}}/>}

      {modal==='characters'&&<CharacterDirectory world={game.world} onPerson={id=>openPerson(id)}/>}
      {modal==='estate'&&game.world&&<ConstructionPanel world={game.world} scope="estate" site={game.world.holdings.estate.location} send={command=>game.send({type:'command',command})}/>}
    </section></div>}
    </div>


    {pauseDialog}
    {game.notice&&<div className={`toast ${game.notice.error?'is-error':''}`} role={game.notice.error?'alert':'status'}><span>{game.notice.text}</span><button aria-label="关闭提示" onClick={game.dismiss}><Icon name="close" size={16}/></button></div>}

  </main>;
}

import {PersonalEconomyPanel} from './PersonalEconomyPanel';
import {ArmyDock,type ArmyMove} from './ArmyDock';
import {TerritoryNavigation} from './TerritoryNavigation';
import {LocalTerritoryPanel} from './LocalAdministration';
import {RealmNavigation,RealmBadge} from './RealmBadge';
import {familyName as estateFamilyName} from '../data/characters';
import {OngoingFlags} from './OngoingFlags';
import {ConfirmAction} from './ConfirmAction';
import type {OngoingItem} from '../core/ongoing';
import {assignmentTemplates,assignmentPhases} from '../data/assignments';
import {PauseDialog} from './PauseDialog';
import {AudienceDeferContext} from './AudienceContext';
import type {PauseEvent} from '../core/pauseEvents';
import { residentsAt } from '../core/placePeople';
import { PlacePeople } from './PlacePeople';
import type { Polity } from '../core/types';
import { DiplomacyPanel } from './DiplomacyPanel';
import { personalRoute,travelDiplomacyReason } from '../core/diplomacy';
import { playerRealm,realmReason,type RealmId } from '../core/realm';
import {armyBatchReason} from '../core/world';
import {activeWars,warRealmSide} from '../core/wars';
import {RealmFlag} from './RealmFlag';
import {playerCommandsArmy} from '../core/civilWars';
import './gameBrand.css';
const accountSaves=import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/');
import { CourtPanel } from './CourtPanel';
import { StaffChamber,RetinueChamber,type CourtTab } from './StaffChamber';
import {courtOf} from '../core/court';
import {phases} from '../data/court';
import { regimeName } from '../core/government';
import { ForeignCourtChamber } from './ForeignCourtChamber';
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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import './ceremonialModalTitle.css';

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
  const [armyMove,setArmyMove]=useState<ArmyMove>(null);
  const [selectedArmies,setSelectedArmies]=useState<number[]>([]);
  const [armyOrderError,setArmyOrderError]=useState('');
  const [armyFocus,setArmyFocus]=useState<{army:number;seq:number;tab?:'campaign'}>({army:0,seq:0});
  const [selected,setSelected]=useState('jiankang'),[mode,setMode]=useState<MapMode>('political'),[showTravelers,setShowTravelers]=useState(true),[tilted,setTilted]=useState(true);
  const [modal,setModal]=useState<'wealth'|'situation'|'diplomacy'|'saves'|'directory'|'about'|'estate'|'staff'|'retinue'|'menu'|'realm'|'map-person'|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [deleteSlot,setDeleteSlot]=useState<string|null>(null);
  const [searchTab,setSearchTab]=useState<'people'|'places'>('people');
  const [cameraAction,setCameraAction]=useState<{type:'home'|'player'|'selected'|'in'|'out';seq:number}>({type:'home',seq:0});
  const [journalOpen,setJournalOpen]=useState(false),[journalScope,setJournalScope]=useState<'all'|'player'>('all');
  const [territory,setTerritory]=useState('realm:liang'),[level,setLevel]=useState<TerritoryLevel>('realm'),[historyEvent,setHistoryEvent]=useState<string|null>(null);
  const [drawer,setDrawer]=useState<'character'|'place'|null>(null);
  const [diplomacyTarget,setDiplomacyTarget]=useState<RealmId>('west');
  const [diplomacyInitialTab,setDiplomacyInitialTab]=useState<'relations'|'clans'>('relations');
  const [personTab,setPersonTab]=useState<PersonTab>('overview');
  const [realmTab,setRealmTab]=useState<RealmTab>('overview'),[financeFocus,setFinanceFocus]=useState<'treasury'|'audit'>('treasury');
  const [staffRealm,setStaffRealm]=useState<RealmId>('liang'),[staffTab,setStaffTab]=useState<CourtTab>('central'),[staffRegion,setStaffRegion]=useState(''),[staffPerson,setStaffPerson]=useState(''),[treasuryTab,setTreasuryTab]=useState<'budget'|'requests'|'ledger'>('budget'),[retinueHost,setRetinueHost]=useState('');
  const [panelTrail,setPanelTrail]=useState<{modal:typeof modal;drawer:typeof drawer;mapPeople:string[];personTab:PersonTab;diplomacyTarget:RealmId;staffRealm:RealmId;selected:string;territory:string;level:TerritoryLevel;cityTab:CityTab;realmTab:RealmTab;financeFocus:'treasury'|'audit'}[]>([]);
  const [serviceFocus,setServiceFocus]=useState<{id?:number;seq:number;view?:'duties'}>({seq:0});
  const [mapOptions,setMapOptions]=useState(false);
  const [cityTab,setCityTab]=useState<CityTab>('model');
  const [mapPeople,setMapPeople]=useState<string[]>([]);
  const upload=useRef<HTMLInputElement>(null);
  const placePanel=useRef<HTMLElement>(null),placeScroll=useRef<Record<string,number>>({});
  useLayoutEffect(()=>{if(placePanel.current)placePanel.current.scrollTop=placeScroll.current[territory+'|'+cityTab]??0;},[territory,cityTab,drawer,modal]);
  useEffect(()=>{if(game.page==='play'&&game.world&&(!game.world.campaign||game.world.campaign.status==='active'))return;const reserveSpace=(e:KeyboardEvent)=>{if(e.code!=='Space'||e.isComposing||e.target instanceof Element&&e.target.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]'))return;e.preventDefault();e.stopImmediatePropagation();};window.addEventListener('keydown',reserveSpace,true);window.addEventListener('keyup',reserveSpace,true);return()=>{window.removeEventListener('keydown',reserveSpace,true);window.removeEventListener('keyup',reserveSpace,true);};},[game.page,!!game.world,game.world?.campaign?.status]);
  const person=game.world?.people[0];
  const plan=useMemo(()=>person&&!person.journey&&game.world?personalRoute(game.world,selected):null,[person,selected,game.world]);
  const site=siteById[selected];
  const focus=(type:typeof cameraAction.type)=>setCameraAction(a=>({type,seq:a.seq+1}));
  const showDrawer=(kind:typeof drawer)=>{setModal(null);setPanelTrail([]);setMapOptions(false);if(kind==='character'){setMapPeople([game.world?.characterId??'player']);setPersonTab('overview');setModal('map-person');setDrawer(null);game.send({type:'speed',speed:0});}else setDrawer(kind);};
  const closePanel=()=>{setModal(null);setDeleteSlot(null);setPanelTrail([]);};
  const backPanel=()=>{const previous=panelTrail.at(-1);if(!previous)return;setModal(previous.modal);setDrawer(previous.drawer);setMapPeople(previous.mapPeople);setPersonTab(previous.personTab);setDiplomacyTarget(previous.diplomacyTarget);setStaffRealm(previous.staffRealm);setSelected(previous.selected);setTerritory(previous.territory);setLevel(previous.level);setCityTab(previous.cityTab);setRealmTab(previous.realmTab);setFinanceFocus(previous.financeFocus);setPanelTrail(items=>items.slice(0,-1));};
  const chooseTerritory=(id:string,nested=false)=>{if(armyMove){const sites=descendantSites(id);const site=sites.length===1?sites[0]:undefined;if(site)setArmyMove({...armyMove,site});return;}let node=territoryNodes[id];if(!node)return;if(node.level==='county'){id='city:'+descendantSites(id)[0];node=territoryNodes[id];}if(nested||drawer==='place'&&!modal){if(nested||id!==territory)setPanelTrail(items=>[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget,staffRealm,selected,territory,level,cityTab,realmTab,financeFocus}]);if(nested){setModal(null);setDrawer('place');setMapOptions(false);}}else{showDrawer('place');setCityTab('model');}setTerritory(id);setLevel(node.level);const city=descendantSites(id)[0];if(city)setSelected(city);setMode('domains');setCameraAction(a=>({type:'selected',seq:a.seq+1}));};
  useEffect(()=>{const available=new Set(game.world?.realm?.armies.filter(a=>playerCommandsArmy(game.world!,a)).map(a=>a.id)??[]);setSelectedArmies(ids=>{const next=ids.filter(id=>available.has(id));return next.length===ids.length?ids:next;});if(armyMove&&!armyMove.armies.every(id=>available.has(id)))setArmyMove(null);},[armyMove,game.world]);
  const selectArmy=(id:number,extend:boolean)=>{setSelectedArmies(ids=>extend?(ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]):[id]);setArmyMove(null);setArmyOrderError('');};
  const commandArmyTo=(site:string)=>{if(!game.world||!selectedArmies.length)return false;const order=selectedArmies.length===1?{type:'realm',action:'march',army:selectedArmies[0],site} as const:{type:'armyBatch',action:'march',armies:selectedArmies,site} as const;const reason=order.type==='realm'?realmReason(game.world,order):armyBatchReason(game.world,order);if(game.pending||reason){setArmyOrderError(reason||'军令正在处理');return true;}game.send({type:'command',command:order});setArmyOrderError('');setArmyMove(null);return true;};
  const chooseCity=(id:string,nested=false)=>{if(armyMove){setSelected(id);setArmyMove({...armyMove,site:id});return;}if(nested||(drawer==='place'&&!modal&&territory!=='city:'+id)){setPanelTrail(items=>[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget,staffRealm,selected,territory,level,cityTab,realmTab,financeFocus}]);setModal(null);setDrawer('place');setMapOptions(false);}else if(drawer!=='place'||modal)showDrawer('place');if(drawer!=='place'||modal)setCityTab('model');setSelected(id);setTerritory('city:'+id);setLevel('city');};
  const chooseLevel=(value:TerritoryLevel)=>{chooseTerritory(nodeForSite(selected,value).id);};
  const chooseEvent=(id:string|null)=>{setHistoryEvent(id);game.send({type:'speed',speed:0});if(id){const event=controlEvents.find(e=>e.id===id)!;chooseCity(event.site);focus('selected');}};
  const openModal=(kind:typeof modal,nested=false)=>{setMapOptions(false);game.send({type:'speed',speed:0});setPanelTrail(items=>nested?[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget,staffRealm,selected,territory,level,cityTab,realmTab,financeFocus}]:[]);if(kind!=='estate')setDrawer(null);setModal(kind);};
  const openCourt=(tab:CourtTab='central',personId=game.world?.characterId??'',nested=true,financeTab:'budget'|'requests'|'ledger'='budget',view:'treasury'|'audit'='treasury')=>{setStaffRealm(playerRealm(game.world!));setStaffTab(tab);setStaffPerson(personId);setTreasuryTab(financeTab);setFinanceFocus(view);openModal('staff',nested);};
  const openForeignCourt=(realm:RealmId)=>{setStaffRealm(realm);setStaffTab('central');openModal('staff',true);};
  const openRetinue=(host=game.world?.characterId??'',nested=true)=>{setRetinueHost(host);openModal('retinue',nested);};
  const openPerson=(id:string,nested=true)=>{openModal('map-person',nested);setMapPeople([id]);setPersonTab('overview');};
  const openDiplomacy=(r:RealmId,nested=true,initialTab:'relations'|'clans'='relations')=>{openModal('diplomacy',nested);setDiplomacyTarget(r);setDiplomacyInitialTab(initialTab);};
  const timeLocked=game.pauses.length>0||modal==='estate'||modal==='staff'||modal==='retinue'||modal==='menu'||modal==='saves';
  const disabledReason=!person?'世界载入中':person.journey?'正在途中':selected===person.location?'此刻所在之地':!plan?(game.world?travelDiplomacyReason(game.world,selected):'')||'暂无可用路线':person.food<plan.food?'行粮不足，请先整备':'';
  const allEvents=game.world?.chronicle.filter(e=>journalScope==='all'||e.person==='player').slice().reverse()??[];

  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key!=='Escape'||event.defaultPrevented||game.pauses.length||document.querySelector('dialog[open]'))return;if(modal){if(panelTrail.length)backPanel();else closePanel();}else if(mapOptions)setMapOptions(false);else if(drawer){if(panelTrail.length)backPanel();else setDrawer(null);}else setJournalOpen(false);};window.addEventListener('keydown',escape);return ()=>window.removeEventListener('keydown',escape);},[modal,mapOptions,drawer,panelTrail,game.pauses.length]);

  useEffect(()=>{placeScroll.current={};setArmyMove(null);setSelectedArmies([]);setServiceFocus({seq:0});setStaffTab('central');setStaffRegion('');setModal(null);setDrawer(null);setPanelTrail([]);setJournalOpen(false);setMapOptions(false);if(game.world){const home=game.world.people[0].location;setSelected(home);setTerritory('city:'+home);setLevel('city');setHistoryEvent(null);setCameraAction(a=>({type:'player',seq:a.seq+1}));}},[game.entry]);

  if(game.blocked)return <main className="blocking"><div className="brand-seal">风云</div><h1>山河暂歇</h1><p>{game.blocked}</p><button className="primary" onClick={()=>location.reload()}>重新载入</button></main>;
  const navigatePause=(event:PauseEvent)=>{
    game.dismissPause();game.dismiss();
    if(event.kind==='arrival'||event.kind==='journey'){if(event.site){chooseCity(event.site);focus('selected');}}
    else if(event.kind==='economy')openCourt('finance',undefined,false,'budget','audit');
    else if(event.kind==='mobility')openPerson(game.world!.characterId!,false);
    else if(event.kind==='health'||event.kind==='inheritance')openPerson(event.person??game.world!.characterId!,false);
    else if(event.kind==='retinue')openRetinue(undefined,false);
    else if(event.kind==='court')openModal('situation');
    else if(event.kind==='local')openCourt('local',undefined,false);
    else if(event.kind==='fiscal')openCourt('finance',undefined,false,'requests');
    else if(event.kind==='clan')openDiplomacy(playerRealm(game.world!),false,'clans');
    else if(event.kind==='service'){setServiceFocus(v=>({id:event.assignmentId,seq:v.seq+1}));openModal('realm',true);setRealmTab(event.assignmentId?'duties':'council');}
    else if(event.kind==='duties'){setServiceFocus(v=>({seq:v.seq+1,view:'duties'}));openModal('realm',true);setRealmTab('duties');}
    else if(event.kind==='realm'){openModal('realm');}
    else if(event.kind==='diplomacy')openDiplomacy(playerRealm(game.world!),false);
  };
  const openOngoing=(item:OngoingItem)=>{
    if(item.id.startsWith('army:')){setArmyMove(null);setModal(null);setArmyFocus(v=>({army:Number(item.id.slice(5)),seq:v.seq+1}));return;}
    if(item.id.startsWith('campaign:')){const q=game.world?.militaryCampaigns?.items.find(q=>q.id===Number(item.id.slice(9)));if(q){setArmyMove(null);setModal(null);setArmyFocus(v=>({army:q.army,seq:v.seq+1,tab:'campaign'}));return;}}
    const target=item.target;
    if(target.page==='city'){chooseCity(target.site);setCityTab(target.tab);focus('selected');}
    else if(target.page==='person'){if(target.tab==='economy'&&target.person===game.world!.characterId)openModal('wealth');else{openPerson(target.person,false);setPersonTab(target.person===game.world!.characterId?'overview':'interaction');}}
    else if(target.page==='territory')chooseTerritory(target.territory);
    else if(target.page==='retinue')openRetinue(undefined,false);
    else if(target.page==='estate')openModal('estate');
    else if(target.page==='court'){openModal('situation');}
    else if(target.page==='diplomacy')openDiplomacy(target.realm,false);
    else if(target.page==='treasury'||target.page==='audit')openCourt('finance',undefined,false,target.page==='treasury'?'requests':'budget',target.page==='audit'?'audit':'treasury');
    else if(target.page==='government')openCourt('government',undefined,false);
    else if(target.page==='politics')openCourt('central',undefined,false);
    else {setRealmTab(target.page==='service'&&!target.id&&item.kind==='petition'?'council':'duties');if(target.page==='service'||target.page==='duties')setServiceFocus(v=>({id:target.page==='service'?target.id:undefined,seq:v.seq+1,view:target.page==='duties'?'duties':undefined}));openModal('realm');}
  };
  const pauseDialog=game.world&&game.pauses[0]?<PauseDialog key={game.pauses[0].id} event={game.pauses[0]} count={game.pauses.length} world={game.world} pending={game.pending} error={game.notice?.error?game.notice.text:undefined} onClose={game.dismissPause} onNavigate={navigatePause} send={command=>{game.dismiss();game.send({type:'command',command});}}/>:null;
  if(!game.world||game.page==='menu')return <GameEntry world={game.world} slots={game.slots} pending={game.pending} notice={game.notice} send={game.send} notify={game.notify}/>;
  if(game.world.campaign&&game.world.campaign.status!=='active')return <><RunOutcome world={game.world} pending={game.pending} notice={game.notice} send={game.send}/>{pauseDialog}</>;
  const deferAudience=modal?closePanel:drawer?()=>{setDrawer(null);setPanelTrail([]);}:null;
  return <RealmNavigation.Provider value={{world:game.world,open:r=>{if(game.pauses.length){game.dismissPause();game.dismiss();}if(modal==='diplomacy'&&diplomacyTarget===r)return;openDiplomacy(r);}}}><AudienceDeferContext.Provider value={deferAudience}><main className="game-shell focused-shell">
    <header className="topbar">
      <div className="sovereign-strip"><div className="brand game-brand"><h1 className="game-brand-title"><img src={import.meta.env.BASE_URL+'art/brand/fengyun-nanbeichao-logo.png'} alt="风云南北朝" width="1983" height="793" draggable={false}/></h1></div>
      <div className="realm-resources" aria-label="人物资源"><Resource name="coins" value={person?.coins??'—'} label="个人盘缠" unit="钱"/><Resource name="grain" value={person?.food??'—'} label="个人行粮" unit="日"/></div>
      </div><OngoingFlags key={game.entry} world={game.world} onOpen={openOngoing} onBrowse={()=>game.send({type:'speed',speed:0})}/><TimeControl date={dateLabel(game.world.day,game.world.scriptId)} day={game.world.day} speed={game.speed} locked={!person||timeLocked} lockReason={game.pauses.length?'待处理事件':modal==='estate'?'庄园营建中':modal==='staff'?'安排职官中':modal==='retinue'?'安排幕僚中':modal==='saves'?'管理存档中':'菜单已暂停'} onSpeed={speed=>game.send({type:'speed',speed})} onStep={()=>game.send({type:'step'})} onSave={()=>openModal('saves')} onMenu={()=>openModal('menu')}/>

      <ArmyDock focus={armyFocus} key={game.entry} world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onLocate={id=>{setSelected(id);setCameraAction(a=>({type:'selected',seq:a.seq+1}));}} selectedArmies={selectedArmies} onSelectArmy={selectArmy} onClearSelection={()=>setSelectedArmies([])} move={armyMove} onMove={value=>{setArmyMove(value);if(value){setLevel('city');setDrawer(null);setModal(null);}}}/>
    </header>

    <div className={`game-body ${drawer==='character'?'character-open':''} ${drawer==='place'?'place-open':''} ${modal&&modal!=='estate'&&modal!=='staff'&&modal!=='retinue'&&modal!=='situation'?'utility-open':''}`}>
      <nav className="command-rail" aria-label="主要功能">{game.world.realm&&<button aria-expanded={modal==='realm'} onClick={()=>{setRealmTab('overview');setFinanceFocus('treasury');openModal('realm');}}><span className="rail-emblem"><ArtIcon name="influence"/></span><span>政务{game.world.realm.event?' · !':''}</span></button>}{game.world.realm&&<button aria-expanded={modal==='diplomacy'} onClick={()=>openDiplomacy(playerRealm(game.world!),false)}><span className="rail-emblem"><ArtIcon name="gregarious"/></span><span>外交{game.world.diplomacy?.missions.some(m=>m.status==='audience')?' · !':''}</span></button>}<button className="rail-person" aria-label={'人物：'+(person?.name??'载入中')} aria-expanded={modal==='map-person'&&mapPeople[0]===game.world.characterId} onClick={()=>openPerson(game.world!.characterId??'player',false)}><span className="rail-emblem"><ArtIcon name="person"/></span><span>人物</span></button>{game.world.realm&&<button aria-expanded={modal==='wealth'} onClick={()=>openModal('wealth')}><span className="rail-emblem"><ArtIcon name="coins"/></span><span>经济</span></button>}<button aria-expanded={modal==='directory'} onClick={()=>openModal('directory')}><span className="rail-emblem"><ArtIcon name="world"/></span><span>查找</span></button><button aria-expanded={drawer==='place'} onClick={()=>showDrawer(drawer==='place'?null:'place')}><span className="rail-emblem"><ArtIcon name="city"/></span><span>所选</span></button><button aria-expanded={journalOpen} onClick={()=>setJournalOpen(v=>!v)}><span className="rail-emblem"><Icon name="menu"/></span><span>纪事</span></button></nav>

      <section className={`map-stage ${journalOpen?'journal-expanded':''}`} aria-label="战略地图">
        {game.world&&<WorldMap onActivity={openOngoing} onBrowseActivities={()=>game.send({type:'speed',speed:0})} onEstate={()=>openModal('estate')} world={game.world} selected={selected} selectedArmies={selectedArmies} onSelectArmy={selectArmy} onCommandArmy={commandArmyTo} route={drawer==='place'&&cityTab==='travel'?plan?.route??[]:[]} mode={mode} showTravelers={showTravelers} tilted={tilted} cameraAction={cameraAction} territory={territory} territoryLevel={level} historyEvent={historyEvent} onDiplomacy={r=>openDiplomacy(r,false)} onInspectPeople={ids=>{openModal('map-person');setMapPeople(ids);setPersonTab('overview');}} onSelectTerritory={chooseTerritory} onSelect={chooseCity} onPreviewRoute={id=>{chooseCity(id);setCityTab('travel');setMode('roads');}}/>}
        {game.world.campaign&&game.world.mode!=='sandbox'&&<CampaignTracker world={game.world} send={game.send} onCity={id=>{chooseCity(id);setCityTab(game.world?.characterId||game.world?.campaign?.appointed&&id==='jingkou'?'build':'travel');focus('selected');}} onEstate={()=>openModal('estate')} onRealm={()=>openModal('realm')}/>}
        <div className="map-command-dock"><div className="map-navigation-row">{game.world.realm&&<div className="map-war-flags" aria-label="进行中的战争">{activeWars(game.world).filter(war=>!!warRealmSide(war,playerRealm(game.world!))).map(war=>{const enemy=warRealmSide(war,playerRealm(game.world!))==='attack'?war.defender:war.attacker;return <button key={war.id} onClick={()=>openDiplomacy(war.civil?playerRealm(game.world!):enemy,false)} aria-label={"查看"+siteById[war.target].name+"战事"} title={siteById[war.target].name+" · 战争压力 "+war.score}><RealmFlag realm={war.attacker} world={game.world??undefined} compact showLabel={false}/><ArtIcon name="army" size={22}/><RealmFlag realm={war.defender} world={game.world??undefined} compact showLabel={false}/></button>;})}</div>}{armyOrderError&&<span className="map-army-order-error" role="status">{armyOrderError}</span>}        {game.world.realm&&courtOf(game.world)&&<button className="situation-map-button" aria-expanded={modal==='situation'} aria-label="查看本国局势" title="本国局势" onClick={()=>openModal('situation')}><ArtIcon name="renown" size={32}/><span>{phases[courtOf(game.world)!.phase].name}</span>{courtOf(game.world)!.petition&&<b aria-label="有待决奏议">!</b>}</button>}        <div className="zoom-tools"><ViewControl action="in" label="放大地图" onClick={()=>focus('in')}/><ViewControl action="out" label="缩小地图" onClick={()=>focus('out')}/><button className="art-map-button" title="定位当前人物" aria-label="定位当前人物" onClick={()=>focus('player')}><ArtIcon name="person"/></button><button className="art-map-button" title="定位所选城市" aria-label="定位所选城市" onClick={()=>focus('selected')}><ArtIcon name="city"/></button><button className="art-map-button" title="全国视野" aria-label="全国视野" onClick={()=>focus('home')}><ArtIcon name="world"/></button></div>
</div>        <div className="map-toolbox"><div className="map-modes" aria-label="地图模式">{([['political','势力','influence'],['domains','郡县','city'],['diplomacy','外交','gregarious'],['terrain','山川','world'],['roads','道路','grain']] as const).filter(([id])=>id!=='diplomacy'||!!game.world?.realm).map(([id,label,icon])=><button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)} title={label}>{id==='roads'?<Icon name="arrow" size={25}/>:<ArtIcon name={icon} size={25}/>}<span>{label}</span></button>)}</div><button className="map-options-toggle" aria-expanded={mapOptions} onClick={()=>setMapOptions(v=>!v)} title="地图显示选项" aria-label="地图显示选项"><Icon name="layers"/></button></div>{mapOptions&&<div className="map-options" aria-label="地图显示设置"><button className={`travelers-toggle ${showTravelers?'active':''}`} aria-pressed={showTravelers} onClick={()=>setShowTravelers(v=>!v)}>在途人物</button><button className={`atlas-view-toggle ${tilted?'active':''}`} aria-pressed={tilted} onClick={()=>setTilted(v=>!v)}>{tilted?'立体山河':'平面舆图'}</button></div>}
</div>


        {journalOpen&&<section className={`journal ${journalOpen?'':'collapsed'}`} aria-label="行旅纪事"><div className="journal-heading"><button className="journal-title" onClick={()=>setJournalOpen(v=>!v)} aria-expanded={journalOpen}>行旅纪事 <span>{journalOpen?'收起':'展开'}</span></button>{journalOpen&&<div className="journal-filter"><button className={journalScope==='all'?'active':''} onClick={()=>setJournalScope('all')}>天下</button><button className={journalScope==='player'?'active':''} onClick={()=>setJournalScope('player')}>此身</button></div>}</div>{journalOpen&&<div className="journal-entries">{allEvents.slice(0,8).map((e,i)=><div className="journal-entry" key={`${e.day}-${e.person}-${i}`}><time>{dateLabel(e.day,game.world?.scriptId)}</time><p className={e.person==='player'?'personal':''}>{e.text.replace('起始资源与单城治理范围为玩法设定。','')}</p></div>)}</div>}</section>}
      </section>

      {drawer==='place'&&<aside ref={placePanel} onScroll={e=>{placeScroll.current[territory+'|'+cityTab]=e.currentTarget.scrollTop;}} className="place-panel panel city-detail-panel"><DrawerHeader title={territoryNodes[territory].level==='city'?'县域':territoryNodes[territory].level==='province'?'州':territoryNodes[territory].level==='prefecture'?'郡':'辖区'} onBack={panelTrail.length?backPanel:undefined} onClose={()=>{setDrawer(null);setPanelTrail([]);}} action={<button className="drawer-medallion drawer-locate" title="定位所选城市" aria-label="定位所选城市" onClick={()=>focus('selected')}><ArtIcon name="city" size={23}/></button>}/>{territoryNodes[territory].level!=='realm'&&<TerritoryNavigation territory={territory} onSelect={chooseTerritory}/>} {territoryNodes[territory].level!=='city'&&(!game.world?.realm||territoryNodes[territory].level==='realm')&&<HierarchyExplorer managed={!!game.world?.realm} selected={territory} level={level} eventId={historyEvent} onSelect={chooseTerritory} onLevel={chooseLevel} onEvent={chooseEvent}/>}{game.world?.realm&&['province','prefecture'].includes(territoryNodes[territory].level)&&<LocalTerritoryPanel tab={cityTab} onTab={setCityTab} onEstate={()=>openModal('estate')} world={game.world} territory={territory} pending={game.pending} send={c=>game.send({type:'command',command:c})} onPerson={openPerson} onSelect={chooseTerritory}/>} {territoryNodes[territory].level==='city'&&<>{game.world&&<LocationDevelopment key={selected} onTerritory={chooseTerritory} onDiplomacy={r=>openDiplomacy(r)} onPerson={openPerson} onRetinue={()=>openRetinue(undefined,true)} onService={()=>{setServiceFocus(v=>({seq:v.seq+1}));setRealmTab('duties');openModal('realm',true);}} pending={game.pending} world={game.world} selected={selected} onSelect={chooseCity} send={command=>game.send({type:'command',command})} tab={cityTab} onTab={setCityTab} peopleCount={residentsAt(game.world,[selected]).length} people={<PlacePeople world={game.world} sites={[selected]} onPerson={openPerson} onEstate={()=>openModal('estate')}/>} localTasks={<>{!!game.world.service?.tasks.some(t=>t.site===selected&&t.phase!=='closed')&&<section className="city-local-tasks"><h3><ArtIcon name="diligent" size={26}/>本城差事</h3>{game.world.service.tasks.filter(t=>t.site===selected&&t.phase!=='closed').map(t=><p key={t.id}>{assignmentTemplates[t.kind].name} · {assignmentPhases[t.phase]}</p>)}<button onClick={()=>{openModal('realm',true);setServiceFocus(v=>({seq:v.seq+1}));setRealmTab('duties');}}>查看差事簿 →</button></section>}</>} overview={<><p className="place-description">{site.description}</p>
 <section className="territory-connections"><span className="eyebrow">通往邻近城邑</span><div>{roadNeighbors(selected).map(neighbor=><button key={neighbor.id} onClick={()=>chooseCity(neighbor.id)}><ArtIcon name="city" size={24}/>{neighbor.name}<span>→</span></button>)}</div></section>
        </>} travel={<section className="route-section"><span className="eyebrow">前往此地</span>{plan?<><div className="route-metrics"><div><strong>{plan.days}</strong><span>日行程</span></div><div><strong>{plan.distance.toLocaleString()}</strong><span>公里 · 估算</span></div></div><ol className="route-stops">{plan.route.map((id,i)=><li key={id}><i/>{siteById[id].name}{i===0&&<span>出发</span>}{i===plan.route.length-1&&<span>抵达</span>}</li>)}</ol><div className="travel-cost"><span>需备行粮</span><strong>{plan.food} 日份</strong></div></>:<p className="route-empty">{person?.journey?'请先完成当前行程。':person?.location===selected?'你已身在此地。':travelDiplomacyReason(game.world!,selected)||'没有可用道路。'}</p>}<>{plan&&person&&person.food<plan.food&&<button className="provision-button" disabled={!!person.journey||person.coins<(game.world?provisionCost(game.world):12)} onClick={()=>game.send({type:'command',command:{type:'provision'}})}>补充行粮 <span>{game.world?provisionCost(game.world):12} 钱 / 30 日</span></button>}</><button className="primary travel-button" disabled={!!disabledReason} onClick={()=>{game.send({type:'command',command:{type:'travel',destination:selected}});}}>{disabledReason?'无法启程':'启程前往'}{!disabledReason&&<Icon name="arrow"/>}</button>{plan&&<p className="route-disclaimer">每日约行 40 公里；山地耗时更长。<br/>行程沿节点推进，抵达后自动暂停。</p>}</section>}/>}</>}
      {territoryNodes[territory].level==='realm'&&<PlacePeople world={game.world} sites={descendantSites(territory)} onPerson={openPerson} onEstate={()=>openModal('estate')}/>}</aside>}
    {modal&&<div className={modal==='estate'||modal==='staff'||modal==='retinue'?'modal-backdrop':modal==='situation'?'utility-drawer-host situation-drawer-host':'utility-drawer-host'} onClick={modal==='estate'||modal==='staff'||modal==='retinue'?closePanel:undefined}><section key={modal} className={`modal ${modal==='estate'||modal==='staff'||modal==='retinue'?'':'left-utility-drawer'} ${modal==='map-person'?'social-modal':modal==='realm'?'realm-modal':modal==='directory'?'directory-modal':modal==='estate'?'estate-modal':modal==='staff'?'staff-modal':modal==='retinue'?'staff-modal retinue-modal':''}`} role={modal==='estate'||modal==='staff'||modal==='retinue'?'dialog':'region'} aria-modal={modal==='estate'||modal==='staff'||modal==='retinue'?true:undefined} aria-label={modal==='wealth'?'经济':modal==='situation'?'本国局势':modal==='diplomacy'?'国家外交':modal==='map-person'?'人物':modal==='realm'?'政务':modal==='saves'?'行记与存档':modal==='directory'?'地点目录':modal==='estate'?'家族庄园':modal==='staff'?(staffRealm===playerRealm(game.world!)?'朝廷':regimeName(game.world,staffRealm)+'朝廷'):modal==='retinue'?'幕府':modal==='menu'?'游戏菜单':'游戏指南'} onClick={e=>e.stopPropagation()}>{(modal==='staff'||modal==='retinue')?<header><h2>{modal==='staff'?(staffRealm===playerRealm(game.world!)?'朝廷':regimeName(game.world,staffRealm)+'朝廷'):'幕府'}</h2><div className="drawer-actions">{panelTrail.length>0&&<button aria-label="返回上页" onClick={backPanel}><Icon name="arrow"/></button>}<button autoFocus aria-label="关闭窗口" onClick={closePanel}><Icon name="close"/></button></div></header>:modal==='estate'?<header><h2>{estateFamilyName(game.world.holdings.estate.family)}氏庄园</h2><div className="drawer-actions"><button autoFocus aria-label="关闭窗口" onClick={closePanel}><Icon name="close"/></button></div></header>:<DrawerHeader title={modal==='wealth'?'经济':modal==='situation'?'朝局':modal==='diplomacy'?'邦交':modal==='map-person'?'人物':modal==='realm'?'政务':modal==='saves'?'行记':modal==='directory'?'查找':modal==='menu'?'游戏菜单':'舆图指南'} onBack={panelTrail.length?backPanel:undefined} onClose={closePanel}/>}

      {modal==='wealth'&&<PersonalEconomyPanel world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onEstate={()=>openModal('estate',true)}/>}
      {modal==='situation'&&<CourtPanel world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} tab="situation" onTab={()=>{}}/>}
      {modal==='diplomacy'&&<DiplomacyPanel key={diplomacyTarget+'|'+diplomacyInitialTab} world={game.world} selected={diplomacyTarget} initialTab={diplomacyInitialTab} onSelect={id=>openDiplomacy(id)} onCourt={id=>id===playerRealm(game.world!)?openCourt():openForeignCourt(id)} onPerson={id=>openPerson(id)} pending={game.pending} send={command=>game.send({type:'command',command})}/>}
      {modal==='menu'&&<div className="game-menu-actions"><button className="primary" onClick={closePanel}>返回游戏</button><button onClick={()=>openModal('saves',true)}>保存／读取／导出</button><button disabled={game.pending} onClick={()=>game.send({type:'menu'})}>保存并返回主菜单</button><button onClick={()=>openModal('about',true)}>玩法与说明</button><p>关闭菜单后保持暂停，可使用顶部时间控制继续。本地保存失败时会留在当前游戏，可导出文件备份。</p></div>}
      {modal==='saves'&&<><p className="modal-description">{accountSaves?'存档保存在当前登录账号下。导出文件可用于备份或迁移；读取与导入前会保留当前进度。':'存档保存在此浏览器中。导出文件可用于备份或迁移；读取与导入前会保留当前进度。'}</p><div className="save-actions"><button className="primary" disabled={!person} onClick={()=>game.send({type:'save'})}>保存当前行程</button><button disabled={!person} onClick={()=>game.send({type:'export'})}>导出文件</button><button disabled={!person} onClick={()=>upload.current?.click()}>导入文件</button><input ref={upload} type="file" accept=".json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>2_000_000){game.notify('存档超过 2 MB，无法导入。',true);return;}try{game.send({type:'import',text:await file.text()});}catch{game.notify('读取文件失败。',true);}}}/></div><div className="save-list">{!game.slots.length?<p className="empty-state">暂无存档。现在保存，为这段旅途留下一页行记。</p>:game.slots.map(slot=><div className="save-row" key={slot.id}><div><strong>{saveLabel(slot.id)}{slot.characterName?' · '+slot.characterName:''}</strong><span>{slot.mode==='sandbox'?'历史沙盒':'原有玩法'} · {scriptLabel(slot.scriptId)} · {dateLabel(slot.day,slot.scriptId)} · {new Date(slot.savedAt).toLocaleString('zh-CN')}</span></div><div className="save-row-actions"><button disabled={game.pending} onClick={()=>game.send({type:'load',slot:slot.id})}>恢复</button><button disabled={game.pending} className="danger" onClick={()=>setDeleteSlot(slot.id)}>删除</button></div></div>)}</div><p className="small-note">自动保存：出发、补给、每十个游戏日及抵达时。保留三份轮换自动行记和一份手动行记。</p></>}
      {modal==='directory'&&<><DetailTabs label="查找对象" value={searchTab} onChange={setSearchTab} items={[{id:'people',label:'人物',icon:'person'},{id:'places',label:'城邑',icon:'city'}]}/>{searchTab==='people'?<CharacterDirectory world={game.world} onPerson={id=>openPerson(id)}/>:<><input className="search" aria-label="搜索地点" placeholder="查找城邑，如建康、长安、敦煌…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="directory-filters realm-flags"><button className={'realm-filter-all '+(filter==='all'?'active':'')} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>全部</button>{(Object.keys(polities) as Polity[]).map(id=><span className="realm-filter-choice" key={id}><RealmBadge realm={id}/><button aria-label={"筛选"+regimeName(game.world??undefined,id)} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{filter===id?"✓":"筛选"}</button></span>)}</div><div className="directory-list">{sites.filter(s=>(s.name+administrationPath(s.id)).includes(query)&&(filter==='all'||(game.world?.realm?.cities[s.id]?.controller??s.polity)===filter)).map(s=><article className="place-directory-entry" key={s.id}><button onClick={()=>{chooseCity(s.id,true);setModal(null);focus('selected');}}><span><i style={{background:polities[s.polity].color}}/><strong>{s.name}</strong><small>{s.rank==='county'?'县治':s.capital?'都城':'主要城市'}</small></span><Icon name="arrow" size={15}/></button><RealmBadge realm={game.world?.realm?.cities[s.id]?.controller??s.polity}/></article>)}{!sites.some(s=>(s.name+administrationPath(s.id)).includes(query)&&(filter==='all'||(game.world?.realm?.cities[s.id]?.controller??s.polity)===filter))&&<p className="empty-state">未找到匹配地点。</p>}</div></>}</>}
      {modal==='about'&&<div className="about-content"><h3>此身与天下</h3><p>在城市或辖区详情中查找驻留人物，点击查看家族、官职与关系；在途人物可直接在地图上点选。在人物页选择互动、经营世业，或前往朝廷处理政务。时间暂停时可以从容安排事务，再推进日期等待结果。</p><h3>行旅与营建</h3><p>点击城邑进行营建或规划行程，启程前备足行粮。地图上的家族庄园标记可直接进入营建。</p><h3>舆图</h3><p>自然地理采用现代高程与水系。行政区划按剧本收录范围显示；城域示意不等同于精确历史县界。完整疆域以已收录的边界及沿革为准。</p><h3>保存旅途</h3><p>切换到后台自动暂停。{accountSaves?'存档保存在当前登录账号下，注销账号会删除存档。你也可以导出文件留作备份。':'存档保存在当前浏览器，定期导出可防止清理浏览器数据后丢失进度。'}</p><a href={import.meta.env.BASE_URL+'THIRD_PARTY_NOTICES.md'} target="_blank" rel="noreferrer">数据来源与许可 ↗</a></div>}
      {modal==='map-person'&&<MapPersonPanel key={mapPeople.join('|')} world={game.world} ids={mapPeople} tab={personTab} onTab={setPersonTab} pending={game.pending} send={command=>game.send({type:'command',command})} onSelect={id=>{setMapPeople(items=>[id,...items.filter(p=>p!==id)]);setPersonTab('overview');}} onPerson={id=>openPerson(id)} onDiplomacy={r=>openDiplomacy(r)} onEconomy={()=>openModal('wealth',true)} onCourtPerson={id=>openCourt('person',id)} onStaff={id=>openRetinue(id,true)} onEstate={()=>openModal('estate',true)} onLocate={()=>focus('player')} onCity={id=>chooseCity(id,true)}/>}
      {modal==='realm'&&game.world&&<RealmPanel onCourt={tab=>openCourt(tab??'central')} serviceFocus={serviceFocus} tab={realmTab} onTab={next=>{if(next==='duties')setServiceFocus(v=>({seq:v.seq+1}));setRealmTab(next);}} onPerson={id=>openPerson(id)} onTerritory={id=>{chooseTerritory(id,true);setCityTab('governance');}} world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onCity={id=>{chooseCity(id,true);setCityTab('governance');setModal(null);setCameraAction(a=>({type:'selected',seq:a.seq+1}));}}/>}

      {modal==='estate'&&game.world&&<ConstructionPanel world={game.world} scope="estate" site={game.world.holdings.estate.location} send={command=>game.send({type:'command',command})}/>}
      {modal==='retinue'&&game.world&&<RetinueChamber world={game.world} host={retinueHost||game.world.characterId!} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onFind={()=>{setSearchTab('people');openModal('directory',true);}} onInteract={id=>{openPerson(id);setPersonTab('interaction');}}/>}
      {modal==='staff'&&game.world&&(staffRealm===playerRealm(game.world)?<StaffChamber world={game.world} tab={staffTab} onTab={setStaffTab} region={staffRegion} onRegion={setStaffRegion} person={staffPerson||game.world.characterId!} financeView={financeFocus} treasuryTab={treasuryTab} onService={()=>{setServiceFocus(v=>({seq:v.seq+1}));setRealmTab('duties');openModal('realm',true);}} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onTerritory={id=>{chooseTerritory(id,true);setCityTab(territoryNodes[id]?.level==='county'?'governance':'offices');}}/>:<ForeignCourtChamber world={game.world} realm={staffRealm} onPerson={id=>openPerson(id)}/>)}
    </section></div>}
    </div>


    {pauseDialog}
    {modal==='saves'&&deleteSlot&&<ConfirmAction title={'删除「'+saveLabel(deleteSlot)+'」？'} detail='此操作无法撤销，当前游玩进度不会被删除。' confirmLabel='确认删除' danger pending={game.pending} onCancel={()=>setDeleteSlot(null)} onConfirm={()=>{if(game.pending)return;game.send({type:'delete-save',slot:deleteSlot});setDeleteSlot(null);}}/>}
    {game.notice&&<div className={`toast ${game.notice.error?'is-error':''}`} role={game.notice.error?'alert':'status'}><span>{game.notice.text}</span><button aria-label="关闭提示" onClick={game.dismiss}><Icon name="close" size={16}/></button></div>}

  </main></AudienceDeferContext.Provider></RealmNavigation.Provider>;
}

import {EstateWorkshop} from './EstateWorkshop';
import {ownedEstates,estateById} from '../core/estates';
import './territoryWindow.css';
import {CourtIcon} from './CourtIcon';
import {CampaignMinimap} from './CampaignMinimap';
import type {ThreeCampaignMap} from '../map/three/ThreeCampaignMap';
import type {CameraAction} from '../map/atlasPresentation';
import {IntriguePanel} from './IntriguePanel';
import {WarDetailsDialog,EngagementDialog} from './WarDetails';
import type {EngagementRef} from './warPresentation';
import {worldRealms} from '../core/polityRuntime';
import {PersonalEconomyPanel} from './PersonalEconomyPanel';
import {MilitaryHub} from './MilitaryHub';
import {ArmyDock,type ArmyMove} from './ArmyDock';
import {TerritoryNavigation} from './TerritoryNavigation';
import {LocalTerritoryPanel} from './LocalAdministration';
import {RealmNavigation,RealmBadge} from './RealmBadge';
import {estateName} from '../core/construction';
import {OngoingFlags} from './OngoingFlags';
import {LifestyleDialog} from './LifestylePanel';
import {lifestylePerson} from '../core/lifestyle';
import type {LifestyleBranch} from '../data/lifestyles';
import {SaveBrowser} from './SaveBrowser';
import type {OngoingItem,PersonLifeEntry} from '../core/ongoing';
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
import {playerCommandsArmy} from '../core/civilWars';
import './gameBrand.css';
const accountSaves=import.meta.env.BASE_URL.startsWith('/games/fengyun-nanbeichao/');
import { StaffChamber,RetinueChamber,type CourtTab } from './StaffChamber';
import {courtOf,courtMonthPreview} from '../core/court';
import {phases} from '../data/court';
import { regimeName } from '../core/government';
import { MapPersonPanel,type PersonTab } from './MapPersonPanel';
import {PersonDialog} from './PersonDialog';
import {allegianceRealm} from '../core/officeEligibility';
import {DetailTabs} from './DetailTabs';
import {DrawerHeader} from './DrawerHeader';
import {TimeControl} from './TimeControl';
import {MapCameraControls,MapDisplayControls} from './MapCommandControls';
import {PlayerHud} from './PlayerHud';
import { ArtIcon } from './ArtIcon';
import { RealmPanel,type RealmTab } from './RealmPanel';
import { CharacterDirectory } from './CharacterDirectory';
import { GameEntry,RunOutcome,CampaignTracker } from './GameEntry';
import { HierarchyExplorer } from './HierarchyExplorer';
import { territoryNodes,descendantSites,nodeForSite,controlEvents,type TerritoryLevel } from '../data/territorialHierarchy';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { polities, siteById, sites } from '../data/scenario';
import { dateLabel } from '../core/world';
import { WorldMap, type MapMode } from '../map/WorldMap';
import { LocationDevelopment,type CityTab } from './Development';
import { administrationPath } from '../data/administration';
import { provisionCost } from '../core/construction';
import { roadNeighbors } from '../map/territories';
import { useGame } from './useGame';
import './interaction.css';
import './detailPanels.css';
import './mapHud.css';
import './drawerFrame.css';
import './ceremonialModalTitle.css';
import './campaignControls.css';
import './campaignSkin.css';
import './campaignReference.css';
import './mapCommandCompact.css';
import './campaignMinimap.css';
import './courtIcons.css';
import './armyFormation.css';
import './dialogContrast.css';
import './detailActions.css';

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
  const [campaignMap,setCampaignMap]=useState<ThreeCampaignMap|null>(null);
  const [sceneryDetail,setSceneryDetail]=useState(true);
  const [militaryModels,setMilitaryModels]=useState(true),[armyMotion,setArmyMotion]=useState(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [armyMove,setArmyMove]=useState<ArmyMove>(null);
  const [selectedArmies,setSelectedArmies]=useState<number[]>([]);
  const [armyOrderError,setArmyOrderError]=useState('');
  const [armyFocus,setArmyFocus]=useState<{army:number;seq:number;tab?:'campaign'}>({army:0,seq:0});
  const [selected,setSelected]=useState('jiankang'),[mode,setMode]=useState<MapMode>('political'),[showTravelers,setShowTravelers]=useState(true),[tilted,setTilted]=useState(true);
  const [estateId,setEstateId]=useState<string|undefined>();
  const [modal,setModal]=useState<'intrigue'|'military'|'wealth'|'diplomacy'|'saves'|'directory'|'about'|'estate'|'staff'|'retinue'|'menu'|'realm'|'map-person'|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [warDetail,setWarDetail]=useState<number|null>(null),[engagement,setEngagement]=useState<EngagementRef|null>(null);
  const [intrigueTarget,setIntrigueTarget]=useState('');
  const [lifestyleOpen,setLifestyleOpen]=useState<{branch?:LifestyleBranch}|null>(null);
  const [searchTab,setSearchTab]=useState<'people'|'places'>('people');
  const [cameraAction,setCameraAction]=useState<{type:CameraAction;seq:number}>({type:'home',seq:0});
  const [journalOpen,setJournalOpen]=useState(false),[journalScope,setJournalScope]=useState<'all'|'player'>('all');
  const [territory,setTerritory]=useState('realm:liang'),[level,setLevel]=useState<TerritoryLevel>('realm'),[historyEvent,setHistoryEvent]=useState<string|null>(null);
  const [drawer,setDrawer]=useState<'character'|'place'|null>(null);
  const [diplomacyTarget,setDiplomacyTarget]=useState<RealmId>('west');
  const [diplomacyInitialTab,setDiplomacyInitialTab]=useState<'relations'|'clans'>('relations');
  const [personTab,setPersonTab]=useState<PersonTab>('overview');
  const [personLifeEntry,setPersonLifeEntry]=useState<PersonLifeEntry|null>(null);
  const [realmTab,setRealmTab]=useState<RealmTab>('overview'),[financeFocus,setFinanceFocus]=useState<'treasury'|'audit'>('treasury');
  const [staffRealm,setStaffRealm]=useState<RealmId>('liang'),[staffTab,setStaffTab]=useState<CourtTab>('central'),[staffRegion,setStaffRegion]=useState(''),[staffPerson,setStaffPerson]=useState(''),[treasuryTab,setTreasuryTab]=useState<'budget'|'requests'|'ledger'>('budget'),[retinueHost,setRetinueHost]=useState('');
  const [panelTrail,setPanelTrail]=useState<{modal:typeof modal;drawer:typeof drawer;mapPeople:string[];personTab:PersonTab;diplomacyTarget:RealmId;staffRealm:RealmId;staffTab:CourtTab;staffRegion:string;staffPerson:string;treasuryTab:'budget'|'requests'|'ledger';selected:string;territory:string;level:TerritoryLevel;cityTab:CityTab;realmTab:RealmTab;financeFocus:'treasury'|'audit'}[]>([]);
  const [serviceFocus,setServiceFocus]=useState<{id?:number;site?:string;seq:number;view?:'duties'}>({seq:0});
  const [mapOptions,setMapOptions]=useState(false);
  const panelOpener=useRef<HTMLElement|null>(null);
  const capturePanelOpener=()=>{if(!modal&&!drawer&&document.activeElement instanceof HTMLElement)panelOpener.current=document.activeElement;};
  const restorePanelFocus=()=>requestAnimationFrame(()=>{if(panelOpener.current?.isConnected)panelOpener.current.focus({preventScroll:true});});
  const [cityTab,setCityTab]=useState<CityTab>('build');
  const [mapPeople,setMapPeople]=useState<string[]>([]);
  const placePanel=useRef<HTMLElement>(null),placeScroll=useRef<Record<string,number>>({});
  useLayoutEffect(()=>{const node=placePanel.current?.querySelector<HTMLElement>('.territory-page-content')??placePanel.current;if(node)node.scrollTop=placeScroll.current[territory+'|'+cityTab]??0;},[territory,cityTab,drawer,modal]);
  useEffect(()=>{if(game.page==='play'&&game.world&&(!game.world.campaign||game.world.campaign.status==='active'))return;const reserveSpace=(e:KeyboardEvent)=>{if(e.code!=='Space'||e.isComposing||e.target instanceof Element&&e.target.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]'))return;e.preventDefault();e.stopImmediatePropagation();};window.addEventListener('keydown',reserveSpace,true);window.addEventListener('keyup',reserveSpace,true);return()=>{window.removeEventListener('keydown',reserveSpace,true);window.removeEventListener('keyup',reserveSpace,true);};},[game.page,!!game.world,game.world?.campaign?.status]);
  const person=game.world?.people[0];
  const plan=useMemo(()=>person&&!person.journey&&game.world?personalRoute(game.world,selected):null,[person,selected,game.world]);
  const site=siteById[selected];
  const focus=(type:typeof cameraAction.type)=>setCameraAction(a=>({type,seq:a.seq+1}));
  const showDrawer=(kind:typeof drawer)=>{setPersonLifeEntry(null);capturePanelOpener();setModal(null);setPanelTrail([]);setMapOptions(false);if(kind==='character'){setMapPeople([game.world?.characterId??'player']);setPersonTab('overview');setModal('map-person');setDrawer(null);game.send({type:'speed',speed:0});}else setDrawer(kind);};
  const clearMapSelection=()=>{setDrawer(null);setPanelTrail([]);setHistoryEvent(null);restorePanelFocus();};
  const closePanel=()=>{setPersonLifeEntry(null);setModal(null);setPanelTrail([]);restorePanelFocus();};
  const backPanel=()=>{const previous=panelTrail.at(-1);if(!previous)return;setPersonLifeEntry(null);setModal(previous.modal);setDrawer(previous.drawer);setMapPeople(previous.mapPeople);setPersonTab(previous.personTab);setDiplomacyTarget(previous.diplomacyTarget);setStaffRealm(previous.staffRealm);setStaffTab(previous.staffTab);setStaffRegion(previous.staffRegion);setStaffPerson(previous.staffPerson);setTreasuryTab(previous.treasuryTab);setSelected(previous.selected);setTerritory(previous.territory);setLevel(previous.level);setCityTab(previous.cityTab);setRealmTab(previous.realmTab);setFinanceFocus(previous.financeFocus);setPanelTrail(items=>items.slice(0,-1));};
  const chooseTerritory=(id:string,nested=false)=>{if(armyMove){const sites=descendantSites(id);const site=sites.length===1?sites[0]:undefined;if(site)setArmyMove({...armyMove,site});return;}let node=territoryNodes[id];if(!node)return;if(node.level==='county'){id='city:'+descendantSites(id)[0];node=territoryNodes[id];}if(nested||drawer==='place'&&!modal){if(nested||id!==territory)setPanelTrail(items=>[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget,staffRealm,staffTab,staffRegion,staffPerson,treasuryTab,selected,territory,level,cityTab,realmTab,financeFocus}]);if(nested){setModal(null);setDrawer('place');setMapOptions(false);}}else{showDrawer('place');setCityTab(game.world?.realm?'build':'history');}setTerritory(id);setLevel(node.level);const city=descendantSites(id)[0];if(city)setSelected(city);setMode('domains');setCameraAction(a=>({type:'selected',seq:a.seq+1}));};
  useEffect(()=>{const available=new Set(game.world?.realm?.armies.filter(a=>playerCommandsArmy(game.world!,a)).map(a=>a.id)??[]);setSelectedArmies(ids=>{const next=ids.filter(id=>available.has(id));return next.length===ids.length?ids:next;});if(armyMove&&!armyMove.armies.every(id=>available.has(id)))setArmyMove(null);},[armyMove,game.world]);
  const selectArmy=(id:number,extend:boolean)=>{setSelectedArmies(ids=>extend?(ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]):[id]);setArmyMove(null);setArmyOrderError('');};
  const commandArmyTo=(site:string)=>{if(!game.world||!selectedArmies.length)return false;const order=selectedArmies.length===1?{type:'realm',action:'march',army:selectedArmies[0],site} as const:{type:'armyBatch',action:'march',armies:selectedArmies,site} as const;const reason=order.type==='realm'?realmReason(game.world,order):armyBatchReason(game.world,order);if(game.pending||reason){setArmyOrderError(reason||'军令正在处理');return true;}game.send({type:'command',command:order});setArmyOrderError('');setArmyMove(null);return true;};
  const chooseCity=(id:string,nested=false)=>{if(armyMove){setSelected(id);setArmyMove({...armyMove,site:id});return;}if(nested||(drawer==='place'&&!modal&&territory!=='city:'+id)){setPanelTrail(items=>[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget,staffRealm,staffTab,staffRegion,staffPerson,treasuryTab,selected,territory,level,cityTab,realmTab,financeFocus}]);setModal(null);setDrawer('place');setMapOptions(false);}else if(drawer!=='place'||modal)showDrawer('place');if(drawer!=='place'||modal)setCityTab(game.world?.realm?'build':'history');setSelected(id);setTerritory('city:'+id);setLevel('city');};
  const chooseLevel=(value:TerritoryLevel)=>{chooseTerritory(nodeForSite(selected,value).id);};
  const chooseEvent=(id:string|null)=>{setHistoryEvent(id);game.send({type:'speed',speed:0});if(id){const event=controlEvents.find(e=>e.id===id)!;chooseCity(event.site);focus('selected');}};
  const openModal=(kind:typeof modal,nested=false)=>{if(kind==='map-person')setPersonLifeEntry(null);capturePanelOpener();setMapOptions(false);game.send({type:'speed',speed:0});setPanelTrail(items=>nested?[...items,{modal,drawer,mapPeople,personTab,diplomacyTarget,staffRealm,staffTab,staffRegion,staffPerson,treasuryTab,selected,territory,level,cityTab,realmTab,financeFocus}]:[]);if(kind!=='estate')setDrawer(null);setModal(kind);};
  const openCourt=(tab:CourtTab='central',personId=game.world?.characterId??'',nested=true,financeTab:'budget'|'requests'|'ledger'='budget',view:'treasury'|'audit'='treasury')=>{setStaffRealm(playerRealm(game.world!));setStaffTab(tab);setStaffPerson(personId);setTreasuryTab(financeTab);setFinanceFocus(view);openModal('staff',nested);};
  const openForeignCourt=(realm:RealmId)=>{setStaffRealm(realm);setStaffTab('central');openModal('staff',true);};
  const openRetinue=(host=game.world?.characterId??'',nested=true)=>{setRetinueHost(host);openModal('retinue',nested);};
  const openPerson=(id:string,nested=true)=>{openModal('map-person',nested);setMapPeople([id]);setPersonTab('overview');};
  const openDiplomacy=(r:RealmId,nested=true,initialTab:'relations'|'clans'='relations')=>{openModal('diplomacy',nested);setDiplomacyTarget(r);setDiplomacyInitialTab(initialTab);};
  const openEstate=(id?:string,nested=false)=>{setEstateId(id??ownedEstates(game.world!)[0]?.id??game.world!.holdings.estate.id);openModal('estate',nested);};
  const timeLocked=game.pauses.length>0||!!lifestyleOpen||modal==='estate'||modal==='staff'||modal==='retinue'||modal==='menu'||modal==='saves';
  const disabledReason=!person?'世界载入中':person.journey?'正在途中':selected===person.location?'此刻所在之地':!plan?(game.world?travelDiplomacyReason(game.world,selected):'')||'暂无可用路线':person.food<plan.food?'行粮不足，请先整备':'';
  const courtTrend=game.world?.realm&&courtOf(game.world)?courtMonthPreview(game.world,playerRealm(game.world)):null;
  const allEvents=game.world?.chronicle.filter(e=>journalScope==='all'||e.person==='player').slice().reverse()??[];

  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key!=='Escape'||event.defaultPrevented||game.pauses.length||document.querySelector('dialog[open]'))return;if(mapOptions){setMapOptions(false);document.getElementById('atlas-display-toggle')?.focus();}else if(modal){if(panelTrail.length)backPanel();else closePanel();}else if(drawer){if(panelTrail.length)backPanel();else clearMapSelection()}else setJournalOpen(false);};window.addEventListener('keydown',escape);return ()=>window.removeEventListener('keydown',escape);},[modal,mapOptions,drawer,panelTrail,game.pauses.length]);

  useEffect(()=>{setLifestyleOpen(null);setWarDetail(null);setEngagement(null);placeScroll.current={};setArmyMove(null);setSelectedArmies([]);setServiceFocus({seq:0});setStaffTab('central');setStaffRegion('');setModal(null);setDrawer(null);setPanelTrail([]);setJournalOpen(false);setMapOptions(false);if(game.world){const home=game.world.people[0].location;setSelected(home);setTerritory('city:'+home);setLevel('city');setHistoryEvent(null);setCameraAction(a=>({type:'player',seq:a.seq+1}));}},[game.entry]);

  if(game.blocked)return <main className="blocking"><div className="brand-seal">风云</div><h1>山河暂歇</h1><p>{game.blocked}</p><button className="primary" onClick={()=>location.reload()}>重新载入</button></main>;
  const navigatePause=(event:PauseEvent)=>{
    game.dismissPause();game.dismiss();
    if(event.id.startsWith('unrest:')&&event.site){chooseCity(event.site);setCityTab('governance');focus('selected');}
    else if(event.kind==='arrival'||event.kind==='journey'){if(event.site){chooseCity(event.site);focus('selected');}}
    else if(event.kind==='economy')openCourt('finance',undefined,false,'budget','audit');
    else if(event.kind==='mobility')openPerson(game.world!.characterId!,false);
    else if(event.kind==='custody'||event.kind==='health'||event.kind==='inheritance')openPerson(event.person??game.world!.characterId!,false);
    else if(event.kind==='retinue')openRetinue(undefined,false);
    else if(event.kind==='intrigue'){setIntrigueTarget(event.person??'');openModal('intrigue');}
    else if(event.kind==='power')openCourt('factions',undefined,false);
    else if(event.kind==='court'||event.kind==='situation')openCourt('situation',undefined,false);
    else if(event.kind==='local')openCourt('local',undefined,false);
    else if(event.kind==='fiscal')openCourt('finance',undefined,false,'requests');
    else if(event.kind==='clan')openDiplomacy(playerRealm(game.world!),false,'clans');
    else if(event.kind==='service'){setServiceFocus(v=>({id:event.assignmentId,seq:v.seq+1}));openModal('realm',true);setRealmTab(event.assignmentId?'duties':'council');}
    else if(event.kind==='duties'){setServiceFocus(v=>({seq:v.seq+1,view:'duties'}));openModal('realm',true);setRealmTab('duties');}
    else if(event.kind==='military'){openModal('military');}
    else if(event.kind==='realm'){openModal('realm');}
    else if(event.kind==='diplomacy')openDiplomacy(playerRealm(game.world!),false);
  };
  const openOngoing=(item:OngoingItem)=>{
    if(item.id.startsWith('army:')){setArmyMove(null);setModal(null);setArmyFocus(v=>({army:Number(item.id.slice(5)),seq:v.seq+1}));return;}
    if(item.id.startsWith('campaign:')){const q=game.world?.militaryCampaigns?.items.find(q=>q.id===Number(item.id.slice(9)));if(q){setArmyMove(null);setModal(null);setArmyFocus(v=>({army:q.army,seq:v.seq+1,tab:'campaign'}));return;}}
    const target=item.target;
    if(target.page==='lifestyle'){game.send({type:'speed',speed:0});setMapOptions(false);setLifestyleOpen({branch:target.branch});}
    else if(target.page==='intrigue'){setIntrigueTarget('');openModal('intrigue');}
    else if(target.page==='city'){chooseCity(target.site);setCityTab(target.tab);focus('selected');}
    else if(target.page==='person'){if(target.tab==='economy'&&target.person===game.world!.characterId)openModal('wealth');else{openPerson(target.person,false);setPersonTab(target.tab&&target.tab!=='economy'?target.tab:target.person===game.world!.characterId?'overview':'interaction');if(target.action)setPersonLifeEntry({person:target.person,action:target.action});}}
    else if(target.page==='territory')chooseTerritory(target.territory);
    else if(target.page==='retinue')openRetinue(undefined,false);
    else if(target.page==='estate')openEstate(target.estate);
    else if(target.page==='court'){openCourt('situation',undefined,false);}
    else if(target.page==='diplomacy')openDiplomacy(target.realm,false);
    else if(target.page==='treasury'||target.page==='audit')openCourt('finance',undefined,false,target.page==='treasury'?'requests':'budget',target.page==='audit'?'audit':'treasury');
    else if(target.page==='government')openCourt('government',undefined,false);
    else if(target.page==='politics')openCourt('factions',undefined,false);
    else {setRealmTab(target.page==='service'&&!target.id&&item.kind==='petition'?'council':'duties');if(target.page==='service'||target.page==='duties')setServiceFocus(v=>({id:target.page==='service'?target.id:undefined,seq:v.seq+1,view:target.page==='duties'?'duties':undefined}));openModal('realm');}
  };
  const pauseDialog=game.world&&game.pauses[0]?<PauseDialog key={game.pauses[0].id} event={game.pauses[0]} count={game.pauses.length} world={game.world} pending={game.pending} error={game.notice?.error?game.notice.text:undefined} onClose={game.dismissPause} onNavigate={navigatePause} send={command=>{game.dismiss();game.send({type:'command',command});}}/>:null;
  if(!game.world||game.page==='menu')return <GameEntry world={game.world} slots={game.slots} pending={game.pending} notice={game.notice} send={game.send} notify={game.notify}/>;
  if(game.world.campaign&&game.world.campaign.status!=='active')return <><RunOutcome world={game.world} pending={game.pending} notice={game.notice} send={game.send}/>{pauseDialog}</>;
  const deferAudience=modal?closePanel:drawer?()=>{setDrawer(null);setPanelTrail([]);}:null;
  return <RealmNavigation.Provider value={{world:game.world,open:r=>{if(game.pauses.length){game.dismissPause();game.dismiss();}if(modal==='diplomacy'&&diplomacyTarget===r)return;openDiplomacy(r);}}}><AudienceDeferContext.Provider value={deferAudience}><main className="game-shell focused-shell">
    <header className="topbar">
      <PlayerHud world={game.world} onPerson={()=>openPerson(game.world!.characterId??'player',false)}/><OngoingFlags onWar={id=>{game.send({type:'speed',speed:0});setWarDetail(id);}} key={'ongoing:'+game.entry} world={game.world} onOpen={openOngoing} onBrowse={()=>game.send({type:'speed',speed:0})}/><TimeControl date={dateLabel(game.world.day,game.world.scriptId)} day={game.world.day} speed={game.speed} locked={!person||timeLocked} lockReason={game.pauses.length?'待处理事件':lifestyleOpen?'选择生活重心中':modal==='estate'?'庄园窗口已暂停':modal==='staff'?'安排职官中':modal==='retinue'?'安排幕僚中':modal==='saves'?'管理存档中':'菜单已暂停'} onSpeed={speed=>game.send({type:'speed',speed})} onStep={()=>game.send({type:'step'})} onSave={()=>openModal('saves')} onMenu={()=>openModal('menu')}/>

      <ArmyDock focus={armyFocus} key={'armies:'+game.entry} world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onLocate={id=>{setSelected(id);setCameraAction(a=>({type:'selected',seq:a.seq+1}));}} selectedArmies={selectedArmies} onSelectArmy={selectArmy} onClearSelection={()=>setSelectedArmies([])} move={armyMove} onMove={value=>{setArmyMove(value);if(value){setLevel('city');setDrawer(null);setModal(null);}}}/>
    </header>

    <div className={`game-body ${drawer==='character'?'character-open':''} ${drawer==='place'?'place-open':''} ${modal&&modal!=='map-person'&&modal!=='estate'&&modal!=='staff'&&modal!=='retinue'?'utility-open':''}`}>
      <nav className="command-rail" aria-label="主要功能">{game.world.realm&&<button aria-expanded={modal==='realm'} onClick={()=>{setRealmTab('overview');setFinanceFocus('treasury');openModal('realm');}}><span className="rail-emblem"><ArtIcon name="influence"/></span><span>政务{game.world.realm.event?' · !':''}</span></button>}{game.world.realm&&<button aria-expanded={modal==='diplomacy'} onClick={()=>openDiplomacy(playerRealm(game.world!),false)}><span className="rail-emblem"><ArtIcon name="gregarious"/></span><span>外交{game.world.diplomacy?.missions.some(m=>m.status==='audience')?' · !':''}</span></button>}{game.world.realm&&<button aria-expanded={modal==='military'} onClick={()=>openModal('military')}><span className="rail-emblem"><ArtIcon name="army"/></span><span>军事</span></button>}{game.world.realm&&<button aria-expanded={modal==='intrigue'} onClick={()=>{setIntrigueTarget('');openModal('intrigue');}}><span className="rail-emblem"><ArtIcon name="wary"/></span><span>谋略</span></button>}{game.world.realm&&<button aria-expanded={modal==='wealth'} onClick={()=>openModal('wealth')}><span className="rail-emblem"><ArtIcon name="coins"/></span><span>经济</span></button>}<button aria-expanded={modal==='directory'} onClick={()=>openModal('directory')}><span className="rail-emblem"><ArtIcon name="world"/></span><span>查找</span></button><button aria-expanded={journalOpen} onClick={()=>setJournalOpen(v=>!v)}><span className="rail-emblem"><Icon name="menu"/></span><span>纪事</span></button></nav>

      {warDetail!==null&&<WarDetailsDialog world={game.world} warId={warDetail} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>{setWarDetail(null);openPerson(id);}} onClose={()=>setWarDetail(null)}/>}
      {engagement&&<EngagementDialog onPerson={id=>openPerson(id)} world={game.world} selected={engagement} onClose={()=>setEngagement(null)} onWar={id=>{setEngagement(null);setWarDetail(id);}}/>}
      <section className={`map-stage ${journalOpen?'journal-expanded':''}`} aria-label="战略地图">
        {game.world&&<WorldMap speed={game.speed} onMapReady={setCampaignMap} onEngagement={selected=>{game.send({type:'speed',speed:0});setEngagement(selected);}} militaryModels={militaryModels} armyMotion={armyMotion} sceneryDetail={sceneryDetail} onActivity={openOngoing} onBrowseActivities={()=>game.send({type:'speed',speed:0})} onEstate={openEstate} world={game.world} selected={selected} selectionActive={drawer==='place'} onClearSelection={clearMapSelection} selectedArmies={selectedArmies} onSelectArmy={selectArmy} onCommandArmy={commandArmyTo} route={drawer==='place'&&cityTab==='travel'?plan?.route??[]:[]} mode={mode} showTravelers={showTravelers} tilted={tilted} cameraAction={cameraAction} territory={territory} territoryLevel={level} historyEvent={historyEvent} onDiplomacy={r=>openDiplomacy(r,false)} onInspectPeople={ids=>{openModal('map-person');setMapPeople(ids);setPersonTab('overview');}} onSelectTerritory={chooseTerritory} onSelect={chooseCity} onPreviewRoute={id=>{chooseCity(id);setCityTab('travel');setMode('roads');}}/>}
        {game.world.campaign&&game.world.mode!=='sandbox'&&<CampaignTracker world={game.world} send={game.send} onCity={id=>{chooseCity(id);setCityTab(game.world?.characterId||game.world?.campaign?.appointed&&id==='jingkou'?'build':'travel');focus('selected');}} onEstate={openEstate} onRealm={()=>openModal('realm')}/>}
        <div className="map-command-dock campaign-navigation"><CampaignMinimap map={campaignMap} world={game.world} selected={drawer==='place'?selected:''}/><div className="map-navigation-row">{armyOrderError&&<span className="map-army-order-error" role="status">{armyOrderError}</span>}        {game.world.realm&&courtOf(game.world)&&<button className="court-map-button" data-phase={courtOf(game.world)!.phase} aria-label={'朝廷与朝局 · '+phases[courtOf(game.world)!.phase].name} aria-expanded={modal==='staff'} onClick={()=>openCourt('central',undefined,false)}><CourtIcon size={42}/><span className="court-map-phase" aria-hidden="true"><CourtIcon name={courtOf(game.world)!.phase} size={25}/></span><span className="court-map-caption"><strong>朝廷</strong><small>{phases[courtOf(game.world)!.phase].name}{courtTrend?.enabled&&(courtTrend.delta>0?' ↑':courtTrend.delta<0?' ↓':'')}</small></span>{(courtOf(game.world)!.petition||courtTrend?.enabled&&courtTrend.phase!==courtOf(game.world)!.phase)&&<b className="court-map-alert" aria-label="有奏议或局势变化风险">!</b>}</button>}        <MapCameraControls focus={focus}/>
</div>        <MapDisplayControls sceneryDetail={sceneryDetail} onSceneryDetail={()=>setSceneryDetail(v=>!v)} mode={mode} onMode={setMode} hasRealm={!!game.world.realm} options={mapOptions} onOptions={()=>{setMapOptions(v=>!v);if(mapOptions)document.getElementById('atlas-display-toggle')?.focus();}} travelers={showTravelers} onTravelers={()=>setShowTravelers(v=>!v)} tilted={tilted} onTilted={()=>setTilted(v=>!v)} models={militaryModels} onModels={()=>setMilitaryModels(v=>!v)} motion={armyMotion} onMotion={()=>setArmyMotion(v=>!v)}/>
</div>


        {journalOpen&&<section className={`journal ${journalOpen?'':'collapsed'}`} aria-label="行旅纪事"><div className="journal-heading"><button className="journal-title" onClick={()=>setJournalOpen(v=>!v)} aria-expanded={journalOpen}>行旅纪事 <span>{journalOpen?'收起':'展开'}</span></button>{journalOpen&&<div className="journal-filter"><button className={journalScope==='all'?'active':''} onClick={()=>setJournalScope('all')}>天下</button><button className={journalScope==='player'?'active':''} onClick={()=>setJournalScope('player')}>此身</button></div>}</div>{journalOpen&&<div className="journal-entries">{allEvents.slice(0,8).map((e,i)=><div className="journal-entry" key={`${e.day}-${e.person}-${i}`}><time>{dateLabel(e.day,game.world?.scriptId)}</time><p className={e.person==='player'?'personal':''}>{e.text.replace('起始资源与单城治理范围为玩法设定。','')}</p></div>)}</div>}</section>}
      </section>

      {drawer==='place'&&<aside ref={placePanel} onScrollCapture={e=>{const node=e.target as HTMLElement;if(node===e.currentTarget||node.classList.contains('territory-page-content'))placeScroll.current[territory+'|'+cityTab]=node.scrollTop;}} className={"place-panel panel city-detail-panel"+(territoryNodes[territory].level!=='realm'?' territory-window':'')}>{territoryNodes[territory].level==='realm'?<DrawerHeader title="辖区" onBack={panelTrail.length?backPanel:undefined} onClose={clearMapSelection} action={<button className="drawer-medallion drawer-locate" title="定位所选城市" aria-label="定位所选城市" onClick={()=>focus('selected')}><ArtIcon name="city" size={23}/></button>}/>:<div className="territory-window-chrome">{panelTrail.length>0&&<button aria-label="返回上一辖区" onClick={backPanel}>‹</button>}<button aria-label="定位所选城市" onClick={()=>focus('selected')}><ArtIcon name="city" size={22}/></button><button aria-label="关闭辖区详情" onClick={clearMapSelection}>×</button></div>}{territoryNodes[territory].level!=='realm'&&<TerritoryNavigation territory={territory} onSelect={chooseTerritory}/>} {territoryNodes[territory].level!=='city'&&(!game.world?.realm||territoryNodes[territory].level==='realm')&&<HierarchyExplorer managed={!!game.world?.realm} selected={territory} level={level} eventId={historyEvent} onSelect={chooseTerritory} onLevel={chooseLevel} onEvent={chooseEvent}/>}{game.world?.realm&&['province','prefecture'].includes(territoryNodes[territory].level)&&<LocalTerritoryPanel key={territory} tab={cityTab} onTab={setCityTab} onEstate={openEstate} world={game.world} territory={territory} pending={game.pending} send={c=>game.send({type:'command',command:c})} onPerson={openPerson} onSelect={chooseTerritory}/>} {territoryNodes[territory].level==='city'&&<>{game.world&&<LocationDevelopment key={selected} onTerritory={chooseTerritory} onDiplomacy={r=>openDiplomacy(r)} onPerson={openPerson} onRetinue={()=>openRetinue(undefined,true)} onService={()=>{setServiceFocus(v=>({seq:v.seq+1}));setRealmTab('duties');openModal('realm',true);}} pending={game.pending} world={game.world} selected={selected} onSelect={chooseCity} send={command=>game.send({type:'command',command})} tab={cityTab} onTab={setCityTab} peopleCount={residentsAt(game.world,[selected]).length} people={<PlacePeople world={game.world} sites={[selected]} onPerson={openPerson} onEstate={openEstate}/>} localTasks={<>{!!game.world.service?.tasks.some(t=>t.site===selected&&t.phase!=='closed')&&<section className="city-local-tasks"><h3><ArtIcon name="diligent" size={26}/>本城差事</h3>{game.world.service.tasks.filter(t=>t.site===selected&&t.phase!=='closed').map(t=><p key={t.id}>{assignmentTemplates[t.kind].name} · {assignmentPhases[t.phase]}</p>)}<button onClick={()=>{openModal('realm',true);setServiceFocus(v=>({seq:v.seq+1}));setRealmTab('duties');}}>查看差事簿 →</button></section>}</>} overview={<><p className="place-description">{site.description}</p>
 <section className="territory-connections"><span className="eyebrow">通往邻近城邑</span><div>{roadNeighbors(selected).map(neighbor=><button key={neighbor.id} onClick={()=>chooseCity(neighbor.id)}><ArtIcon name="city" size={24}/>{neighbor.name}<span>→</span></button>)}</div></section>
        </>} travel={<section className="route-section"><span className="eyebrow">前往此地</span>{plan?<><div className="route-metrics"><div><strong>{plan.days}</strong><span>日行程</span></div><div><strong>{plan.distance.toLocaleString()}</strong><span>公里 · 估算</span></div></div><ol className="route-stops">{plan.route.map((id,i)=><li key={id}><i/>{siteById[id].name}{i===0&&<span>出发</span>}{i===plan.route.length-1&&<span>抵达</span>}</li>)}</ol><div className="travel-cost"><span>需备行粮</span><strong>{plan.food} 日份</strong></div></>:<p className="route-empty">{person?.journey?'请先完成当前行程。':person?.location===selected?'你已身在此地。':travelDiplomacyReason(game.world!,selected)||'没有可用道路。'}</p>}<>{plan&&person&&person.food<plan.food&&<button className="provision-button" disabled={!!person.journey||person.coins<(game.world?provisionCost(game.world):12)} onClick={()=>game.send({type:'command',command:{type:'provision'}})}>补充行粮 <span>{game.world?provisionCost(game.world):12} 钱 / 30 日份行粮</span></button>}</><button className="primary travel-button" disabled={!!disabledReason} onClick={()=>{game.send({type:'command',command:{type:'travel',destination:selected}});}}>{disabledReason?'无法启程':'启程前往'}{!disabledReason&&<Icon name="arrow"/>}</button>{plan&&<p className="route-disclaimer">每日约行 40 公里；山地耗时更长。<br/>行程沿节点推进，抵达后自动暂停。</p>}</section>}/>}</>}
      {territoryNodes[territory].level==='realm'&&<PlacePeople world={game.world} sites={descendantSites(territory)} onPerson={openPerson} onEstate={openEstate}/>}</aside>}
    {modal&&modal!=='map-person'&&<div className={modal==='estate'||modal==='staff'||modal==='retinue'?'modal-backdrop':'utility-drawer-host'} onClick={modal==='estate'||modal==='staff'||modal==='retinue'?closePanel:undefined}><section key={modal} data-detail={modal} className={`modal ${modal==='estate'||modal==='staff'||modal==='retinue'?'':'left-utility-drawer'} ${modal==='realm'?'realm-modal':modal==='directory'?'directory-modal':modal==='estate'?'estate-modal estate-detail-window':modal==='staff'?'audience-modal':modal==='retinue'?'staff-modal retinue-modal':''}`} role={modal==='estate'||modal==='staff'||modal==='retinue'?'dialog':'region'} aria-modal={modal==='estate'||modal==='staff'||modal==='retinue'?true:undefined} aria-label={modal==='intrigue'?'谋略':modal==='military'?'军事':modal==='wealth'?'经济':modal==='diplomacy'?'国家外交':modal==='realm'?'政务':modal==='saves'?'行记与存档':modal==='directory'?'地点目录':modal==='estate'?'家族庄园':modal==='staff'?(staffRealm===playerRealm(game.world!)?'朝廷':regimeName(game.world,staffRealm)+'朝廷'):modal==='retinue'?'幕府':modal==='menu'?'游戏菜单':'游戏指南'} onClick={e=>e.stopPropagation()}>{(modal==='staff'||modal==='retinue')?<header><h2>{modal==='staff'?(staffRealm===playerRealm(game.world!)?'朝廷':regimeName(game.world,staffRealm)+'朝廷'):'幕府'}</h2><div className="drawer-actions">{panelTrail.length>0&&<button aria-label="返回上页" onClick={backPanel}><Icon name="arrow"/></button>}<button autoFocus aria-label="关闭窗口" onClick={closePanel}><Icon name="close"/></button></div></header>:modal==='estate'?<header><h2>{estateName((estateId?estateById(game.world,estateId):ownedEstates(game.world)[0])?.family??game.world.holdings.estate.family)}</h2><div className="drawer-actions">{panelTrail.length>0&&<button aria-label="返回上页" onClick={backPanel}><Icon name="arrow"/></button>}<button autoFocus aria-label="关闭窗口" onClick={closePanel}><Icon name="close"/></button></div></header>:<DrawerHeader title={modal==='intrigue'?'谋略':modal==='military'?'军事':modal==='wealth'?'经济':modal==='diplomacy'?'邦交':modal==='realm'?'政务':modal==='saves'?'行记':modal==='directory'?'查找':modal==='menu'?'游戏菜单':'舆图指南'} onBack={panelTrail.length?backPanel:undefined} onClose={closePanel}/>}

      {modal==='intrigue'&&<IntriguePanel key={game.entry+'|'+intrigueTarget} world={game.world} initialTarget={intrigueTarget} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onLifestyle={()=>setLifestyleOpen({branch:'intrigue'})} onPolitics={()=>openCourt('factions')} onFulfill={(promise,person)=>promise==='title'?openCourt('person',person):openCourt('situation')}/> }
      {modal==='military'&&<MilitaryHub world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onArmy={id=>{closePanel();setSelectedArmies([id]);setArmyFocus(v=>({army:id,seq:v.seq+1}));}} onCity={id=>chooseCity(id,true)} onPerson={id=>openPerson(id)} onDiplomacy={r=>openDiplomacy(r)}/>}
      {modal==='wealth'&&<PersonalEconomyPanel world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onEstate={(id?:string)=>openEstate(id,true)}/>}

      {modal==='diplomacy'&&<DiplomacyPanel key={diplomacyTarget+'|'+diplomacyInitialTab} world={game.world} selected={diplomacyTarget} initialTab={diplomacyInitialTab} onSelect={id=>openDiplomacy(id)} onCourt={id=>id===playerRealm(game.world!)?openCourt():openForeignCourt(id)} onPerson={id=>openPerson(id)} pending={game.pending} send={command=>game.send({type:'command',command})}/>}
      {modal==='menu'&&<div className="game-menu-actions"><button className="primary" onClick={closePanel}>返回游戏</button><button onClick={()=>openModal('saves',true)}>保存／读取／导出</button><button disabled={game.pending} onClick={()=>game.send({type:'menu'})}>保存并返回主菜单</button><button onClick={()=>openModal('about',true)}>玩法与说明</button><p>关闭菜单后保持暂停，可使用顶部时间控制继续。保存失败时会留在当前游戏，可导出文件备份。</p></div>}
      {modal==='saves'&&<SaveBrowser slots={game.slots} pending={game.pending} inGame send={game.send} notify={game.notify}/>}
      {modal==='directory'&&<><DetailTabs label="查找对象" value={searchTab} onChange={setSearchTab} items={[{id:'people',label:'人物',icon:'person'},{id:'places',label:'城邑',icon:'city'}]}/>{searchTab==='people'?<CharacterDirectory world={game.world} onPerson={id=>openPerson(id)}/>:<><input className="search" aria-label="搜索地点" placeholder="查找城邑，如建康、长安、敦煌…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="directory-filters realm-flags"><button className={'realm-filter-all '+(filter==='all'?'active':'')} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>全部</button>{([...worldRealms(game.world??undefined),'frontier'] as Polity[]).map(id=><span className="realm-filter-choice" key={id}><RealmBadge realm={id}/><button aria-label={"筛选"+regimeName(game.world??undefined,id)} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{filter===id?"✓":"筛选"}</button></span>)}</div><div className="directory-list">{sites.filter(s=>(s.name+administrationPath(s.id)).includes(query)&&(filter==='all'||(game.world?.realm?.cities[s.id]?.controller??s.polity)===filter)).map(s=><article className="place-directory-entry" key={s.id}><button onClick={()=>{chooseCity(s.id,true);setModal(null);focus('selected');}}><span><i style={{background:polities[s.polity].color}}/><strong>{s.name}</strong><small>{s.rank==='county'?'县治':s.capital?'都城':'主要城市'}</small></span><Icon name="arrow" size={15}/></button><RealmBadge realm={game.world?.realm?.cities[s.id]?.controller??s.polity}/></article>)}{!sites.some(s=>(s.name+administrationPath(s.id)).includes(query)&&(filter==='all'||(game.world?.realm?.cities[s.id]?.controller??s.polity)===filter))&&<p className="empty-state">未找到匹配地点。</p>}</div></>}</>}
      {modal==='about'&&<div className="about-content"><h3>此身与天下</h3><p>在城市或辖区详情中查找驻留人物，点击查看家族、官职与关系；在途人物可直接在地图上点选。在人物页选择互动、经营世业，或前往朝廷处理政务。时间暂停时可以从容安排事务，再推进日期等待结果。</p><h3>行旅与营建</h3><p>点击城邑进行营建或规划行程，启程前备足行粮。地图上的家族庄园标记可直接进入营建。</p><h3>舆图</h3><p>自然地理采用现代高程、水系与林地覆盖。城池、城外农田和村落是示意沙盘，尺寸经过夸张，不代表历史城址复原或实际经营范围；道路为游戏连接，部分河谷折线为地理示意。行政区划按剧本收录范围显示；城域示意不等同于精确历史县界。</p><h3>保存旅途</h3><p>切换到后台自动暂停。{accountSaves?'存档保存在当前登录账号下，注销账号会删除存档。你也可以导出文件留作备份。':'存档保存在当前浏览器，定期导出可防止清理浏览器数据后丢失进度。'}</p><a href={import.meta.env.BASE_URL+'THIRD_PARTY_NOTICES.md'} target="_blank" rel="noreferrer">数据来源与许可 ↗</a></div>}

      {modal==='realm'&&game.world&&<RealmPanel onCourt={tab=>openCourt(tab??'central')} serviceFocus={serviceFocus} tab={realmTab} onTab={next=>{if(next==='duties')setServiceFocus(v=>({seq:v.seq+1}));setRealmTab(next);}} onPerson={id=>openPerson(id)} onTerritory={id=>{chooseTerritory(id,true);setCityTab('governance');}} world={game.world} pending={game.pending} send={command=>game.send({type:'command',command})} onCity={id=>{chooseCity(id,true);setCityTab('governance');setModal(null);setCameraAction(a=>({type:'selected',seq:a.seq+1}));}}/>}

      {modal==='estate'&&game.world&&<EstateWorkshop world={game.world} estateId={estateId} onEstate={setEstateId} onCity={id=>chooseCity(id,true)} onPerson={id=>openPerson(id)} onMilitary={()=>openModal('military',true)} pending={game.pending} send={command=>game.send({type:'command',command})}/>}
      {modal==='retinue'&&game.world&&<RetinueChamber world={game.world} host={retinueHost||game.world.characterId!} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onFind={()=>{setSearchTab('people');openModal('directory',true);}} onInteract={id=>{openPerson(id);setPersonTab('interaction');}}/>}
      {modal==='staff'&&game.world&&<StaffChamber key={staffRealm} realm={staffRealm} world={game.world} tab={staffTab} onTab={setStaffTab} region={staffRegion} onRegion={setStaffRegion} person={staffPerson||game.world.characterId!} financeView={financeFocus} treasuryTab={treasuryTab} onService={(task,site)=>{setServiceFocus(v=>({id:task,site,seq:v.seq+1}));setRealmTab('duties');openModal('realm',true);}} pending={game.pending} send={command=>game.send({type:'command',command})} onPerson={id=>openPerson(id)} onTerritory={id=>{chooseTerritory(id,true);setCityTab(territoryNodes[id]?.level==='county'?'governance':'offices');}}/>}
    </section></div>}
    {modal==='map-person'&&<PersonDialog personKey={mapPeople[0]??''} onClose={closePanel} onBack={panelTrail.length?backPanel:undefined}><MapPersonPanel key={mapPeople.join('|')} world={game.world} ids={mapPeople} lifeEntry={personLifeEntry} tab={personTab} onTab={tab=>{setPersonLifeEntry(null);setPersonTab(tab);}} pending={game.pending} send={command=>game.send({type:'command',command})} onSelect={id=>{setPersonLifeEntry(null);setMapPeople(items=>[id,...items.filter(p=>p!==id)]);setPersonTab('overview');}} onPerson={id=>openPerson(id)} onDiplomacy={r=>openDiplomacy(r)} onEconomy={()=>openModal('wealth',true)} onCourtPerson={id=>{const realm=allegianceRealm(game.world!,id);if(realm&&realm!==playerRealm(game.world!)){setStaffRealm(realm);setStaffTab('person');setStaffPerson(id);openModal('staff',true);}else openCourt('person',id);}} onStaff={id=>openRetinue(id,true)} onEstate={(id?:string)=>openEstate(id,true)} onIntrigue={id=>{setIntrigueTarget(id);openModal('intrigue',true);}} onLocate={site=>{setSelected(site);closePanel();focus('selected');}} onCity={id=>chooseCity(id,true)}/></PersonDialog>}
    </div>


    {lifestyleOpen&&<LifestyleDialog key={game.entry+':'+lifestylePerson(game.world)} world={game.world} initialBranch={lifestyleOpen.branch} pending={game.pending} send={command=>game.send({type:'command',command})} onClose={()=>{setLifestyleOpen(null);requestAnimationFrame(()=>{if(document.activeElement===document.body)document.querySelector<HTMLButtonElement>('.player-hud-identity')?.focus();});}}/>}
    {pauseDialog}

    {game.notice&&<div className={`toast ${game.notice.error?'is-error':''}`} role={game.notice.error?'alert':'status'}><span>{game.notice.text}</span><button aria-label="关闭提示" onClick={game.dismiss}><Icon name="close" size={16}/></button></div>}

  </main></AudienceDeferContext.Provider></RealmNavigation.Provider>;
}

import type {CSSProperties} from 'react';
import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import {governmentOf,politicalName,politicalTitle} from '../core/government';
import {siteById} from '../data/scenario';
import {CharacterPortrait} from './CharacterPortrait';
import {DrawerHeader} from './DrawerHeader';

export const operationsScenes={realm:0,diplomacy:1,military:2,intrigue:3,wealth:4,directory:5,staff:6,treasury:7} as const;
export type OperationsScene=keyof typeof operationsScenes;
export function operationsArtStyle(scene:OperationsScene):CSSProperties{
 const tile=operationsScenes[scene];
 return {'--operations-art':`url("${import.meta.env.BASE_URL}art/interface/operations-scenes-wide.png")`,'--art-x':`${(tile%2)*100}%`,'--art-y':`${Math.floor(tile/2)*100/3}%`} as CSSProperties;
}
export function OperationsArt({scene,className=''}:{scene:OperationsScene;className?:string}){const tile=operationsScenes[scene];return <span aria-hidden="true" className={'operations-art '+className} style={operationsArtStyle(scene)}><svg viewBox="0 0 768 256" preserveAspectRatio="xMidYMid slice" focusable="false"><image href={import.meta.env.BASE_URL+'art/interface/operations-scenes-wide.png'} x={-(tile%2)*768} y={-Math.floor(tile/2)*256} width="1536" height="1024"/></svg></span>;}
export function OperationsHeader({world,realm,scene,title,onBack,onClose}:{world:World;realm?:RealmId;scene:string;title:string;onBack?:()=>void;onClose:()=>void}){
 if(!(scene in operationsScenes))return <DrawerHeader title={title} onBack={onBack} onClose={onClose}/>;
 const person=realm?governmentOf(world,realm)?.ruler:world.characterId;
 return <header className="operations-header" style={operationsArtStyle(scene as OperationsScene)}>
  <span className="operations-header-paint" aria-hidden="true"/>
  <OperationsArt scene={scene as OperationsScene} className="operations-header-illustration"/>
  {person&&<span className="operations-identity-portrait"><CharacterPortrait characterId={person} world={world} compact/></span>}
  <div className="operations-heading"><h2>{title}</h2><p>{person?politicalName(person,world):'山河之间'}<span>{person?politicalTitle(world,person):''}</span></p><small>{!realm&&siteById[world.people[0].location]?.name}</small></div>
  <div className="operations-window-actions">{onBack&&<button className="operations-back" aria-label="返回上一级" onClick={onBack}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18"/></svg><span>返回</span></button>}<button autoFocus aria-label="关闭窗口" onClick={onClose}>×</button></div>
 </header>;
}

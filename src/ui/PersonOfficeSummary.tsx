import type {World} from '../core/types';
import {getPerson,familyPersonOf} from '../core/personRegistry';
import {CharacterPortrait} from './CharacterPortrait';
import {RealmBadge} from './RealmBadge';
import {ArtIcon} from './ArtIcon';
import {PersonDomains} from './PersonConnections';
import type {personSheetPresentation} from './personSheetPresentation';

export function PersonOfficeSummary({world,person,model,onPerson,onCity,onOffice}:{world:World;person:string;model:ReturnType<typeof personSheetPresentation>;onPerson:(id:string)=>void;onCity:(id:string)=>void;onOffice:()=>void}){
 const boss=model.superior?.holder??(model.ruler!==person?model.ruler:undefined),bossName=boss?(getPerson(world,boss)??familyPersonOf(world,boss))?.name:undefined;
 return <>
 <section className="person-overview-group"><h3>身份与统属</h3><div className="person-allegiance-row">
  {boss&&bossName?<button type="button" className="person-overlord" onClick={()=>onPerson(boss)} aria-label={'查看'+bossName}><CharacterPortrait characterId={boss} world={world} compact/><span><small>{boss===model.ruler?'君主':'上级'}</small><strong>{bossName}</strong></span></button>:<div className="person-allegiance-status"><ArtIcon name={model.deceased?'renown':'person'} size={36}/><span>{model.deceased?'生平记载':model.office?.kind==='sovereign'?'本国君主':'无任职上级'}</span></div>}
  {model.realm&&<div className="person-allegiance-realm"><RealmBadge realm={model.realm} world={world} seal/><small>{model.office?.kind==='executive'?'掌政':model.office?.kind==='sovereign'?'统治':'效忠'}</small></div>}
 </div></section>
 {world.realm&&<section className="person-overview-group"><h3>领地与职掌</h3><button type="button" className="person-office-banner" onClick={onOffice}><span className="person-office-painting" aria-hidden="true"/><span><strong>{model.deceased?'任职档案':model.office?.kind==='city'?'地方治理':'朝廷职掌'}</strong><small>{model.deceased?'查看本局留存履历':model.offices.filter(o=>o.kind!=='honour').map(o=>o.name).join(' · ')||'暂无现任职务'}</small></span><span aria-hidden="true">›</span></button><PersonDomains world={world} person={person} onCity={onCity}/></section>}
 </>;
}

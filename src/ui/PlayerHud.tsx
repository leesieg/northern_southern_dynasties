import type {World} from '../core/types';
import {allegianceRealm} from '../core/officeEligibility';
import {governmentOf} from '../core/government';
import {personInfluence} from '../core/personalInfluence';
import {CharacterPortrait} from './CharacterPortrait';
import {Resource} from './ArtIcon';
import {siteById} from '../data/scenario';

export function PlayerHud({world,onPerson}:{world:World|null;onPerson:()=>void}){
 const person=world?.people[0];
 if(!world||!person)return null;
 const id=world.characterId,realm=id?allegianceRealm(world,id):undefined;
 return <div className="sovereign-strip">
  <button className="player-hud-identity" onClick={onPerson} aria-label={'查看当前人物 · '+person.name}>
   <CharacterPortrait characterId={id??'fictional'} world={world} name={person.name} compact/>
   <span><strong>{person.name}</strong><small>{siteById[person.location]?.name??'行旅'} · {person.journey?'在途':'驻留'}</small></span>
  </button>
  <div className="realm-resources" aria-label={person.name+'的个人资源'}>
   <Resource name="coins" value={person.coins} label="盘缠" unit="钱" caption/>
   <Resource name="grain" value={person.food} label="行粮" unit="日" caption/>
   {id&&<><Resource name="influence" value={personInfluence(world,id)} label="影响力" caption/>
   <Resource name="diligent" value={realm?governmentOf(world,realm)?.merit[id]??0:0} label="功绩" caption/>
   <Resource name="renown" value={world.families?.prestige[id]??0} label="威望" caption/><Resource name="stress" value={world.social?.stress??0} label="压力" caption/></>}
  </div>
 </div>;
}

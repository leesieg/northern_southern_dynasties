import { LayeredPortrait } from './LayeredPortrait';
import { portraitContext } from '../character/composition';
import { characterById } from '../data/characters';
import { relationshipPersonById } from '../data/relationships';
import {portraitRank} from '../character/portraitRank';
import type { World } from '../core/types';
import './paintedPortrait.css';
export function CharacterPortrait({characterId,compact=false,world,name:label}:{characterId:string;compact?:boolean;stress?:number;world?:World;name?:string}){
 const name=label??characterById[characterId]?.name??relationshipPersonById[characterId]?.name??(characterId==='fictional'?'沈行舟':'行旅之人');
 return <div className={`painted-portrait ${compact?'compact':''}`} aria-label={name+'的肖像'}><LayeredPortrait characterId={characterId} compact={compact} rank={portraitRank(characterId,world)} context={portraitContext(characterId,world)} name={name}/></div>;
}

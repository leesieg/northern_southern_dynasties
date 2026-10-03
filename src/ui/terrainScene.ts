import type {CSSProperties} from 'react';
import type {Site,World} from '../core/types';
import {siteById} from '../data/scenario';
import {getCharacter,getPerson} from '../core/personRegistry';

import {personResidence} from '../core/residence';

export const terrainImages:Record<Site['terrain'],string>={
 '平原':'plains','丘陵':'hills','山地':'mountains','河谷':'river-valley','绿洲':'oasis',
};
export function terrainSceneStyle(site:string|undefined):CSSProperties{
 const terrain=site?siteById[site]?.terrain:undefined;
 return {'--terrain-scene':terrain?`url("${import.meta.env.BASE_URL}art/terrain/${terrainImages[terrain]}.jpg")`:'none'} as CSSProperties;
}
export function personTerrainSite(world:World,person:string){
 // A genealogy-only record has no simulated residence: do not borrow the player's home.
 const known=person===world.characterId||person==='player'||person==='fictional'&&!world.characterId||world.people.some(p=>p.id===person)||world.mobility?.residences[person]||getCharacter(world,person)||getPerson(world,person);
 return known?personResidence(world,person).site:undefined;
}

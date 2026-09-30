import type {World} from './types';
import type {Army} from './realm';
import {roadEncounters} from './battlefield';
import {armiesHostile} from './civilWars';
import {readyTroops} from './armyOrganization';
export type ArmyVisualState='garrison'|'training'|'marching'|'battle'|'siege'|'retreat';
export function armyVisualState(w:World,a:Army):ArmyVisualState{
 if(a.withdrawalUntil)return 'retreat';
 if(w.militaryAftermath?.battles.some(b=>b.last===w.day&&b.ended===undefined&&(b.attackers?.includes(a.id!)||b.defenders?.includes(a.id!)||b.a===a.id||b.b===a.id))||roadEncounters(w).some(p=>p.includes(a))||w.realm?.armies.some(b=>b!==a&&!a.journey&&!b.journey&&a.location===b.location&&b.troops>=100&&armiesHostile(w,a,b)))return 'battle';
 if(a.journey)return 'marching';
 if(readyTroops(a,w.day)<a.troops)return 'training';
 if(a.siege>0)return 'siege';return 'garrison';
}

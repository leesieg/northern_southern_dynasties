import type {World} from '../core/types';
import {militaryActionReason,type MilitaryAction} from '../core/militaryAftermath';
import {armyControls} from '../core/civilWars';
import {planRoute} from '../core/world';
import {siteById} from '../data/scenario';

export function militaryOrderPreview(world:World,command:MilitaryAction){
 const army=world.realm?.armies.find(a=>a.id===command.army);
 const route=army&&siteById[command.site]?army.location===command.site?{route:[army.location],durations:[],days:0,food:0,distance:0}:planRoute(army.location,command.site,command.action==='retreat'?id=>armyControls(world,army,id):()=>true):null;
 return {reason:militaryActionReason(world,command),route,days:route?(command.action==='scout'?Math.max(1,route.days*2):route.days):null};
}

/** Destination availability is derived from the same command rules used at submission. */
export function militaryOrderTargets(world:World,army:number,action:'retreat'|'scout'){
 return Object.keys(world.realm?.cities??{}).map(site=>({site,...militaryOrderPreview(world,{type:'militaryAction',army,action,site})})).sort((a,b)=>Number(!!a.reason)-Number(!!b.reason)||(a.days??Infinity)-(b.days??Infinity));
}

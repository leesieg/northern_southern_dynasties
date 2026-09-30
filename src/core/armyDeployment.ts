import type {World,GameCommand} from './types';
import {armyDailyFood} from './realm';
export type ArmyDeploymentCommand={type:'armyDeployment';entries:{army:number;site:string}[]};
/** A group order preserves each army, commander, payer and regiment. Commit the complete draft only once. */
export function executeArmyDeployment(w:World,c:ArmyDeploymentCommand,act:(w:World,c:GameCommand)=>void){
 if(!Array.isArray(c.entries)||!c.entries.length||c.entries.length>16||new Set(c.entries.map(e=>e.army)).size!==c.entries.length)throw new Error('请选择 1 至 16 支不同的军队');
 const next=structuredClone(w),rows=[];
 for(const e of c.entries){act(next,{type:'realm',action:'march',army:e.army,site:e.site});const a=next.realm!.armies.find(a=>a.id===e.army)!;delete a.rally;const days=a.journey!.durations.reduce((n,d)=>n+d,0);rows.push({army:e.army,site:e.site,days,food:days*armyDailyFood(next,a),supply:a.supply});}
 Object.assign(w,next);return rows;
}
export function armyDeploymentQuote(w:World,c:ArmyDeploymentCommand,act:(w:World,c:GameCommand)=>void){try{return {reason:'',rows:executeArmyDeployment(structuredClone(w),c,act)};}catch(e){return {reason:e instanceof Error?e.message:'军令无法执行',rows:[]};}}

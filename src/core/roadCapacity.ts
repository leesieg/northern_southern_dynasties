import {roads,siteById} from '../data/scenario';
import type {World} from './types';
/** Design units of daily loading capacity; these are not historical road measurements. */
const capacities=new Map(roads.map(r=>[[r.from,r.to].sort().join('|'),Math.max(20,Math.floor(180/r.factor/(siteById[r.from].terrain==='山地'||siteById[r.to].terrain==='山地'?2:1)))]));
export interface RoadTraffic {day:number;used:Record<string,number>}
export function roadCapacity(from:string,to:string){return from===to?1_000_000:capacities.get([from,to].sort().join('|'))??0;}
export function loadRoad(w:World,from:string,to:string,amount:number){
 const cap=roadCapacity(from,to);if(!w.realm||!cap||amount<=0)return 0;
 if(w.realm.traffic?.day!==w.day)w.realm.traffic={day:w.day,used:{}};
 const traffic=w.realm.traffic!,key=[from,to].sort().join('|'),used=traffic.used[key]??0,n=Math.min(amount,Math.max(0,cap-used));traffic.used[key]=used+n;return n;
}
export function loadingDays(from:string,to:string,amount:number){return Math.max(0,Math.ceil(amount/Math.max(1,roadCapacity(from,to)))-1);}
export function validTraffic(w:World){const t=w.realm?.traffic;if(t===undefined)return true;if(!t||!Number.isSafeInteger(t.day)||t.day<0||t.day>w.day||!t.used||typeof t.used!=='object'||Array.isArray(t.used))return false;return Object.entries(t.used).every(([k,n])=>{const [from,to,...rest]=k.split('|');return !rest.length&&siteById[from]&&siteById[to]&&Number.isSafeInteger(n)&&n>=0&&n<=roadCapacity(from,to);});}

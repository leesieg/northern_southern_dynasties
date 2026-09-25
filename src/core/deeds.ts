import {relationshipPersonById} from '../data/relationships';
import type {World} from './types';
import type {RealmId} from './realm';

export interface Deed {source:string;person:string;realm:RealmId;day:number;amount:number;reason:string}
export interface Deeds {version:1;opening:Record<string,number>;settled:Record<string,number[]>;recent:Deed[]}
/** Existing merit is an opening balance, never invented historical achievements. */
export function ensureDeeds(w:World){
 if(!w.realm?.governments)return;
 return w.deeds??={version:1,opening:Object.fromEntries(Object.entries(w.realm.governments.realms).flatMap(([r,g])=>Object.entries(g.merit).map(([id,n])=>[r+'|'+id,n]))),settled:{},recent:[]};
}
/** Every result uses its durable source ID; repeating a settlement cannot award again. */
export function awardDeed(w:World,realm:RealmId,person:string,source:string,amount:number,reason:string){
 const g=w.realm?.governments?.realms[realm];if(!g||!Object.hasOwn(relationshipPersonById,person))return 0;
 if(!Number.isSafeInteger(amount)||Math.abs(amount)>100||!source||source.length>250)throw new Error('无效成果结算');
 const cut=source.lastIndexOf(':'),sequence=Number(source.slice(cut+1));if(cut<0||!Number.isSafeInteger(sequence)||sequence<0)throw new Error('成果须有稳定流水号');
 const s=ensureDeeds(w)!,key=realm+'|'+person+'|'+source.slice(0,cut),ranges=s.settled[key]??[];if(contains(ranges,sequence))return 0;
 const before=g.merit[person]??0,after=Math.max(0,Math.min(100,before+amount));
 s.settled[key]=insert(ranges,sequence);g.merit[person]=after;s.recent.push({source,person,realm,day:w.day,amount:after-before,reason});s.recent=s.recent.slice(-512);return after-before;
}
export function validDeeds(w:World){
 if(w.deeds===undefined)return true;
 const s=w.deeds;if(!s||s.version!==1||!s.opening||typeof s.opening!=='object'||Array.isArray(s.opening)||!s.settled||typeof s.settled!=='object'||Array.isArray(s.settled)||!Array.isArray(s.recent)||s.recent.length>512)return false;
 const validKey=(key:string)=>{const [r,id,...rest]=key.split('|');return ['liang','east','west'].includes(r)&&Object.hasOwn(relationshipPersonById,id)&&rest.length===0;};
 return Object.entries(s.opening).every(([k,n])=>validKey(k)&&Number.isSafeInteger(n)&&n>=0&&n<=100)
 &&Object.entries(s.settled).every(([k,v])=>k.length<=500&&validKey(k.split('|').slice(0,2).join('|'))&&k.split('|').length>=3&&Array.isArray(v)&&v.length%2===0&&v.every((n,i)=>Number.isSafeInteger(n)&&n>=0&&(i%2?n>=v[i-1]:i===0||n>v[i-1]+1)))
 &&s.recent.every(d=>d&&typeof d.source==='string'&&typeof d.reason==='string'&&d.reason.length<=500&&validKey(d.realm+'|'+d.person)&&Number.isSafeInteger(d.day)&&d.day>=0&&d.day<=w.day&&Number.isSafeInteger(d.amount)&&Math.abs(d.amount)<=100&&contains(s.settled[d.realm+'|'+d.person+'|'+d.source.slice(0,d.source.lastIndexOf(':'))]??[],Number(d.source.slice(d.source.lastIndexOf(':')+1))));
}

function contains(ranges:number[],n:number){for(let i=0;i<ranges.length;i+=2)if(n>=ranges[i]&&n<=ranges[i+1])return true;return false;}
function insert(ranges:number[],n:number){
 const pairs:number[][]=[];for(let i=0;i<ranges.length;i+=2)pairs.push([ranges[i],ranges[i+1]]);pairs.push([n,n]);pairs.sort((a,b)=>a[0]-b[0]);
 const result:number[]=[];for(const [lo,hi] of pairs){if(result.length&&lo<=result[result.length-1]+1)result[result.length-1]=Math.max(hi,result[result.length-1]);else result.push(lo,hi);}return result;
}

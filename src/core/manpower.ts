import type {World} from './types';
import type {Regiment} from './armyOrganization';
import {estateById,allEstates,ordinaryPopulation,actualEstatePolicy,estatePolicies,estateAccessReason,ownedEstates} from './estates';
import {authorityGrant} from './authority';
import {allegianceRealm} from './officeEligibility';
export type ManpowerQuota='public'|'private'|'legacyPrivate';
// Existing scenario populations and opening forces leave room at 4%; this is a game setting.
export const MOBILIZATION_RATE=.04;
export function sourceOccupied(w:World,site:string,estate?:string){
 let publicUsed=0,privateUsed=0;
 for(const a of w.realm?.armies??[]){if(a.regiments?.length){for(const u of a.regiments)if(u.origin===site&&(u.sourceEstate??undefined)===estate){if(u.quota==='private'||u.quota==='legacyPrivate')privateUsed+=u.troops;else publicUsed+=u.troops;}}else if(a.location===site&&!estate){if(a.owner)privateUsed+=a.troops;else publicUsed+=a.troops;}}
 for(const t of w.realm?.population?.transfers??[])if(t.kind==='demobilized'&&t.status==='traveling'&&(t.sourceOrigin??t.to)===site&&(t.sourceEstate??undefined)===estate){if(t.quota==='private'||t.quota==='legacyPrivate')privateUsed+=t.sent;else publicUsed+=t.sent;}
 for(const p of w.militaryAftermath?.pools??[])for(const s of p.sources??[])if(s.origin===site&&(s.sourceEstate??undefined)===estate){const n=s.wounded+s.captives+s.dispersed;if(s.quota==='private'||s.quota==='legacyPrivate')privateUsed+=n;else publicUsed+=n;}
 return {public:publicUsed,private:privateUsed,total:publicUsed+privateUsed};
}
export function manpowerSources(w:World,site:string){
 const policy=estatePolicies[actualEstatePolicy(w,site)],sources=[{id:undefined as string|undefined,population:ordinaryPopulation(w,site)},...allEstates(w).filter(e=>e.location===site).map(e=>({id:e.id,population:e.population}))];
 // Disposed estates keep source records until survivors settle. They cannot furnish new recruits.
 const missing=new Set((w.realm?.armies??[]).flatMap(a=>(a.regiments??[]).filter(u=>u.origin===site&&u.sourceEstate&&!sources.some(s=>s.id===u.sourceEstate)).map(u=>u.sourceEstate!)));
 for(const id of missing)sources.push({id,population:0});
 return sources.map(s=>{const used=sourceOccupied(w,site,s.id),basis=s.population+used.total,total=Math.floor(basis*MOBILIZATION_RATE),publicLimit=s.id?Math.floor(total*policy.publicShare):total,privateLimit=total-publicLimit;
  return {...s,basis,total,publicLimit,privateLimit,used,publicAvailable:Math.max(0,Math.min(s.population,total-used.total,publicLimit-used.public)),privateAvailable:s.id?Math.max(0,Math.min(s.population,total-used.total,privateLimit-used.private)):0};
 });
}
export function reservedPublicManpower(w:World,site:string,ignoreTask?:number){return (w.service?.tasks??[]).filter(t=>t.id!==ignoreTask&&t.site===site&&t.kind==='recruitment'&&t.phase!=='closed').reduce(n=>n+200,0);}
export function manpower(w:World,site:string,owner?:string,ignoreTask?:number){
 const sources=manpowerSources(w,site),reserved=reservedPublicManpower(w,site,ignoreTask),publicAvailable=Math.max(0,sources.reduce((n,s)=>n+s.publicAvailable,0)-reserved),privateSources=sources.filter(s=>s.id&&estateById(w,s.id)?.owner===owner&&!estateAccessReason(w,estateById(w,s.id)!));
 return {sources,total:sources.reduce((n,s)=>n+s.total,0),used:sources.reduce((n,s)=>n+s.used.total,0),reserved,publicLimit:sources.reduce((n,s)=>n+s.publicLimit,0),privateLimit:sources.reduce((n,s)=>n+s.privateLimit,0),publicAvailable,privateAvailable:privateSources.reduce((n,s)=>n+s.privateAvailable,0)};
}
export interface ManpowerPart {sourceEstate?:string;quota:ManpowerQuota;troops:number}
export function recruitmentSources(w:World,site:string,amount:number,owner?:string,ignoreTask?:number):{reason:string;parts:ManpowerPart[]}{
 if(!Number.isSafeInteger(amount)||amount<1||amount>6000)return {reason:'征募人数须为 1 至 6000 的整数',parts:[]};
 const r=owner?allegianceRealm(w,owner):undefined,privateChannel=!!owner&&ownedEstates(w,owner).length>0,q=manpower(w,site,owner,ignoreTask),limit=privateChannel?q.privateAvailable:q.publicAvailable;
 if(owner&&!privateChannel&&(!r||!authorityGrant(w,owner,'levy',{realm:r,site}).allowed))return {reason:'无庄园人物自筹募兵须有本县军务授权，并占公共兵额',parts:[]};
 if(amount>limit)return {reason:`${privateChannel?'私人':'公共'}同源可征兵额不足：剩余 ${limit} 人（现役、训练与返乡在途仍占额）`,parts:[]};
 let left=amount;const parts:ManpowerPart[]=[];
 for(const source of q.sources){if(privateChannel&&(!source.id||estateById(w,source.id)?.owner!==owner||estateAccessReason(w,estateById(w,source.id)!)))continue;const n=Math.min(left,privateChannel?source.privateAvailable:source.publicAvailable);if(n){parts.push({sourceEstate:source.id,quota:privateChannel?'private':'public',troops:n});left-=n;}if(!left)break;}
 return {reason:left?'来源人口不足':'',parts:left?[]:parts};
}
/** Call only after the whole command is validated. This is the only recruitment population debit. */
export function consumeManpower(w:World,site:string,parts:ManpowerPart[]){for(const p of parts){w.realm!.cities[site].population-=p.troops;if(p.sourceEstate)estateById(w,p.sourceEstate)!.population-=p.troops;}}
export function recruitmentRegiments(parts:ManpowerPart[],id:number,site:string,kind:Regiment['kind']='shield',service:Regiment['service']='levy'):Regiment[]{return parts.map((p,i)=>({id:id+':'+(i+1),kind,service,origin:site,...p,experience:0}));}
export function migrateManpower(w:World){for(const p of w.militaryAftermath?.pools??[])p.sources??=[{origin:p.site,quota:'public',wounded:p.wounded,captives:p.captives,dispersed:p.dispersed}];for(const a of w.realm?.armies??[])for(const u of a.regiments??[])u.quota??=a.owner?'legacyPrivate':'public';for(const t of w.realm?.population?.transfers??[])if(t.kind==='demobilized'){t.quota??='public';t.sourceOrigin??=t.to;}}

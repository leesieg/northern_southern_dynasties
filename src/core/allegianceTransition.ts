import type {World} from './types';
import type {RealmId} from './realm';
import {relationshipPeople} from '../data/relationships';
import {allegianceRealm} from './officeEligibility';
import {incurObligation} from './obligations';
export function detachRetainer(w:World,id:string){const m=w.retinue?.members[id];if(!m)return;if(m.arrears)incurObligation(w,`retinue:${m.host}:${id}:${m.joined}:${w.day}`,'person:'+m.host,'person:'+id,m.arrears*(m.post?4:2),'离幕前未付俸钱');delete w.retinue!.members[id];}
/** An individual's new oath must not silently carry an entire dependency tree. */
export function retainPersonalFollowers(w:World,id:string,origin:RealmId){
 const rs=w.relationships;if(!rs)return;
 const followers=relationshipPeople.filter(p=>p.id!==id&&(rs.oaths[p.id]?.lord===id||w.retinue?.members[p.id]?.host===id)).map(p=>({id:p.id,realm:allegianceRealm(w,p.id)??origin}));
 for(const p of followers){delete rs.oaths[p.id];if(w.retinue?.members[p.id]?.host===id)detachRetainer(w,p.id);(rs.allegiances??={})[p.id]={realm:p.realm,from:p.realm,since:w.day,army:0,source:'custody'};}
}

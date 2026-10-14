import {ensureWars} from './wars';
import type {World} from './types';
import {campaignSetup} from '../data/campaignSetup';
import {routeGrant} from './treasury';
import {diplomaticKey} from './diplomacy';
import {allegianceRealm,publicOfficeReason} from './officeEligibility';
import {presentAt} from './residence';
import {lifeOf} from './lifeState';
export function initialCommanderReason(w:World,id:string,site:string,realm:string){return publicOfficeReason(w,id)||(allegianceRealm(w,id)!==realm?'效忠政权不一致':!presentAt(w,id,site)?'统帅须实际驻留来源县域':(lifeOf(w,id)?.illness?.severity??0)>=3?'重病不能统军':'');}
export function initializeStrategicStart(w:World){
 const setup=campaignSetup.strategy;if(!setup||w.mode!=='sandbox')return;
 const next=structuredClone(w);ensureWars(next);
 for(const [id,c] of Object.entries(setup.cities))if(c.localCoins)routeGrant(next,id,c.localCoins,'作者剧本开局拨款：中央沿实际科层划入地方公库');
 for(const d of setup.diplomacy){const pair=next.diplomacy!.pairs[diplomaticKey(d.a,d.b)];pair.opinion=d.opinion;pair.recognized=d.recognized;pair.treaties=d.treaties.map(t=>({kind:t.kind,from:t.from,to:t.to,actor:null,since:0,until:t.days}));}
 Object.assign(w,next);
}

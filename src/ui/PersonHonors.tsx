import type {World} from '../core/types';
import type {RealmId} from '../core/realm';
import {honorsOfPerson} from '../core/rulerHistory';
import './personHonors.css';
/** Keep the person's name intact; death titles retain their recorded tenure's realm. */
export function PersonHonors({world,person,realm}:{world:World;person:string;realm?:RealmId}){
 const honors=honorsOfPerson(world,person).filter(h=>!realm||h.realm===realm);
 return honors.length?<small className="person-posthumous" aria-label="身后称号">{honors.map(h=><span key={h.tenure}>{h.regime} · 谥「{h.posthumous}」{h.temple&&<> · 庙号「{h.temple}」</>}</span>)}</small>:null;
}

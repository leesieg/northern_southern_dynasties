import {governmentOf} from '../core/government';
import {useState} from 'react';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {officeCandidates} from '../core/officeEligibility';
import {siteById} from '../data/scenario';
import {executive,playerRealm,realmReason} from '../core/realm';
import {attributes} from '../core/social';
import {isAlive} from '../core/lifeState';
import type {World,GameCommand} from '../core/types';
export function CityOfficeSeat({world:w,site,pending,send,onPerson}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void}){
 const [open,setOpen]=useState(false),[candidate,setCandidate]=useState(w.characterId!);const city=w.realm?.cities[site];if(!city)return null;
 const own=city.owner===playerRealm(w),appoint=executive(w)||governmentOf(w)?.ruler===w.characterId,command={type:'realm',action:'appoint',site,candidate} as const;
 return <div className="city-office-seat"><PositionSeat world={w} holder={city.governor} title="刺史" icon="city" onPerson={onPerson} onManage={own?()=>setOpen(true):undefined}/>{open&&<PersonSelectionDialog world={w} title={siteById[site].name+' · '+(appoint?'任命刺史':'申请刺史')} value={candidate} onSelect={setCandidate} onClose={()=>setOpen(false)} pending={pending} description="文书送达且本人赴任后新任职生效，前任失去本城治理权；城市失守时文书失效。功绩不足 20 的破格任命：朝野支持 −10、当地秩序 −3。" options={officeCandidates(w,playerRealm(w)).filter(p=>isAlive(w,p.id)&&(appoint||p.id===w.characterId)).map(p=>({id:p.id,score:attributes(w,p.id).stewardship,metric:'管理',detail:p.note,reason:realmReason(w,appoint?{...command,candidate:p.id}:{type:'realm',action:'petition',site})}))} confirmLabel={appoint?'下达任命 · 20 影响力':'申请刺史 · 40 影响力'} onConfirm={()=>{send(appoint?command:{type:'realm',action:'petition',site});setOpen(false);}}/>}</div>;
}

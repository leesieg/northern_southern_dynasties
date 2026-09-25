import {useState} from 'react';
import {PersonSelectionDialog} from './PersonSelection';
import {ArtIcon} from './ArtIcon';
import {assignmentTemplates,type AssignmentKind} from '../data/assignments';
import {officeCandidates} from '../core/officeEligibility';
import {canCommission} from '../core/serviceMandates';
import {siteById} from '../data/scenario';
import {dutyMinistries,officialDutyReason} from '../core/officialDuties';
import {serviceReason} from '../core/assignments';
import {playerRealm} from '../core/realm';
import {attributes} from '../core/social';
import type {World,GameCommand} from '../core/types';
export function OfficialActions({world:w,pending,send,site,person}:{world:World;pending:boolean;send:(c:GameCommand)=>void;site?:string;person?:string}){
 const [open,setOpen]=useState(false),[kind,setKind]=useState<AssignmentKind>('marketworks'),[city,setCity]=useState(site??w.people[0].location),[candidate,setCandidate]=useState(person??w.characterId!);
 if(!w.realm||!w.characterId)return null;
 const r=playerRealm(w),sites=Object.keys(w.realm.cities).filter(id=>w.realm!.cities[id].owner===r&&w.realm!.cities[id].controller===r),at=site??(sites.includes(city)?city:sites[0]??''),chief=canCommission(w,w.characterId,r,at,kind),command={type:'service',action:'open',kind,site:at,officer:candidate} as const;
 const choices=officeCandidates(w,r).filter(p=>(chief?(!person||p.id===person):p.id===w.characterId));
 const kinds=(Object.keys(dutyMinistries) as AssignmentKind[]).filter(k=>!person||!officialDutyReason(w,person,k));
 if(!kinds.length||person&&!chief&&person!==w.characterId)return null;
 const selectedKind=kinds.includes(kind)?kind:kinds[0],cmd={...command,kind:selectedKind};
 return <><button className="official-duty-button" onClick={()=>setOpen(true)}><ArtIcon name="diligent" size={22}/>{chief?'委办公务':'履行职掌'} ›</button>{open&&<PersonSelectionDialog world={w} title={chief?'委办公务':'履行职掌'} value={candidate} onSelect={setCandidate} onClose={()=>setOpen(false)} pending={pending} description={<><div className="official-duty-kinds">{kinds.map(k=><button key={k} aria-pressed={selectedKind===k} onClick={()=>setKind(k)}><ArtIcon name={assignmentTemplates[k].icon} size={24}/>{assignmentTemplates[k].name}</button>)}</div><p>{assignmentTemplates[selectedKind].description} {assignmentTemplates[selectedKind].effect}</p><p>常额预算：{assignmentTemplates[selectedKind].coins} 公款、{assignmentTemplates[selectedKind].grain} 公粮。拟案后由主管批准，承办人赴城办理并呈报考绩。</p>{!site&&<label>办理城市 <select value={at} onChange={e=>setCity(e.target.value)}>{sites.map(id=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label>}</>} options={choices.map(p=>({id:p.id,score:attributes(w,p.id)[assignmentTemplates[selectedKind].skill],metric:'职务能力',reason:serviceReason(w,{...cmd,officer:p.id})}))} confirmLabel={chief?'下达委任':'自行立项'} onConfirm={()=>{send(cmd);setOpen(false);}}>{!w.service?.enabled&&<button disabled={pending} onClick={()=>send({type:'service',action:'begin'})}>参与朝廷议事</button>}</PersonSelectionDialog>}</>;
}

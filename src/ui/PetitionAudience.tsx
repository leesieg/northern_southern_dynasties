import {useContext,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AudienceDecorHostContext,AudienceDeferContext} from './AudienceContext';
import {CharacterPortrait} from './CharacterPortrait';
import {RealmBadge} from './RealmBadge';
import {SingleChoiceCards} from './SingleChoiceCards';
import {politicalName} from '../core/government';
import type {RealmId} from '../core/realm';
import type {GameCommand,World} from '../core/types';
import './serviceAudience.css';

type StageProps={world:World;person:string;realm:RealmId;subject:string;role:string;speech:string;terms?:ReactNode;onPerson?:(id:string)=>void};
export function AudienceStage({world:w,person,realm,subject,role,speech,terms,onPerson}:StageProps){
 const decorHost=useContext(AudienceDecorHostContext);
 const decorations=<><div className="service-audience-title"><h3>{subject}</h3></div><div className="service-audience-figure"><div className="service-audience-portrait"><CharacterPortrait characterId={person} world={w} cutout/></div></div></>;
 return <div className="service-audience-stage">
  {decorHost?createPortal(decorations,decorHost):decorations}
  <div className="service-audience-conversation">
   <div className="service-audience-speaker"><RealmBadge realm={realm} world={w}/>{onPerson?<button className="service-audience-person" type="button" onClick={()=>onPerson(person)} aria-label={'查看'+politicalName(person)+'的人物详情'}>{politicalName(person)} ↗</button>:<strong>{politicalName(person)}</strong>}<span>{role}</span></div>
   <p className="service-audience-speech">“{speech}”</p>{terms}
  </div>
 </div>;
}

type PetitionOption={id:string;title:string;description:string;command:GameCommand};
export function PetitionAudience({identity,world,person,realm,subject,role,speech,terms,options,reason,pending,send,onPerson,detailLabel,details}:{identity:string;world:World;person:string;realm:RealmId;subject:string;role:string;speech:string;terms?:ReactNode;options:PetitionOption[];reason:(command:GameCommand)=>string;pending:boolean;send:(command:GameCommand)=>void;onPerson?:(id:string)=>void;detailLabel?:string;details?:ReactNode}){
 const onDefer=useContext(AudienceDeferContext);
 const [draft,setDraft]=useState<{identity:string;choice:string}|null>(null),[detailIdentity,setDetailIdentity]=useState<string|null>(null);
 const choice=draft?.identity===identity?draft.choice:null,expanded=detailIdentity===identity;
 const selected=options.find(option=>option.id===choice),blocked=selected?reason(selected.command):'';
 return <section className="service-audience" aria-label={subject+'答复'}>
  <AudienceStage world={world} person={person} realm={realm} subject={subject} role={role} speech={speech} terms={terms} onPerson={onPerson}/>
  {details&&<div className="service-audience-inquiry"><button type="button" aria-expanded={expanded} onClick={()=>setDetailIdentity(expanded?null:identity)}>{expanded?'收起详情':detailLabel??'查看详情'} <span aria-hidden="true">{expanded?'−':'＋'}</span></button>{expanded&&<div className="service-audience-inquiry-body">{details}</div>}</div>}
  <SingleChoiceCards label="你的答复 · 单选" value={choice} onChange={next=>setDraft({identity,choice:next})} disabled={pending} options={options.map(option=>({id:option.id,title:option.title,description:option.description,reason:reason(option.command)}))}/>
  <div className="service-audience-confirm"><div className="service-audience-confirm-summary">{selected?<><strong>{selected.title}</strong><small>{selected.description}</small></>:<span>选择答复后确认</span>}{blocked&&<small role="status" className="service-warning">{blocked}</small>}</div><div className="service-audience-actions">{onDefer&&<button type="button" disabled={pending} onClick={onDefer}>稍后处理</button>}<button className="primary" disabled={pending||!selected||!!blocked} onClick={()=>{if(!selected||pending||reason(selected.command))return;send(selected.command);setDraft(null);}}>确认答复</button></div></div>
 </section>;
}

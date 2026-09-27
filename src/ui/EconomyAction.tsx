import {useState} from 'react';
import type {GameCommand,World} from '../core/types';
import {economyCommandReason,type PersonalEconomyCommand} from '../core/personalEconomyAdapter';
import {ArtIcon,type ArtName} from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import {HoverHint} from './HoverHint';

export function EconomyAction({world,pending,send,command,label,icon='coins',consequence,hint,summary,active}:{world:World;pending:boolean;send:(c:GameCommand)=>void;command:PersonalEconomyCommand;label:string;icon?:ArtName;consequence?:string;hint?:string;summary?:string;active?:boolean}){
 const [confirm,setConfirm]=useState(false),reason=economyCommandReason(world,command);
 return <div className="economy-action"><HoverHint label={label} content={<>{hint||consequence||label}{reason&&<p>{reason}</p>}</>}><button className="economy-action-card" aria-pressed={active} disabled={pending||!!reason} onClick={()=>consequence?setConfirm(true):send(command)}><ArtIcon name={icon} size={28}/><span><strong>{label}</strong>{summary&&<small>{summary}</small>}</span></button></HoverHint>{confirm&&<ConfirmAction title={label} detail={<><p>{consequence}</p>{reason&&<p role='status'>{reason}</p>}</>} confirmLabel='确认执行' danger pending={pending||!!reason} onCancel={()=>setConfirm(false)} onConfirm={()=>{if(pending||economyCommandReason(world,command))return;send(command);setConfirm(false);}}/>}</div>;
}

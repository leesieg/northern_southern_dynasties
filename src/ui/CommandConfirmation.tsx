import {useState,type ReactNode} from 'react';
import type {GameCommand} from '../core/types';
import {CommandButton} from './CommandButton';
import {ConfirmAction} from './ConfirmAction';
import {HoverHint} from './HoverHint';
import {ArtIcon,type ArtName} from './ArtIcon';
import {afterCommand} from './actionFeedback';

/** A cost-bearing action has one preview, then one explicit submission. */
export function CommandConfirmation({command,label,detail,icon='diligent',reason='',pending,send,danger=false,iconOnly=false,selected}:{command:GameCommand;label:string;detail:ReactNode;icon?:ArtName;reason?:string;pending:boolean;send:(command:GameCommand)=>Promise<boolean>;danger?:boolean;iconOnly?:boolean;selected?:boolean}){
 const [open,setOpen]=useState(false);
 return <>{iconOnly?<HoverHint label={label} content={<>{detail}{reason&&<p>{reason}</p>}</>}><button type="button" className="court-icon-button" aria-label={label} disabled={pending||!!reason} onClick={()=>setOpen(true)}><ArtIcon name={icon} size={25}/></button></HoverHint>:<CommandButton label={label} icon={icon} hint={detail} reason={reason} pending={pending} danger={danger} selected={selected} onClick={()=>setOpen(true)}/>}
 {open&&<ConfirmAction title={label} detail={<>{detail}{reason&&<p className="service-warning" role="status">{reason}</p>}</>} confirmLabel={'确认'+label} danger={danger} pending={pending||!!reason} onCancel={()=>setOpen(false)} onConfirm={()=>{if(pending||reason)return;void afterCommand(send(command),()=>setOpen(false));}}/>}</>;
}

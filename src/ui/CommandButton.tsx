import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';

/** Preview/action entry. A disabled action remains focusable through its explanation. */
export function CommandButton({label,icon='diligent',hint,reason='',pending=false,onClick,danger=false}:{label:string;icon?:ArtName;hint:string;reason?:string;pending?:boolean;onClick:()=>void;danger?:boolean}){
 const blocked=pending?'正在处理上一项指令':reason;
 return <HoverHint label={label} content={<>{hint}{blocked&&<p>{blocked}</p>}</>}><button type="button" className={'campaign-action'+(danger?' danger':'')} disabled={!!blocked} onClick={onClick}><ArtIcon name={icon} size={24}/><span className="campaign-action-label">{label}</span></button></HoverHint>;
}

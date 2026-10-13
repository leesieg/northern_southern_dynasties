import {useState} from 'react';
import type {GameCommand} from '../core/types';
import {SingleChoiceCards} from './SingleChoiceCards';
import type {DialogScene} from './DialogArt';

/** A choice previews the decision; only the explicit final command executes it. */
export function EventDecision({label,options,pending,send}:{label:string;options:{id:string;title:string;description:string;command:GameCommand;reason:string;art?:DialogScene}[];pending:boolean;send:(command:GameCommand)=>Promise<boolean>}){
 const [value,setValue]=useState<string|null>(null),selected=options.find(o=>o.id===value);
 return <section className="event-decision"><SingleChoiceCards label={label} value={value} onChange={setValue} options={options} disabled={pending}/><footer>{selected?.reason&&<p role="status" className="service-warning">{selected.reason}</p>}<button className="primary" disabled={pending||!selected||!!selected.reason} onClick={()=>{if(!pending&&selected&&!selected.reason)void send(selected.command);}}>{selected?'确认'+selected.title:'请选择处置方案'}</button></footer></section>;
}

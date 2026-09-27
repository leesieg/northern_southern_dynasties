import {useId,type ReactNode} from 'react';
import './singleChoiceCards.css';

export type SingleChoiceOption<T extends string>={id:T;title:ReactNode;description?:ReactNode;detail?:ReactNode;reason?:string};

export function SingleChoiceCards<T extends string>({label,value,onChange,options,disabled=false}:{label:string;value:T|null;onChange:(value:T)=>void;options:SingleChoiceOption<T>[];disabled?:boolean}){
 const name=useId();
 return <fieldset className="single-choice-cards"><legend>{label}</legend><div className="single-choice-list">{options.map(option=><label key={option.id} className={`single-choice-card ${value===option.id?'is-selected':''} ${disabled?'is-disabled':''}`}><input type="radio" name={name} value={option.id} checked={value===option.id} onChange={()=>onChange(option.id)} disabled={disabled}/><span className="single-choice-content"><strong>{option.title}</strong>{option.description&&<span className="single-choice-description">{option.description}</span>}{option.detail&&<span className="single-choice-detail">{option.detail}</span>}{option.reason&&<small className="single-choice-reason">当前不可执行：{option.reason}</small>}</span><span className="single-choice-state" aria-hidden="true">{value===option.id?'已选':'选择'}</span></label>)}</div></fieldset>;
}

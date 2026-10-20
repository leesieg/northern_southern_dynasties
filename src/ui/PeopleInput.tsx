import {useEffect,useState} from 'react';
import {px,unpx} from './peopleScale';

/** Number field that shows people at interface scale while the command keeps simulation units. */
export function PeopleInput({value,onChange,min,max}:{value:number;onChange:(units:number)=>void;min:number;max:number}){
 const shown=Number.isFinite(value)?String(px(value)):'',[text,setText]=useState(shown);
 useEffect(()=>{if(unpx(Number(text))!==value&&!(text===''&&!Number.isFinite(value)))setText(shown);},[value]);
 return <input type="number" min={px(min)} max={px(max)} step={10} value={text} onChange={event=>{setText(event.target.value);onChange(unpx(event.target.valueAsNumber));}}/>;
}

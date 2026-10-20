import {useState} from 'react';
import {firstTips,tipSeen,markTipSeen} from './firstTips';
import './firstTips.css';

export function FirstTip({id}:{id:string}){
 const text=firstTips[id],[dismissed,setDismissed]=useState(()=>tipSeen(id));
 if(!text||dismissed)return null;
 return <aside className="first-tip" role="note"><span>{text}</span><button onClick={()=>{markTipSeen(id);setDismissed(true);}}>知道了</button></aside>;
}

import type { ButtonHTMLAttributes } from 'react';
import './viewControls.css';
export type ViewAction='in'|'out'|'left'|'right'|'reset';
const labels:Record<ViewAction,string>={in:'放大',out:'缩小',left:'向左旋转',right:'向右旋转',reset:'重置视角'};
export function ViewControl({action,label,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{action:ViewAction;label?:string}){
 return <button {...props} className={`view-control ${props.className??''}`} title={label??labels[action]} aria-label={label??labels[action]}><svg viewBox="0 0 32 32" width="29" height="29" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#354b40" stroke="#af945e" strokeWidth="1.4"/><circle cx="16" cy="16" r="11.8" stroke="#d4bf882d"/>{action==='in'||action==='out'?<g stroke="#ead19a" strokeWidth="2.3" strokeLinecap="round"><path d="M9 16h14"/>{action==='in'&&<path d="M16 9v14"/>}</g>:action==='reset'?<g stroke="#ead19a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 13a8 8 0 1 1-1 7M9 8v6h6"/><circle cx="16" cy="16" r="2"/></g>:<g transform={action==='right'?'translate(32 0) scale(-1 1)':undefined} stroke="#ead19a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a8 8 0 1 1 0 9M10 7v7h7"/></g>}</svg></button>;
}

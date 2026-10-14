import {useId} from 'react';
import {familyById} from '../data/families';
/** A game identity seal, not a claim of historical hereditary heraldry. */
export function FamilyCrest({family,small=false,size}:{family:string;small?:boolean;size?:24|40|72}){
 const id=useId().replace(/:/g,''),f=familyById[family];if(!f)return null;
 const letters=Array.from(f.surname);
 return <span className={'family-crest'+(small?' small':'')} data-family={family} data-size={size??(small?40:72)} role="img" aria-label={f.name+' · '+f.originKind+' '+f.origin}>
 <svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id={id+'seal'} x2="1" y2="1"><stop stopColor="#34382e"/><stop offset=".5" stopColor="#181e19"/><stop offset="1" stopColor="#35352a"/></linearGradient><pattern id={id+'grain'} width="7" height="9" patternUnits="userSpaceOnUse"><path d="M0 2h2m3 4h2M1 8h1" stroke="#d1ba83" strokeWidth=".4" opacity=".22"/></pattern></defs>
 <path d="M7 2H73L78 7V73L73 78H7L2 73V7Z" fill={`url(#${id}seal)`} stroke="#ad915d" strokeWidth="1.4"/><path d="M9 5H71L75 9V71L71 75H9L5 71V9Z" fill={`url(#${id}grain)`} stroke="#88734e"/>
 <g className="family-seal-ornament" fill="none" stroke="#b49965" strokeWidth=".8">{[0,90,180,270].map(a=><path key={a} transform={`rotate(${a} 40 40)`} d="M8 21V11q0-3 3-3h10M11 18v-5q0-2 2-2h5q3 0 3 3t-3 3h-3v-3h3M12 22q7 0 10-6"/>)}</g>
 <g fill="#d0b17c" fontFamily="var(--font-title)" textAnchor="middle">{letters.map((l,i)=><text key={i} x={40} y={letters.length===1?58:letters.length===2?34+i*29:25+i*22} fontSize={letters.length===1?53:letters.length===2?29:22}>{l}</text>)}</g></svg></span>;
}

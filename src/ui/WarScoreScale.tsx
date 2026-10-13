import type {CSSProperties} from 'react';
/** War advantage has a signed origin. It is never a completion progress bar. */
export function WarScoreScale({value}:{value:number}){
 const shown=Math.max(-100,Math.min(100,value));
 return <div className="war-score-scale" role="meter" aria-label="攻方战争优势" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={shown} aria-valuetext={(value>0?'+':'')+value+'，正值为攻方优势，负值为守方优势'} style={{'--war-score-position':((shown+100)/2)+'%'} as CSSProperties}>
  <div className="war-score-ruler"><i className="war-score-origin"/><strong className="war-score-marker">{value>0?'+':''}{value}<i/></strong></div>
  <div className="war-score-labels"><span>守方优势</span><span>0</span><span>攻方优势</span></div>
 </div>;
}

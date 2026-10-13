import {useState,type ReactNode} from 'react';
import {DialogArt} from './DialogArt';
import {ArtIcon,type ArtName} from './ArtIcon';

export type WarReportEntry={id:string;day:number;title:string;status:string;facts:ReactNode;icon:ArtName;onOpen?:()=>void};
export function WarReportDossier({reports}:{reports:WarReportEntry[]}){
 const [chosen,setChosen]=useState('');
 const ordered=[...reports].sort((a,b)=>b.day-a.day),active=ordered.find(r=>r.id===chosen)??ordered[0];
 if(!active)return <p className="war-empty-report">尚无可关联本场战争的战报；旧档未记录的战役不补造。</p>;
 return <div className="war-report-dossier">
  <nav className="war-report-timeline" aria-label="选择战报">{ordered.map(r=><button key={r.id} aria-pressed={r.id===active.id} onClick={()=>setChosen(r.id)}><ArtIcon name={r.icon} size={24}/><span><strong>{r.title}</strong><small>第 {r.day} 日 · {r.status}</small></span></button>)}</nav>
  <article className="war-report-paper"><header><h3>{active.title}</h3><small>第 {active.day} 日 · {active.status}</small></header><DialogArt scene={active.icon==='city'?'fortress':'dispatch'}/><div className="war-report-facts">{active.facts}</div><footer>{active.onOpen&&<button onClick={active.onOpen}>查看{active.icon==='city'?'围城':'战役'}</button>}</footer></article>
 </div>;
}

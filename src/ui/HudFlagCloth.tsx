import {ReferenceHudFrame} from './ReferenceHudArt';
/** Shared woven field and embroidered hem, preserving each real task category's silhouette. */
export function HudFlagCloth({id,color,path,paper=false}:{id:string;color:string;path:string;paper?:boolean}){
 return <><svg className="ongoing-cloth" viewBox="0 0 72 112" preserveAspectRatio="none" aria-hidden="true">
  <defs>
   <linearGradient id={id}><stop stopColor="#131c18"/><stop offset=".08" stopColor={color}/><stop offset=".4" stopColor={color}/><stop offset=".52" stopColor={color} stopOpacity=".92"/><stop offset=".88" stopColor={color}/><stop offset="1" stopColor="#172019"/></linearGradient>
   <pattern id={id+'-weave'} width="2.7" height="2.7" patternUnits="userSpaceOnUse"><path d="M0 0H2.7M0 0V2.7" stroke="#f5dfac" strokeWidth=".32" opacity=".16"/><path d="M1.5 0V2.7" stroke="#171a15" strokeWidth=".45" opacity=".18"/></pattern>
   <linearGradient id={id+'-rod'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5b472b"/><stop offset=".36" stopColor="#d3b571"/><stop offset=".62" stopColor="#a88a4f"/><stop offset="1" stopColor="#493d27"/></linearGradient>
  </defs>
  <path d={path} fill={'url(#'+id+')'} stroke="#9d824b" strokeWidth=".7"/>
  <path d={path} fill={'url(#'+id+'-weave)'} stroke="none"/>
  <g fill="none" stroke="#c1a061" strokeWidth=".6"><path d={path} transform="translate(4 5) scale(.89 .9)"/><path d={path} transform="translate(6 7) scale(.835 .855)"/><path d="M9 13h3v4H9v4h3v4H9M60 13h3v4h-3v4h3v4M9 72h3v4H9v4h3v4H9M60 72h3v4h-3v4h3v4" opacity=".65"/></g>
  <rect x="1" y="2" width="70" height="4" rx="1.3" fill={'url(#'+id+'-rod)'} stroke="#4c3d24" strokeWidth=".6"/>
  <g fill={'url(#'+id+'-rod)'} stroke="#5b4628" strokeWidth=".5"><rect x=".5" y=".5" width="3" height="7" rx="1.5"/><rect x="68.5" y=".5" width="3" height="7" rx="1.5"/></g>
 </svg><ReferenceHudFrame kind={paper?'flag':'silkFlag'}/></>;
}

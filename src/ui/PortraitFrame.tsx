import {portraitRankNames,type PortraitRank} from '../character/portraitRank';
import './portraitFrame.css';

/** Original vector frame artwork, kept separate from the painted character layers. */
export function PortraitFrame({rank,compact=false}:{rank:PortraitRank;compact?:boolean}){
 return <div className={`portrait-role-frame portrait-role-${rank}`} title={portraitRankNames[rank]}>
 <svg viewBox={compact?"0 0 200 200":"0 0 200 300"} preserveAspectRatio="none" aria-hidden="true" focusable="false">
 <path className="frame-base" d={compact?"M2 2H198V198H2Z":"M2 2H198V298H2Z"}/>
 {compact?<><path d="M8 38V8H38M162 8H192V38M8 162V192H38M162 192H192V162"/><path d="M8 18H18V8M182 8V18H192M8 182H18V192M182 192V182H192"/></>:rank==='sovereign'?<><path d="M8 30V8H74M126 8H192V30M8 270V292H74M126 292H192V270M12 40V260M188 40V260"/><path d="M20 8V20H8M180 8V20H192M8 280H20V292M180 292V280H192M84 8H116L112 14H88ZM90 16V26M100 16V29M110 16V26M84 287L100 280L116 287L100 294Z"/><g fill="currentColor"><circle cx="90" cy="27" r="2"/><circle cx="100" cy="30" r="2"/><circle cx="110" cy="27" r="2"/></g></>:
 rank==='official'?<><path d="M7 34V7H76M124 7H193V34M7 266V293H76M124 293H193V266M12 38V262M188 38V262M86 7L100 3L114 7V20L100 27L86 20ZM94 10H106M94 15H106M96 20H104M88 289H112"/><path d="M7 18H18V7M182 7V18H193M7 282H18V293M182 293V282H193"/></>:
 rank==='commander'?<><path d="M5 35V5H76M124 5H195V35M5 265V295H76M124 295H195V265M86 5H114V17L100 30L86 17ZM100 9V22M92 16H108M13 42V258M187 42V258M86 290L100 280L114 290"/><g fill="currentColor"><path d="M5 5H23L5 23ZM195 5V23L177 5ZM5 295V277L23 295ZM195 295H177L195 277Z"/></g></>:
 rank==='noble'?<><path d="M8 32V8H78M122 8H192V32M8 268V292H78M122 292H192V268M100 4L113 15L100 28L87 15ZM94 15H106M100 9V21M88 292L100 285L112 292M15 40V260M185 40V260"/><circle cx="17" cy="17" r="4"/><circle cx="183" cy="17" r="4"/><circle cx="17" cy="283" r="4"/><circle cx="183" cy="283" r="4"/></>:
 <><path d="M8 28V8H80M120 8H192V28M8 272V292H80M120 292H192V272M12 38V262M188 38V262M90 8L100 4L110 8L100 24ZM100 8V19M92 291H108" strokeDasharray="3 3"/><path d="M5 19L19 5M181 5L195 19M5 281L19 295M181 295L195 281"/></>}
 </svg></div>;
}

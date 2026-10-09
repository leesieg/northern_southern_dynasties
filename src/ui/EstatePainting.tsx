import {useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {estateName,estateBuildings,type EstateBuilding,type Holdings} from '../core/construction';
import {estateScene} from './estateScene';
import './estatePainting.css';
interface Props {children?:ReactNode;estate:Holdings['estate'];day:number;economy?:boolean;selected:EstateBuilding|null;onSelect:(id:EstateBuilding)=>void}
const order:EstateBuilding[]=['hall','fields','workshop','storehouse'];
export function EstatePainting({estate,day,economy=true,selected,onSelect,children}:Props){
 const [failed,setFailed]=useState(false),parts=estateScene(estate,day).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
 const description=parts.map(part=>`${estateBuildings[part.id].name}${part.level?part.level+'级':'未建'}${part.constructing?'，扩建至'+part.target+'级，还需'+part.remaining+'日':''}`).join('；');
 const effect=(id:EstateBuilding,level:number)=>!level?'待营建':id==='hall'?'附属建筑位 '+level:id==='fields'?economy?'承载庄户 '+(level*2000).toLocaleString():'月行粮 +'+level*6:id==='workshop'?economy?'庄户加工增收':'月收入 +'+level*6:economy?'储粮容量 '+(100+level*400):'月行粮 +'+level*3;
 return <figure className="estate-painting" aria-label={estateName(estate.family)+'营建全景'}>
  <div className="estate-painting-stage">
   <img className="estate-landscape" src={import.meta.env.BASE_URL+'art/estate/landscape.png'} alt="庄园山水" onError={()=>setFailed(true)}/>
   <img className="estate-asset-preload" src={import.meta.env.BASE_URL+'art/estate/buildings-clean.png'} alt="" aria-hidden="true" onError={()=>setFailed(true)}/>
   <div className="estate-building-row">{parts.map(part=><button key={part.id} type="button" className={`estate-plot plot-${part.id} ${selected===part.id?'is-selected':''} ${part.constructing?'is-building':''} ${part.level?'is-built':'is-unbuilt'}`} aria-pressed={selected===part.id} aria-label={`${estateBuildings[part.id].name}，${part.level?part.level+'级':'未建'}${part.constructing?'，施工中，还需'+part.remaining+'日':''}，查看营建`} onClick={()=>onSelect(part.id)}>
    <span className="estate-building-art">{part.row!==null&&<span key={part.row} className="estate-painted-building" aria-hidden="true" style={{'--sprite-x':`${part.column/3*100}%`,'--sprite-y':`${part.row/3*100}%`} as CSSProperties}/>} {part.constructing&&<span className={`estate-painted-building estate-worksite ${part.level?'is-expansion':''}`} aria-hidden="true" style={{'--sprite-x':`${part.column/3*100}%`,'--sprite-y':'100%'} as CSSProperties}/>} {!part.level&&!part.constructing&&<span className="estate-empty-land" aria-hidden="true">＋</span>}</span>
    <span className="estate-plot-caption"><strong>{estateBuildings[part.id].name}</strong><small>{part.constructing?'施工 · 余 '+part.remaining+' 日':part.level?['','一级','二级','三级'][part.level]:'未建'}</small><span>{part.constructing?'竣工后 · ':''}{effect(part.id,part.constructing?part.target??part.level:part.level)}</span>{part.progress!==null&&<span className="estate-work-meter"><i style={{width:part.progress*100+'%'}}/></span>}</span>
   </button>)}</div>
   {children}
   {failed&&<p className="estate-art-error" role="alert">庄园画面加载失败，可点建筑名称查看营建。</p>}
  </div>
  <figcaption className="estate-screenreader" aria-live="polite">{description}</figcaption>
 </figure>;
}

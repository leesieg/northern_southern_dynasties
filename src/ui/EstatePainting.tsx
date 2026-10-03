import {familyById} from '../data/families';
import { useState } from 'react';
import type { CSSProperties,ReactNode } from 'react';
import { estateName,estateBuildings,type EstateBuilding,type Holdings } from '../core/construction';
import { estateScene } from './estateScene';
import './estatePainting.css';
interface Props {children?:ReactNode;estate:Holdings['estate'];day:number;selected:EstateBuilding|null;onSelect:(id:EstateBuilding)=>void}
export function EstatePainting({estate,day,selected,onSelect,children}:Props){
  const [failed,setFailed]=useState(false);
  const parts=estateScene(estate,day);
  const description=parts.map(part=>`${estateBuildings[part.id].name}${part.level?part.level+'级':'未建'}${part.constructing?`，扩建至${part.target}级，还需${part.remaining}日`:''}`).join('；');
  return <figure className="estate-painting" aria-label={estateName(estate.family)+'全景'}>
    <div className="estate-painting-stage">
      <img className="estate-landscape" src={import.meta.env.BASE_URL+'art/estate/landscape.png'} alt="山水之间的庄园庭院，建筑随营建进度变化" onError={()=>setFailed(true)}/>
      <img className="estate-asset-preload" src={import.meta.env.BASE_URL+'art/estate/buildings-clean.png'} alt="" aria-hidden="true" onError={()=>setFailed(true)}/>
      <div className="estate-scene-title"><span>家 园 图</span><small>{familyById[estate.family]?.surname?`${familyById[estate.family].surname}氏`:'家园'} · 一门烟火</small></div>
      {parts.map(part=><button key={part.id} type="button" className={`estate-plot plot-${part.id} ${selected===part.id?'is-selected':''} ${part.constructing?'is-building':''}`} aria-pressed={selected===part.id} aria-label={`${estateBuildings[part.id].name}，${part.level?part.level+'级':'未建'}${part.constructing?'，施工中，还需'+part.remaining+'日':''}，查看营建`} onClick={()=>onSelect(part.id)}>
        {part.row!==null&&<span key={part.row} className="estate-painted-building" aria-hidden="true" style={{'--sprite-x':`${part.column/3*100}%`,'--sprite-y':`${part.row/3*100}%`} as CSSProperties}/>}
        {part.constructing&&<span className={`estate-painted-building estate-worksite ${part.level?'is-expansion':''}`} aria-hidden="true" style={{'--sprite-x':`${part.column/3*100}%`,'--sprite-y':'100%'} as CSSProperties}/>}
        {!part.level&&!part.constructing&&<span className="estate-empty-land" aria-hidden="true">＋</span>}
        <span className="estate-plot-caption"><strong>{estateBuildings[part.id].name}</strong><small>{part.constructing?`施工 · ${part.remaining} 日`:part.level?`${part.level} 级`:'待营建'}</small>{part.progress!==null&&<span className="estate-work-meter"><i style={{width:`${part.progress*100}%`}}/></span>}</span>
      </button>)}
      <div className="estate-scene-light" aria-hidden="true"/>{children}
      {failed&&<p className="estate-art-error" role="alert">庄园画面资源加载失败，请刷新重试。下方营建操作仍可使用。</p>}
    </div>
    <figcaption><span>点选画中建筑，查看或安排营建</span><span>画面随工程与建筑等级更新</span></figcaption>
    <p className="estate-screenreader" aria-live="polite">{description}</p>
  </figure>;
}

import {useEffect,useState} from 'react';
import {mapLoadLabels,type MapLoadProgress} from './mapLoadState';
import './mapLoading.css';

function MountainInk(){return <svg className="map-loading-ink" viewBox="0 0 280 96" aria-hidden="true"><path d="M12 78 53 36 72 55 109 12 154 73 175 50 207 79"/><path d="m67 73 42-61 13 36 12-5 20 30M146 66l41-45 22 36 15-10 44 31"/><path d="m16 85 61-4 43 5 62-3 52 3 31-2"/></svg>;}
export function MapLoading({ready,progress}:{ready:boolean;progress?:MapLoadProgress}){
 const [visible,setVisible]=useState(!ready);
 useEffect(()=>{if(!ready){setVisible(true);return;}const timer=setTimeout(()=>setVisible(false),380);return()=>clearTimeout(timer);},[ready]);
 if(!visible)return null;
 return <div className={`map-loading-veil${ready?' is-ready':''}`} aria-hidden={ready||undefined}><div className="map-loading-sheet" role="status" aria-live="polite"><MountainInk/><strong>铺展山河</strong><span>{ready?'山河已就绪':progress&&progress.completed===progress.total?'整理地形，准备落笔':'正在读取地形与水系'}</span><progress max={progress?.total??4} value={progress?.completed??0} aria-label="已读取的底图资源"/><small>{progress?.completed??0} / {progress?.total??4} 项已读取</small></div></div>;
}
export function MapDetailLoading({progress}:{progress:MapLoadProgress}){return <div className="map-detail-loading" role="status"><i aria-hidden="true"/><span>{mapLoadLabels[progress.stage]}</span><progress value={progress.completed} max={progress.total} aria-label={`${mapLoadLabels[progress.stage]}完成数量`}/><small>{progress.completed} / {progress.total}</small></div>;}

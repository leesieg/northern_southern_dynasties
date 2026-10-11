import {InkMountains} from '../ui/LoadingMark';
import {useEffect,useState} from 'react';
import {mapLoadLabels,type MapLoadProgress} from './mapLoadState';
import './mapLoading.css';

export function MapLoading({ready,progress}:{ready:boolean;progress?:MapLoadProgress}){
 const [visible,setVisible]=useState(!ready);
 useEffect(()=>{if(!ready){setVisible(true);return;}const timer=setTimeout(()=>setVisible(false),380);return()=>clearTimeout(timer);},[ready]);
 if(!visible)return null;
 return <div className={`map-loading-veil${ready?' is-ready':''}`} aria-hidden={ready||undefined}><div className="map-loading-sheet" role="status" aria-live="polite"><InkMountains/><strong>铺展山河</strong><span>{ready?'山河已就绪':progress&&progress.completed===progress.total?'整理地形，准备落笔':'正在读取地形与水系'}</span><progress max={progress?.total??4} value={progress?.completed??0} aria-label="已读取的底图资源"/><small>{progress?.completed??0} / {progress?.total??4} 项已读取</small></div></div>;
}
export function MapDetailLoading({progress}:{progress:MapLoadProgress}){return <div className="map-detail-loading" role="status"><i aria-hidden="true"/><span>{mapLoadLabels[progress.stage]}</span><progress value={progress.completed} max={progress.total} aria-label={`${mapLoadLabels[progress.stage]}完成数量`}/><small>{progress.completed} / {progress.total}</small></div>;}

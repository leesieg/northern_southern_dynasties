import {useEffect,useSyncExternalStore} from 'react';
import {LoadingMark} from './LoadingMark';
type AssetState={state:'loading'|'ready'|'error';url:string;attempt:number};
const assets=new Map<string,AssetState>(),listeners=new Set<()=>void>(),inFlight=new Set<string>();
const notify=()=>listeners.forEach(fn=>fn());
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
function snapshot(path:string){let asset=assets.get(path);if(!asset){asset={state:'loading',url:import.meta.env.BASE_URL+path,attempt:0};assets.set(path,asset);}return asset;}
function load(path:string,retry=false){const old=snapshot(path);if(!retry&&(old.state!=='loading'||inFlight.has(path)))return;const attempt=old.attempt+(retry?1:0),url=import.meta.env.BASE_URL+path+(attempt?'?artRetry='+attempt:'');assets.set(path,{state:'loading',url,attempt});inFlight.add(path);notify();const image=new Image();const finish=(state:'ready'|'error')=>{if(assets.get(path)?.attempt!==attempt)return;assets.set(path,{state,url,attempt});inFlight.delete(path);notify();};image.onload=()=>finish('ready');image.onerror=()=>finish('error');image.src=url;}
export function useArtwork(path:string){const state=useSyncExternalStore(subscribe,()=>snapshot(path),()=>snapshot(path));useEffect(()=>{load(path);},[path]);return state;}
export function ArtworkStatus({path,label}:{path:string;label:string}){const art=useArtwork(path);if(art.state==='ready')return null;return <div className={'artwork-load-status is-'+art.state}>{art.state==='loading'?<LoadingMark compact label={'绘制'+label}/>:<><span role="status">{label}未能载入，名称与操作仍可使用。</span><button type="button" onClick={()=>load(path,true)}>重试画面</button></>}</div>;}

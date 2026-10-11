import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {dismissCampaignLoad,useCampaignLoad,type CampaignLoad} from './campaignLoad';
import {InkMountains} from './LoadingMark';
import './immersiveInterface.css';
const paintings=[
 {path:'art/menu/realm-dawn.png',title:'江山初晓',text:'城阙与渡口之间，家国的故事仍在延续。',position:'58% 50%'},
 {path:'art/court/audience-hall-v1.png',title:'殿前风云',text:'一纸任命，一场朝议，皆能改变此身的去向。',position:'50% 45%'},
 {path:'art/estate/landscape.png',title:'田园暮色',text:'家业始于一田一舍，也系于每一个人的选择。',position:'50% 55%'},
];
export function CampaignLoading(){const state=useCampaignLoad();return state?<LoadingPainting key={state.id} state={state}/>:null;}
function LoadingPainting({state}:{state:CampaignLoad}){
 const ref=useRef<HTMLDialogElement>(null),[selected,setSelected]=useState(0),[loaded,setLoaded]=useState<number[]>([]),[failed,setFailed]=useState<number[]>([]),[slow,setSlow]=useState(false),[reduced,setReduced]=useState(false);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;dialog?.showModal();const timer=setTimeout(()=>setSlow(true),12000);const query=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setReduced(query.matches);sync();query.addEventListener('change',sync);return()=>{clearTimeout(timer);query.removeEventListener('change',sync);dialog?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
 useEffect(()=>{if(failed.includes(selected)&&loaded.length)setSelected(loaded[0]);},[failed,loaded,selected]);
 useEffect(()=>{if(reduced)return;const timer=setInterval(()=>setSelected(value=>{const available=loaded.filter(i=>i!==value);return available.find(i=>i>value)??available[0]??value;}),12000);return()=>clearInterval(timer);},[loaded,reduced]);
 useEffect(()=>{if(state.phase!=='revealing')return;const timer=setTimeout(()=>dismissCampaignLoad(state.id),reduced?0:550);return()=>clearTimeout(timer);},[state.phase,state.id,reduced]);
 const scene=paintings[selected],label=state.phase==='revealing'?'山河已就绪':state.phase==='scene'?'铺展山河':state.kind==='new'?'续写一段风云':'重启旧日山河';
 return createPortal(<dialog ref={ref} className={'campaign-loading'+(state.phase==='revealing'?' is-revealing':'')} aria-label="正在进入游戏" onCancel={e=>e.preventDefault()} onKeyDown={e=>e.stopPropagation()}>
  <div className="campaign-paintings" aria-hidden="true">{paintings.map((painting,i)=><img key={painting.path} src={import.meta.env.BASE_URL+painting.path} alt="" decoding="async" fetchPriority={i===0?'high':'low'} className={selected===i?'is-current':''} style={{objectPosition:painting.position}} onLoad={()=>setLoaded(items=>items.includes(i)?items:[...items,i])} onError={()=>{setFailed(items=>items.includes(i)?items:[...items,i]);setLoaded(items=>items.filter(n=>n!==i));}}/>)}</div>
  <div className="campaign-vignette"/><header><span className="campaign-title-seal" aria-hidden="true">风云</span><span>风云南北朝</span></header>
  <section className="campaign-painting-caption" key={selected}><h2>{scene.title}</h2><p>{scene.text}</p></section>
  <footer><div className="campaign-load-state" role="status" aria-live="polite"><InkMountains/><div><strong>{label}</strong><span>{state.phase==='world'?'正在读取人物、行记与世局':state.phase==='revealing'?'即将进入游戏':state.total?`地形与水系 ${state.completed??0} / ${state.total}`:'正在准备地图画面'}</span></div></div>{slow&&state.phase==='world'&&<small>仍在等待存档结果，请勿关闭本页。</small>}{slow&&state.phase==='scene'&&<button className="manuscript-link" onClick={()=>dismissCampaignLoad(state.id)}>查看地图载入详情</button>}<small className="campaign-art-caption">{failed.length===paintings.length?'绘卷暂未载入，游戏仍在准备':'南北朝题材绘卷 · 艺术演绎'}</small></footer>
 </dialog>,document.body);
}

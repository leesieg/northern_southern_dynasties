import {Map,Marker,NavigationControl} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './sample.css';
import {siteById} from '../../data/scenario';
import {ATLAS_MATERIALS,atlasMaterial} from '../atlasMaterials';
import {mapResourceUrl} from '../mapResources';
import {sampleStyle} from './style';
import {sampleLayer} from './layer';
import {SAMPLE_CITIES} from './presentation';

document.querySelector<HTMLDivElement>('#sample')!.innerHTML=`
 <main id="map" aria-label="关中河洛地图样板"></main>
 <header><p>风云南北朝</p><h1>关中 · 河洛</h1><span>地图样板</span></header>
 <nav aria-label="地图视角"><button data-view="region" aria-pressed="true">山河全景</button><button data-view="changan" aria-pressed="false">长安</button><button data-view="luoyang" aria-pressed="false">洛阳</button><button id="tilt" aria-pressed="true">立体地形</button></nav>
 <aside id="notice" role="status">正在加载真实地形与城邑模型…</aside>
 <footer><span>拖动平移 · 滚轮缩放 · 城邑铭牌定位</span><details><summary>样板说明</summary><p>独立实时渲染样板。地形为真实高程，城市尺度经过展示性夸张；河流、林地采用现代地理数据，建筑布局为美术示意。未接入存档或修改正式地图。</p><p>远景使用林地纹理，近景最多 280 株简化树木，避让城邑、水域、道路与陡坡。地理数据需联网加载。</p></details></footer>`;
const notice=document.querySelector<HTMLElement>('#notice')!;
const messages=new globalThis.Map<string,string>();
function report(key:string,message:string){messages.set(key,message);notice.textContent=[...messages.values()].join(' · ');}
const map=new Map({container:'map',style:sampleStyle(),center:[110.6,34.5],zoom:7,pitch:48,bearing:-8,minZoom:6,maxZoom:12,maxPitch:60,maxBounds:[[106.8,32.6],[114.6,36.7]],renderWorldCopies:false,
 canvasContextAttributes:{antialias:true,powerPreference:'high-performance'},attributionControl:{compact:true},transformRequest:url=>({url:mapResourceUrl(url,location.origin)})});
map.addControl(new NavigationControl({showCompass:true,visualizePitch:true}),'bottom-right');
map.getCanvas().setAttribute('aria-label','地图：方向键平移，加减号缩放；上方按钮可定位城邑');
let terrain=true,ready=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function focus(id:string){
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));
 const site=siteById[id];
 if(site)map.easeTo({center:[site.lon,site.lat],zoom:10.7,pitch:terrain?52:0,bearing:-12,duration:reduced?0:850});
 else map.easeTo({center:[110.6,34.5],zoom:7,pitch:terrain?48:0,bearing:-8,duration:reduced?0:850});
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.view!)));
document.querySelector<HTMLButtonElement>('#tilt')!.addEventListener('click',event=>{
 terrain=!terrain;(event.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(terrain));
 if(ready)map.setTerrain(terrain?{source:'dem-terrain',exaggeration:1.6}:null);
 map.easeTo({pitch:terrain?48:0,duration:reduced?0:400});
});
map.on('style.load',()=>{
 ready=true;
 for(const name of ATLAS_MATERIALS)map.addImage(name,atlasMaterial(name),{pixelRatio:2});
 map.setTerrain(terrain?{source:'dem-terrain',exaggeration:1.6}:null);
 try{map.addLayer(sampleLayer(message=>report('models',message)));}catch(e){report('models','模型图层无法启动：'+String(e));}
 for(const id of SAMPLE_CITIES){
  const s=siteById[id],button=document.createElement('button');button.className='settlement';button.textContent=s.name;button.setAttribute('aria-label','查看'+s.name+'城邑样板');button.addEventListener('click',()=>focus(id));
  new Marker({element:button,anchor:'bottom',offset:[0,-12]}).setLngLat([s.lon,s.lat]).addTo(map);
 }
 report('map','地理数据加载中');
});
map.on('idle',()=>{
 const z=map.queryTerrainElevation(map.getCenter());
 if(terrain&&z===null)report('map','当前位置高程尚未就绪');
 else if(!messages.get('map')?.includes('失败'))report('map','地图已就绪');
});
map.on('error',event=>report('map','地图资源加载失败，请检查网络后刷新：'+event.error.message.slice(0,130)));
window.addEventListener('pagehide',()=>map.remove(),{once:true});

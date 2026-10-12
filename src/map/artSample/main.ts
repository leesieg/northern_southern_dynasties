import './sample.css';
import {mountArtSample} from './scene';
import {views,type View,type SampleSeason} from './layout';

document.querySelector<HTMLDivElement>('#art-sample')!.innerHTML=`
 <main id="landscape" aria-label="建康周边三维美术样板"></main>
 <header class="sample-heading"><span class="sample-seal" aria-hidden="true">山河</span><div><p>风云南北朝 · 独立美术样板</p><h1>建康山水</h1></div></header>
 <nav class="sample-views" aria-label="观察距离">${Object.entries(views).map(([key,v])=>`<button data-view="${key}" aria-pressed="${key==='middle'}">${v.label}</button>`).join('')}</nav>
 <div id="sample-labels" aria-label="样板城邑"></div>
 <aside class="sample-caption"><span class="caption-line"></span><h2 id="view-title">江流、田野与聚落</h2><p>城郭入山水，林田接江岸。</p></aside>
 <section class="sample-options" aria-label="美术预览选项"><div role="group" aria-label="季节"><button data-season="summer" aria-pressed="true">夏</button><button data-season="autumn" aria-pressed="false">秋</button><button data-season="winter" aria-pressed="false">冬</button></div><button id="walk" aria-pressed="false">行走演示</button><button id="reset">重置镜头</button></section>
 <footer class="sample-footer"><span>拖动平移 · 右键旋转 · 滚轮缩放</span><details><summary>样板范围与来源</summary><p>独立美术场景，未接入正式游戏，不加载或写入存档。四名行旅与兵模仅供比例、材质和动作比较，不代表当前游戏中的人物或军队。</p><p>建康及周边地点沿用项目坐标；地形使用本地 Mapzen / AWS 高程（SRTM、GMTED2010：USGS；ETOPO1：NOAA），建康局部补充约 65 米采样高程，河道沿用 Natural Earth 数据。高程与河宽作展示夸张；岩体、林地、田块、城郊与小路为美术布置，不是南北朝景观复原。</p><p>本轮细化：真实山脊、风化岩体、变宽河道与浅水岸坡。正式地图与现有人物肖像保持独立；画面待人工确认。</p></details></footer>
 <div id="sample-loading" role="status"><span class="loading-seal">山水待展</span><p id="load-message">正在读取真实高程…</p><button id="retry" hidden>重新加载</button></div>`;

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
byId('retry').onclick=()=>location.reload();
void mountArtSample(byId('landscape'),message=>{byId('load-message').textContent=message;}).then(sample=>{
 byId('sample-loading').hidden=true;
 let selected:View='middle';
 const focus=(view:View)=>{selected=view;sample.view(view);byId('view-title').textContent=views[view].description;document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));};
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>{b.onclick=()=>focus(b.dataset.view as View);});
 document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b=>{b.onclick=()=>{sample.season(b.dataset.season as SampleSeason);document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));};});
 byId('walk').onclick=()=>{const enabled=byId('walk').getAttribute('aria-pressed')!=='true';sample.walk(enabled);byId('walk').setAttribute('aria-pressed',String(enabled));};
 byId('reset').onclick=()=>focus(selected);
 window.addEventListener('pagehide',sample.dispose,{once:true});
}).catch(error=>{byId('load-message').textContent='样板未能载入：'+(error instanceof Error?error.message:String(error));byId('retry').hidden=false;console.error(error);});

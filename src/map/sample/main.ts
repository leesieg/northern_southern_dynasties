import './sample.css';
import {mountCampaign} from './scene';

document.querySelector<HTMLDivElement>('#sample')!.innerHTML=`
 <main id="map" aria-label="关中河洛三维战役地图"></main>
 <header><span class="seal" aria-hidden="true">山河</span><div><p>风云南北朝</p><h1>关中 · 河洛</h1></div></header>
 <nav aria-label="战役地图视角"><button data-view="region" aria-pressed="false">山河全览</button><button data-view="changan" aria-pressed="false">长安</button><button data-view="luoyang" aria-pressed="true">洛阳</button></nav>
 <section class="season-controls" aria-label="四季预览"><div role="group" aria-label="选择季节"><button data-season="spring" aria-pressed="false" disabled>春</button><button data-season="summer" aria-pressed="true" disabled>夏</button><button data-season="autumn" aria-pressed="false" disabled>秋</button><button data-season="winter" aria-pressed="false" disabled>冬</button></div><p class="season-description" role="status">林深田茂 · 山河苍翠</p></section>
 <div id="labels" aria-label="城邑"></div>
 <aside id="notice" role="status"><span id="notice-text">正在展开山河…</span><button id="retry" hidden>重新加载</button></aside>
 <div class="map-tools" aria-label="镜头操作"><button id="rotate" title="向右旋转镜头" aria-label="向右旋转镜头">↻</button><button id="zoom-in" title="拉近" aria-label="拉近">＋</button><button id="zoom-out" title="拉远" aria-label="拉远">−</button><button id="reset" title="恢复洛阳视角" aria-label="恢复洛阳视角">⌂</button></div>
 <footer><span>拖动平移 · 右键旋转 · 滚轮缩放</span><details><summary>地图说明</summary><p>关中—河洛三维战役地图样板，尚未接入正式游戏。四季为独立美术预览，不随营建日期推进，不影响产出或工期。</p><p>山脉采用真实高程，河流采用 Natural Earth 数据；高程、河宽与城邑尺度为战役展示夸张。城建、田地和疏林为美术布局，不代表历史复原或古代林地分布。</p><p>左键拖动平移，右键拖动旋转，滚轮缩放；地图聚焦后方向键平移，Q / E 旋转，＋ / − 缩放。</p><p>地形：Mapzen / AWS Terrain Tiles，SRTM 与 GMTED2010 courtesy of USGS，ETOPO1 courtesy of NOAA。河流：Natural Earth（公共领域）。</p></details></footer>`;
const retry=document.querySelector<HTMLButtonElement>('#retry')!;
retry.addEventListener('click',()=>location.reload());
void mountCampaign(document.querySelector<HTMLElement>('#map')!,message=>{document.querySelector('#notice-text')!.textContent=message;}).then(()=>{
 document.querySelector('#notice')!.classList.add('ready');
}).catch(error=>{document.querySelector('#notice-text')!.textContent='地图未能载入：'+String(error instanceof Error?error.message:error);retry.hidden=false;});

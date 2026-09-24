import {facialGenes,founderGenome,inheritGenome,type Genome} from '../core/genetics';
import {composePaintedStudy,paintedFeatureVariants,type PaintedFeature,type PaintedVariant} from '../character/paintedStudy';
import {renderPaintedPortrait} from '../character/paintedRenderer';

const parentA=founderGenome('painted-study-parent-a'),parentB=founderGenome('painted-study-parent-b');
for(const gene of facialGenes){parentA.facial![gene]=[20,35];parentB.facial![gene]=[65,80];}
let seed=546,child:Genome,parentView:'a'|'b'|'child'='child',robe:PaintedVariant='a',closeup=true,revision=0,generation=0;
let overrides:Partial<Record<PaintedFeature,PaintedVariant>>={};
const root=document.querySelector<HTMLElement>('#portrait-study');
if(!root)throw new Error('缺少人物样板容器');
root.innerHTML=`
 <header><p class="eyebrow">风云南北朝 · C 线描淡彩</p><h1>一副眉眼，几分家风</h1><p>独立组合样板 · 双亲与子代统一采用青年男性底稿，便于比较五官。</p><a href="./index.html">返回四人原画</a></header>
 <div class="workbench"><section class="portrait-panel" aria-label="当前组合人物"><div class="portrait-toolbar"><strong id="portrait-name">子代组合</strong><button id="view-toggle" type="button" aria-pressed="true">查看半身</button></div><div id="portrait-canvas" class="portrait-canvas"></div><p id="portrait-status" role="status" aria-live="polite">正在载入人物素材…</p></section>
 <aside><h2>五官组合</h2><div class="feature-controls"></div><label class="select-field">袍服<select id="robe"><option value="a">紫灰锦袍</option><option value="b">青色袍服</option></select></label><button id="restore" type="button">恢复遗传组合</button><p class="quiet">试换部件只影响当前画面，不改写双亲或子代基因。</p><h2>家族相貌</h2><div class="family"><button type="button" data-person="a"><span class="family-face" id="parent-a"></span><span>双亲一</span></button><button type="button" data-person="b"><span class="family-face" id="parent-b"></span><span>双亲二</span></button><button type="button" data-person="child" aria-pressed="true"><span class="family-face" id="child"></span><span>子代</span></button></div><button class="primary" id="next-child" type="button">生成另一位子代</button><p id="inheritance" class="quiet"></p><details><summary>本轮范围</summary><p>两组绘制五官、两套袍服、一种青年男性规格。此页不写入游戏存档，也不会在世界中创建人物。女性、年龄、脸型、文化衣冠和特质配件尚未接入这套新素材；拼接观感待人工验收。</p></details></aside></div>`;

const labels:Record<PaintedFeature,[string,string,string]>={brows:['眉形','浓眉','平眉'],eyes:['眼形','杏眼','细眼'],nose:['鼻形','秀鼻','宽鼻'],mouth:['口形','丰唇','薄唇']};
const controlRoot=root.querySelector('.feature-controls')!;
for(const [feature,[label,a,b]] of Object.entries(labels)){
 const field=document.createElement('label');field.className='select-field';field.textContent=label;
 const select=document.createElement('select');select.dataset.feature=feature;
 for(const [value,text] of [['inherited','随基因'],['a',a],['b',b]]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 select.addEventListener('change',()=>{if(select.value==='inherited')delete overrides[feature as PaintedFeature];else overrides[feature as PaintedFeature]=select.value as PaintedVariant;void renderCurrent();});
 field.append(select);controlRoot.append(field);
}
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
function activeGenome(){return parentView==='a'?parentA:parentView==='b'?parentB:child;}
function clearOverrides(){overrides={};for(const select of root!.querySelectorAll<HTMLSelectElement>('[data-feature]'))select.value='inherited';}
function canvasView(source:HTMLCanvasElement,face:boolean,small=false){
 const target=document.createElement('canvas');target.width=face?(small?180:510):768;target.height=face?(small?190:540):1152;
 const ctx=target.getContext('2d');if(!ctx)throw new Error('无法显示人物画面');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(face){const sx=source.width/1024,sy=source.height/1536;ctx.drawImage(source,310*sx,180*sy,340*sx,360*sy,0,0,target.width,target.height);}
 else ctx.drawImage(source,0,0,target.width,target.height);
 target.setAttribute('role','img');target.setAttribute('aria-label',face?'人物面容近景':'人物半身立绘');return target;
}
async function renderCurrent(){
 const token=++revision,status=element('portrait-status'),container=element('portrait-canvas');container.setAttribute('aria-busy','true');status.textContent='正在组合人物…';
 const who=parentView==='a'?'双亲一':parentView==='b'?'双亲二':'子代';
 element('portrait-name').textContent=who+(Object.keys(overrides).length?' · 试换五官':' · 遗传组合');
 for(const button of root!.querySelectorAll<HTMLButtonElement>('[data-person]'))button.setAttribute('aria-pressed',String(button.dataset.person===parentView));
 try{
  const source=await renderPaintedPortrait(composePaintedStudy(activeGenome(),{robe,features:overrides}));
  if(token!==revision)return;
  container.replaceChildren(canvasView(source,closeup));
  const choices={...paintedFeatureVariants(activeGenome()),...overrides};
  status.textContent=Object.entries(choices).map(([key,v])=>labels[key as PaintedFeature][v==='a'?1:2]).join(' · ');
 }catch(error){if(token===revision){container.replaceChildren();status.textContent=error instanceof Error?error.message:'人物素材载入失败，请重试';}}
 finally{if(token===revision)container.setAttribute('aria-busy','false');}
}
async function renderFamily(){
 const token=generation;
 for(const [id,genome] of [['parent-a',parentA],['parent-b',parentB],['child',child]] as const){
  const target=element(id);
  try{const source=await renderPaintedPortrait(composePaintedStudy(genome));if(token!==generation)return;target.replaceChildren(canvasView(source,true,true));}
  catch{if(token===generation)target.textContent='载入失败';}
 }
}
function nextChild(){
 const result=inheritGenome(parentA,parentB,seed);seed=result.nextSeed;child=result.genome;generation++;parentView='child';clearOverrides();
 element('inheritance').textContent=`第 ${generation} 组子代。各五官位点分别取得双亲的一份参数，重新生成会保留同一对双亲。`;
 void renderCurrent();void renderFamily();
}
element('view-toggle').addEventListener('click',()=>{closeup=!closeup;element('view-toggle').textContent=closeup?'查看半身':'查看面容';element('view-toggle').setAttribute('aria-pressed',String(closeup));void renderCurrent();});
element<HTMLSelectElement>('robe').addEventListener('change',event=>{robe=(event.target as HTMLSelectElement).value as PaintedVariant;void renderCurrent();});
element('restore').addEventListener('click',()=>{clearOverrides();void renderCurrent();void renderFamily();});
element('next-child').addEventListener('click',nextChild);
for(const button of root.querySelectorAll<HTMLButtonElement>('[data-person]'))button.addEventListener('click',()=>{parentView=button.dataset.person as typeof parentView;clearOverrides();void renderCurrent();});
nextChild();

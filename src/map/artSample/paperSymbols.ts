import '../campaignSymbols.css';
import {Vector3,type Camera} from 'three';
import type {SampleTerrain} from './terrain';

const drawings={
 city:'<path d="M5 13h22l-3-4H8zM8 14v13h16V14M12 27v-8h8v8M3 28h26M10 8l6-5 6 5"/>',
 fort:'<path d="M5 28V9h5v4h4V9h4v4h4V9h5v19zM12 28v-8h8v8M4 9V5h7v4m10 0V5h7v4"/>',
 capital:'<path d="m16 3 4 8 9 1-7 7 2 10-8-5-8 5 2-10-7-7 9-1z"/>',
 army:'<path d="m7 3 21 24-3 3L4 6zM25 3 4 27l3 3L28 6zM3 21l8 8m10-1 8-8"/>',
 garrison:'<path d="M7 5h18v12c0 7-9 12-9 12S7 24 7 17zM16 9v15m-5-10h10"/>',
 port:'<path d="M4 21h24l-5 7H9zM16 3v18M18 5l9 12h-9zM13 8 6 18h7M2 30q4-4 8 0t8 0t8 0"/>',
 grain:'<path d="M16 29V5m0 8c-8 0-9-6-9-6 7 0 9 6 9 6Zm0 7c-8 0-10-6-10-6 7 0 10 6 10 6Zm0 6c-8 0-10-5-10-5 7 0 10 5 10 5Zm0-15c7 0 9-6 9-6-7 0-9 6-9 6Zm0 8c7 0 10-6 10-6-7 0-10 6-10 6Zm0 7c7 0 10-6 10-6-7 0-10 6-10 6Z"/>',
 coin:'<circle cx="16" cy="16" r="12"/><path d="M12 12h8v8h-8zM7 10l2-2m14 2-2-2M7 22l2 2m14-2-2 2"/>',
 mine:'<path d="m3 27 6-13 7 4 7-10 7 19zM8 5q12-5 20 6M19 5 7 28"/>',
 horse:'<path d="m8 29 1-11-4-3 7-10 1-4 4 4 6 2-3 6 6 10-3 6zM11 11h2M18 8l-3 9 6 8"/>',
 trade:'<path d="M3 11h25l-6-6M29 22H4l6 6M10 14v5m6-5v5m6-5v5"/>',
 objective:'<path d="M8 30V3m1 2c7-6 12 6 20 0v14c-8 6-13-6-20 0"/>',
};
export type PaperIcon=keyof typeof drawings;
export const paperIconNames:Record<PaperIcon,string>={city:'城邑等级',fort:'关隘',capital:'都城',army:'军队',garrison:'驻军',port:'港口',grain:'粮食',coin:'商税',mine:'矿产',horse:'马匹',trade:'商路',objective:'事项'};
export function paperIcon(kind:PaperIcon){return `<svg viewBox="0 0 32 32" aria-hidden="true">${drawings[kind]}</svg>`;}
const sets:PaperIcon[][]=[['capital','city','garrison','coin'],['port','army','trade'],['fort','horse'],['grain','city'],['mine','city'],['grain','garrison'],['trade','objective'],['fort','objective']];

/** Explicit art specimens. No world state, gameplay values or portrait pipeline is replaced. */
export function createPaperSymbols(terrain:SampleTerrain,container:HTMLElement){
 const root=document.createElement('div');root.className='paper-symbols';root.setAttribute('aria-label','舆图图标样式预览，非本局状态');container.append(root);
 const points=terrain.cities.map((town,index)=>{
  const element=document.createElement('div');element.className='paper-symbol-cluster';
  element.innerHTML=`<span class="paper-banner" aria-label="梁旗样式" role="img">梁</span><span class="paper-icon-row">${sets[index%sets.length].map(kind=>`<span class="paper-map-icon icon-${kind}" tabindex="0" role="img" aria-label="${paperIconNames[kind]}样式预览">${paperIcon(kind)}${kind==='city'?'<b class="paper-tier">3</b>':''}<span class="paper-symbol-tip">${paperIconNames[kind]} · 样式预览</span></span>`).join('')}</span>`;
  root.append(element);return {element,point:new Vector3(town.x,.08,town.z)};
 });
 // Two portrait pennants demonstrate character and commander silhouettes with existing artwork.
 for(const [cityId,dx,dz,type] of [['jiankang',9,-8,'人物'],['jiangning',-8,-8,'统帅']] as const){const town=terrain.cities.find(t=>t.id===cityId);if(!town)continue;
  const element=document.createElement('div');element.className='paper-person'+(type==='统帅'?' commander':'');element.tabIndex=0;element.setAttribute('role','img');element.setAttribute('aria-label',type+'肖像、军旗及兵力条样式预览，不代表实际人物驻地或兵力');
  element.innerHTML=`<span class="paper-person-flag">${type==='统帅'?'军':'梁'}</span><span class="paper-strength" aria-hidden="true"></span><span class="paper-person-face"></span><span class="paper-person-title">${type} · 示例</span><span class="paper-symbol-tip">肖像／旗帜／兵力条 · 样式预览</span>`;
  root.append(element);points.push({element,point:new Vector3(town.x+dx,.08,town.z+dz)});
 }
 for(const [x,z,kind] of [[22,-29,'army'],[-19,-25,'horse'],[-8,-9,'port']] as const){const element=document.createElement('div');element.className='paper-resource-pin';element.innerHTML=`<span class="paper-map-icon icon-${kind}" tabindex="0" role="img" aria-label="${paperIconNames[kind]}样式预览">${paperIcon(kind)}<span class="paper-symbol-tip">${paperIconNames[kind]} · 样式预览</span></span>`;root.append(element);points.push({element,point:new Vector3(x,.08,z)});}
 const projected=new Vector3();root.hidden=true;
 return {update(camera:Camera,width:number,height:number,paper:number){root.hidden=false;root.style.opacity='1';
  for(const {element,point} of points){projected.copy(point);projected.y=terrain.height(point.x,point.z)*(1-paper)+.08;projected.project(camera);element.hidden=projected.z < -1||projected.z>1||Math.abs(projected.x)>1.12||Math.abs(projected.y)>1.12;element.style.left=(projected.x*.5+.5)*width+'px';element.style.top=(-projected.y*.5+.5)*height+'px';}},dispose(){root.remove();}};
}

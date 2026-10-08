import {ArtIcon,type ArtName} from './ArtIcon';
import {ViewControl} from './ViewControl';
import type {MapMode} from '../map/WorldMap';
import type {CameraAction} from '../map/atlasPresentation';

type Props={mode:MapMode;onMode:(mode:MapMode)=>void;hasRealm:boolean;options:boolean;onOptions:()=>void;travelers:boolean;onTravelers:()=>void;tilted:boolean;onTilted:()=>void;models:boolean;onModels:()=>void;motion:boolean;onMotion:()=>void;sceneryDetail:boolean;onSceneryDetail:()=>void};
type Glyph='in'|'out'|'location'|'camera'|'layers'|'settings'|'left'|'right'|'north'|'player'|'selected'|'home'|'political'|'domains'|'diplomacy'|'terrain'|'roads';
const toolArt:Partial<Record<Glyph,ArtName>>={location:'person',camera:'world',layers:'world',settings:'diligent',player:'person',selected:'city',home:'world',political:'influence',domains:'city',diplomacy:'gregarious',terrain:'world',roads:'grain'};
function MapToolIcon({name}:{name:Glyph}){const art=toolArt[name];return art?<ArtIcon name={art} size={25}/>:<span aria-hidden="true" className="map-bearing-glyph">{name==='left'?'↶':name==='right'?'↷':'北'}</span>;}
export function MapCameraControls({focus}:{focus:(action:CameraAction)=>void}){
 return <div className="zoom-tools compact-map-tools" role="group" aria-label="地图视角">
 {(['in','out'] as const).map(action=><ViewControl key={action} action={action} label={action==='in'?'放大地图':'缩小地图'} tooltip={false} onClick={()=>focus(action)}/>)}
 {([{icon:'location',label:'定位',items:[['player','此身'],['selected','所选城邑'],['home','天下舆图']]},{icon:'camera',label:'视角',items:[['left','向左旋转'],['north','北向回正'],['right','向右旋转']]}] as const).map(group=><details name="atlas-tools" className="map-tool-group" key={group.icon} onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}><summary title={group.label} aria-label={group.label}><MapToolIcon name={group.icon}/><small>{group.label}</small></summary><div className="map-tool-popover">{group.items.map(([action,label])=><button key={action} onClick={e=>{focus(action);const details=e.currentTarget.closest('details');if(details){details.open=false;details.querySelector('summary')?.focus();}}}><MapToolIcon name={action}/>{label}</button>)}</div></details>)}
 </div>;
}
export function MapDisplayControls(p:Props){
 return <><div className="campaign-mode-arc" role="group" aria-label="地图模式">{([['political','势力'],['domains','郡县'],['diplomacy','外交'],['terrain','山川'],['roads','道路']] as const).map(([id,label])=><button key={id} className={'campaign-dial-mode mode-'+id} disabled={id==='diplomacy'&&!p.hasRealm} aria-label={label+'地图'} title={id==='diplomacy'&&!p.hasRealm?'当前没有政权外交资料':label+'地图'} aria-pressed={p.mode===id} onClick={()=>p.onMode(id)}><MapToolIcon name={id}/></button>)}</div><button id="atlas-display-toggle" className="map-options-toggle" title="地图显示设置" aria-expanded={p.options} aria-controls="atlas-display-options" onClick={p.onOptions} aria-label="地图显示设置"><MapToolIcon name="settings"/><span>显示</span></button>
 {p.options&&<section id="atlas-display-options" className="map-options" aria-label="地图显示设置" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();p.onOptions();document.getElementById('atlas-display-toggle')?.focus();}}}><header><strong>舆图显示</strong><button aria-label="关闭地图显示设置" onClick={p.onOptions}><span aria-hidden="true">×</span></button></header>{([
 ['在途人物',p.travelers,p.onTravelers,'天下视野保留玩家行旅，拉近后显示其他在途人物'],
 ['立体山河',p.tilted,p.onTilted,'近景使用真实高程，远景自动铺平为纸质舆图'],
 ['近景细节',p.sceneryDetail,p.onSceneryDetail,'开启细密建筑、林地树木与象征农田；关闭以减少图形负担，城池与操作仍保留'],
 ['军队兵模',p.models,p.onModels,'拉近时显示兵模；关闭后使用军旗'],
 ['军队动画',p.motion,p.onMotion,'关闭以减少动态；位置与军情照常更新'],
 ] as const).map(([label,value,onClick,hint])=><div key={label} className="map-option"><button aria-describedby={"map-option-"+label} aria-pressed={value} onClick={onClick}><span>{label}</span><b aria-hidden="true">{value?'开':'关'}</b></button><small id={"map-option-"+label}>{hint}</small></div>)}</section>}
 </>;
}

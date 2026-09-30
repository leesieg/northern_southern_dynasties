import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {ViewControl} from './ViewControl';
import type {MapMode} from '../map/WorldMap';

type CameraAction='in'|'out'|'player'|'selected'|'home';
type Props={mode:MapMode;onMode:(mode:MapMode)=>void;hasRealm:boolean;options:boolean;onOptions:()=>void;travelers:boolean;onTravelers:()=>void;tilted:boolean;onTilted:()=>void;models:boolean;onModels:()=>void;motion:boolean;onMotion:()=>void};
export function MapCameraControls({focus}:{focus:(action:CameraAction)=>void}){
 return <div className="zoom-tools" role="group" aria-label="地图视角">
  <ViewControl action="in" label="放大地图" hint="拉近城邑，查看山川与军队。" onClick={()=>focus('in')}/>
  <ViewControl action="out" label="缩小地图" hint="拉远至天下视野时自动展开纸质舆图。" onClick={()=>focus('out')}/>
  {([['player','此身','person'],['selected','所选城邑','city'],['home','天下舆图','world']] as const).map(([action,label,icon])=><HoverHint key={action} label={label} content={action==='home'?'展开天下纸质舆图':`定位${label}`}><button className="art-map-button" aria-label={label} onClick={()=>focus(action)}><ArtIcon name={icon}/></button></HoverHint>)}
 </div>;
}
export function MapDisplayControls(p:Props){
 return <><div className="map-toolbox"><div className="map-modes" role="group" aria-label="地图模式">{([['political','势力','influence'],['domains','郡县','city'],['diplomacy','外交','gregarious'],['terrain','山川','world'],['roads','道路','grain']] as const).filter(([id])=>id!=='diplomacy'||p.hasRealm).map(([id,label,icon])=><HoverHint key={id} label={label} content={{political:'查看势力疆域与城邑控制',domains:'查看州郡县层级；点选辖区治理',diplomacy:'查看与本国的外交关系',terrain:'查看山川水系，收起势力填色',roads:'查看可通行道路；右键城邑预览行程'}[id]}><button className={p.mode===id?'active':''} aria-pressed={p.mode===id} onClick={()=>p.onMode(id)}><ArtIcon name={icon} size={25}/><span>{label}</span></button></HoverHint>)}</div><HoverHint label="地图显示" content="调整人物、山河、军队模型与动画显示"><button id="atlas-display-toggle" className="map-options-toggle" aria-expanded={p.options} aria-controls="atlas-display-options" onClick={p.onOptions} aria-label="地图显示设置"><ArtIcon name="diligent" size={25}/><span>显示</span></button></HoverHint></div>
 {p.options&&<section id="atlas-display-options" className="map-options" aria-label="地图显示设置"><header><strong>舆图显示</strong><button aria-label="关闭地图显示设置" onClick={p.onOptions}><span aria-hidden="true">×</span></button></header>{([
 ['在途人物',p.travelers,p.onTravelers,'天下视野保留玩家行旅，拉近后显示其他在途人物'],
 ['立体山河',p.tilted,p.onTilted,'近景使用真实高程，远景自动铺平为纸质舆图'],
 ['军队兵模',p.models,p.onModels,'拉近时显示兵模；关闭后使用军旗'],
 ['军队动画',p.motion,p.onMotion,'关闭以减少动态；位置与军情照常更新'],
 ] as const).map(([label,value,onClick,hint])=><HoverHint key={label} label={label} content={hint}><button aria-pressed={value} onClick={onClick}><span>{label}</span><b aria-hidden="true">{value?'开':'关'}</b></button></HoverHint>)}</section>}
 </>;
}

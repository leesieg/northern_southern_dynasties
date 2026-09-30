import {ArtIcon} from './ArtIcon';
import {ViewControl} from './ViewControl';
import type {MapMode} from '../map/WorldMap';

type CameraAction='in'|'out'|'player'|'selected'|'home';
type Props={mode:MapMode;onMode:(mode:MapMode)=>void;hasRealm:boolean;options:boolean;onOptions:()=>void;travelers:boolean;onTravelers:()=>void;tilted:boolean;onTilted:()=>void;models:boolean;onModels:()=>void;motion:boolean;onMotion:()=>void};
export function MapCameraControls({focus}:{focus:(action:CameraAction)=>void}){
 return <div className="zoom-tools" role="group" aria-label="地图视角">
  <ViewControl action="in" label="放大地图" tooltip={false} onClick={()=>focus('in')}/>
  <ViewControl action="out" label="缩小地图" tooltip={false} onClick={()=>focus('out')}/>
  {([['player','此身','person'],['selected','所选城邑','city'],['home','天下舆图','world']] as const).map(([action,label,icon])=><button key={action} className="art-map-button" aria-label={label} onClick={()=>focus(action)}><ArtIcon name={icon} size={24}/><small>{action==='player'?'此身':action==='selected'?'城邑':'天下'}</small></button>)}
 </div>;
}
export function MapDisplayControls(p:Props){
 return <><div className="map-toolbox"><div className="map-modes" role="group" aria-label="地图模式">{([['political','势力','influence'],['domains','郡县','city'],['diplomacy','外交','gregarious'],['terrain','山川','world'],['roads','道路','grain']] as const).filter(([id])=>id!=='diplomacy'||p.hasRealm).map(([id,label,icon])=><button key={id} className={p.mode===id?'active':''} aria-pressed={p.mode===id} onClick={()=>p.onMode(id)}><ArtIcon name={icon} size={25}/><span>{label}</span></button>)}</div><button id="atlas-display-toggle" className="map-options-toggle" aria-expanded={p.options} aria-controls="atlas-display-options" onClick={p.onOptions} aria-label="地图显示设置"><ArtIcon name="diligent" size={25}/><span>显示</span></button></div>
 {p.options&&<section id="atlas-display-options" className="map-options" aria-label="地图显示设置"><header><strong>舆图显示</strong><button aria-label="关闭地图显示设置" onClick={p.onOptions}><span aria-hidden="true">×</span></button></header>{([
 ['在途人物',p.travelers,p.onTravelers,'天下视野保留玩家行旅，拉近后显示其他在途人物'],
 ['立体山河',p.tilted,p.onTilted,'近景使用真实高程，远景自动铺平为纸质舆图'],
 ['军队兵模',p.models,p.onModels,'拉近时显示兵模；关闭后使用军旗'],
 ['军队动画',p.motion,p.onMotion,'关闭以减少动态；位置与军情照常更新'],
 ] as const).map(([label,value,onClick,hint])=><div key={label} className="map-option"><button aria-describedby={"map-option-"+label} aria-pressed={value} onClick={onClick}><span>{label}</span><b aria-hidden="true">{value?'开':'关'}</b></button><small id={"map-option-"+label}>{hint}</small></div>)}</section>}
 </>;
}

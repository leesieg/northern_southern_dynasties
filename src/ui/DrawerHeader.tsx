import type {CSSProperties,ReactNode} from 'react';
export function DrawerHeader({title,onClose,onBack,action}:{title:string;onClose:()=>void;onBack?:()=>void;action?:ReactNode}){
 const scene=title==='政务'||title==='邦交'?'court/audience-hall-v1.png':title==='经济'||title==='人物'?'estate/landscape.png':'menu/realm-dawn.png';
 return <header className="dynasty-drawer-header" style={{'--drawer-scene':`url("${import.meta.env.BASE_URL}art/${scene}")`} as CSSProperties}>
  <svg className="drawer-ornament" viewBox="0 0 440 76" preserveAspectRatio="none" aria-hidden="true"><path d="M2 73V20Q2 3 20 3H420Q438 3 438 20V73M7 70V23Q7 9 23 9H417Q433 9 433 23V70"/><path d="M16 18q18 0 18 17Q16 35 16 18Zm408 0q-18 0-18 17 18 0 18-17ZM195 4l10 8 15-8 15 8 10-8M2 73h436"/></svg>
  <div className="drawer-header-leading">{onBack&&<button className="drawer-medallion" title="返回上一级" aria-label="返回上一级" onClick={onBack}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5-6 6 6 6M4 11h10a6 6 0 0 1 6 6v2"/></svg></button>}</div>
  <h2>{title}</h2>
  <div className="drawer-header-trailing">{action}<button className="drawer-medallion" autoFocus title="关闭抽屉" aria-label="关闭抽屉" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
 </header>;
}

import {useEffect,useRef} from 'react';
export function TimeControl({date,day,speed,locked,lockReason,onSpeed,onStep,onMenu,onSave}:{date:string;day:number;speed:number;locked:boolean;lockReason:string;onSpeed:(speed:number)=>void;onStep:()=>void;onMenu:()=>void;onSave:()=>void}){
 const lastSpeed=useRef(1);useEffect(()=>{if(speed)lastSpeed.current=speed;},[speed]);
 useEffect(()=>{
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.code!=='Space'||event.repeat||event.isComposing||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
   const target=event.target;
   if(target instanceof HTMLElement&&(target.isContentEditable||target.closest('input,textarea,select,button,a[href],summary,[role="button"],[role="textbox"],[role="combobox"],[role="slider"],[role="checkbox"],[role="switch"]')))return;
   event.preventDefault();
   if(!locked)onSpeed(speed?0:lastSpeed.current);
  };
  window.addEventListener('keydown',onKeyDown);
  return()=>window.removeEventListener('keydown',onKeyDown);
 },[locked,speed,onSpeed]);
 return <section className="chronicle-control" aria-label="日期与时间控制">
  <div className="chronicle-date"><strong>{date}</strong><div><span>第 {day+1} 日</span><span className={speed?'clock-running':'clock-paused'} role="status">{locked?lockReason:speed?'时间推进':'已暂停'}</span></div></div>
  <button className="clock-play" disabled={locked} aria-keyshortcuts="Space" title={locked?lockReason:speed?'暂停时间（空格）':'继续时间（空格）'} aria-label={speed?'暂停时间':'继续时间'} onClick={()=>onSpeed(speed?0:lastSpeed.current)}><svg viewBox="0 0 24 24" aria-hidden="true">{speed?<path d="M7 5h3v14H7zm7 0h3v14h-3z"/>:<path d="m7 4 14 8-14 8z"/>}</svg></button>
  <div className="speed-dial" role="group" aria-label="时间速度">
   {[1,3,7].map((s,i)=><button key={s} className="tally-speed" disabled={locked} aria-pressed={speed===s} aria-label={`${s} 倍速度`} title={locked?lockReason:`${s} 倍速度`} onClick={()=>onSpeed(s)}><span className="tally-marks" aria-hidden="true">{Array.from({length:i+1},(_,n)=><i key={n}/>)}</span></button>)}
   <button className="clock-step" disabled={locked} title={locked?lockReason:'暂停并推进一日'} aria-label="暂停并推进一日" onClick={onStep}>+1 日</button>
  </div>
  <div className="clock-utilities"><button title="游戏菜单" aria-label="游戏菜单" onClick={onMenu}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14"/></svg></button><button title="存档与读档" aria-label="存档与读档" onClick={onSave}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v15M12 6C8 3 5 4 3 5v14c3-2 6-1 9 1 3-2 6-3 9-1V5c-3-2-6-1-9 1Z"/></svg></button></div>
 </section>;
}

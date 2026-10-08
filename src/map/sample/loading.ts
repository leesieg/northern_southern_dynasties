export function geographicStatus(state:{terrain:boolean;elevation:number|null;naturalLoaded:boolean;elapsed:number;error?:string}){
 if(state.error)return {message:'地图资源加载失败：'+state.error,retry:true};
 const pending=[];
 if(state.terrain&&state.elevation===null)pending.push('高程');
 if(!state.naturalLoaded)pending.push('河流与林地');
 if(!pending.length)return {message:'地图已就绪',retry:false};
 const slow=state.elapsed>=15000;
 return {message:(slow?'加载较慢：':'正在加载：')+pending.join('、')+(slow?'。可重试加载；已加载内容仍可操作。':''),retry:slow};
}

import {soundSettings,setSoundError} from './audioSettings';
export type SoundCue='select'|'confirm'|'cancel'|'blocked'|'arrival'|'complete'|'event';
const motifs:Record<SoundCue,number[]>={select:[587],confirm:[392,587],cancel:[440,330],blocked:[196,185],arrival:[392,523,587],complete:[392,494,587,784],event:[196,294,392]};
/** Original short plucked-string/wood motifs; no sampled instruments or historical-authenticity claim. */
export class GameSound {
 private context:AudioContext|null=null;private ambient:GainNode|null=null;private noise:AudioBufferSourceNode|null=null;
 private tracks:HTMLAudioElement[]=[];private active=false;private page:'menu'|'play'='menu';private fade?:ReturnType<typeof setInterval>;private lastCue=0;private destroyed=false;
 async unlock(){if(this.destroyed)return;this.active=true;try{this.context??=new AudioContext();if(this.context.state==='suspended')await this.context.resume();if(this.destroyed)return;this.prepareAmbience();this.update();}catch{setSoundError('浏览器暂未允许播放声音，可在声音设置中重试。');}}
 private prepareAmbience(){const c=this.context;if(!c||this.ambient)return;const buffer=c.createBuffer(1,c.sampleRate*5,c.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.025)/1.02;data[i]=last;}const noise=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=650;gain.gain.value=0;noise.connect(filter).connect(gain).connect(c.destination);noise.start();this.noise=noise;this.ambient=gain;}
 setPage(page:'menu'|'play'){this.page=page;this.update();}
 update(){if(!this.active||this.destroyed)return;const s=soundSettings(),silent=s.muted||document.hidden,index=this.page==='menu'?0:1;
  if(this.context){if(silent){void this.context.suspend();}else if(this.context.state==='suspended'){void this.context.resume().catch(()=>setSoundError('声音已暂停，请点击“试听与重试”。'));}this.ambient?.gain.setTargetAtTime(!silent&&this.page==='play'?s.ambience*.22:0,this.context.currentTime,.6);}
  if(!silent&&s.music>0&&!this.tracks[index]){const a=new Audio(import.meta.env.BASE_URL+`audio/asianoriental${index+1}.ogg`);a.loop=true;a.preload='none';a.volume=0;a.addEventListener('error',()=>{if(!this.destroyed)setSoundError('配乐载入失败；游戏可继续，请在声音设置中重试。');});this.tracks[index]=a;}
  if(silent){this.tracks.forEach(a=>{a.pause();a.volume=0;});if(this.fade)clearInterval(this.fade);return;}
  const chosen=this.tracks[index];if(s.music>0&&chosen?.paused)void chosen.play().catch(error=>{if(!this.destroyed&&!soundSettings().muted&&!document.hidden&&error?.name!=='AbortError')setSoundError('配乐尚未播放，请点击“试听与重试”。');});
  if(this.fade)clearInterval(this.fade);this.fade=setInterval(()=>{let moving=false;this.tracks.forEach((a,i)=>{const target=i===index?s.music:0,difference=target-a.volume;if(Math.abs(difference)<.008){a.volume=target;if(target===0)a.pause();}else{a.volume=Math.max(0,Math.min(1,a.volume+difference*.12));moving=true;}});if(!moving&&this.fade){clearInterval(this.fade);this.fade=undefined;}},50);
 }
 cue(kind:SoundCue){const c=this.context,s=soundSettings(),now=performance.now();if(!c||c.state!=='running'||s.muted||document.hidden||s.effects===0||now-this.lastCue<70)return;this.lastCue=now;
  motifs[kind].forEach((hz,index)=>{const start=c.currentTime+index*.085,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();osc.type='triangle';osc.frequency.setValueAtTime(hz,start);filter.type='lowpass';filter.frequency.setValueAtTime(2400,start);filter.frequency.exponentialRampToValueAtTime(500,start+.35);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(s.effects*.13,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+.38);osc.connect(filter).connect(gain).connect(c.destination);osc.start(start);osc.stop(start+.4);osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};});
 }
 retry(){setSoundError('');this.tracks.forEach(a=>{if(a.error)a.load();});void this.unlock().then(()=>this.cue('select'));}
 dispose(){this.destroyed=true;if(this.fade)clearInterval(this.fade);this.tracks.forEach(a=>{a.pause();a.removeAttribute('src');a.load();});this.noise?.stop();void this.context?.close();this.tracks=[];}
}

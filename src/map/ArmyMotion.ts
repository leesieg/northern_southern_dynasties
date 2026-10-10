import type {World,Journey} from '../core/types';
import type {Army} from '../core/realm';
import {armyMapPosition} from './armyMapPresentation';
import {armyCombatVisual} from '../core/combatPresentation';
import {sampleRoad,roadHeading} from '../core/routeGeometry';
interface Segment {route:string[];durations:number[];from:number;to:number;at:number;duration:number}
const progress=(j:Journey)=>j.durations.slice(0,j.leg).reduce((n,d)=>n+d,0)+j.elapsed;
const signature=(j:Pick<Journey,'route'|'durations'>)=>j.route.join('|')+':'+j.durations.join('|');
const displayedProgress=(s:Segment,now:number)=>s.from+(s.to-s.from)*Math.max(0,Math.min(1,(now-s.at)/s.duration));
/** Buffers only confirmed progress. Models, flags and hit targets share this sampler. */
export class ArmyMotion {
 private previous=new Map<number,Army>();private segments=new Map<number,Segment>();private world?:World;private day=0;private lastAdvance?:number;
 sync(w:World,now:number,running:boolean){
  if(!running){this.segments.clear();this.lastAdvance=undefined;}
  if(this.world===w)return;
  const advancing=!!this.world&&w.day>this.day&&w.day-this.day<=7,duration=this.lastAdvance===undefined?1000:Math.max(500,Math.min(1500,now-this.lastAdvance));
  const armies=w.realm?.armies??[];
  for(const a of armies){if(a.id===undefined)continue;const old=this.previous.get(a.id),j=old?.journey,visual=armyCombatVisual(w,a,'foot').state;
   const segment=this.segments.get(a.id),same=a.journey&&j&&signature(a.journey)===signature(j)&&a.journey.started===j.started;
   // Same-day unrelated commands must not snap a still-buffered march to its endpoint.
   if(running&&w.day===this.day&&same&&progress(a.journey!)===progress(j!)&&(visual==='marching'||visual==='retreat'))continue;
   if(running&&w.day===this.day&&segment&&!a.journey&&!j&&a.location===old?.location&&a.location===segment.route.at(-1)&&!a.withdrawalUntil&&visual==='garrison')continue;
   this.segments.delete(a.id);
   if(running&&advancing&&j&&(visual==='marching'||visual==='retreat'||!a.journey&&a.location===j.route.at(-1))){
    const to=same?progress(a.journey!):!a.journey&&a.location===j.route.at(-1)?j.durations.reduce((n,d)=>n+d,0):0,from=segment&&signature(segment)===signature(j)?displayedProgress(segment,now):progress(j);
    if(to>from)this.segments.set(a.id,{route:[...j.route],durations:[...j.durations],from,to,at:now,duration});
   }
  }
  if(running&&advancing)this.lastAdvance=now;
  const ids=new Set(armies.map(a=>a.id));for(const id of this.segments.keys())if(!ids.has(id))this.segments.delete(id);
  this.previous=new Map(armies.filter(a=>a.id!==undefined).map(a=>[a.id!,{...a,journey:a.journey?{...a.journey,route:[...a.journey.route],durations:[...a.journey.durations]}:null}]));this.world=w;this.day=w.day;
 }
 position(a:Army,now:number){const s=this.segments.get(a.id!);if(!s)return {...armyMapPosition(a),heading:a.journey?roadHeading(a.journey):undefined};let days=displayedProgress(s,now),leg=0;while(leg<s.durations.length-1&&days>=s.durations[leg])days-=s.durations[leg++];return {...sampleRoad(s.route[leg],s.route[leg+1],days/s.durations[leg]),heading:roadHeading({route:s.route,durations:s.durations,leg,elapsed:days,started:0})};}
 moving(a:Army,now:number){const s=this.segments.get(a.id!);return !!s&&now-s.at<s.duration;}
}

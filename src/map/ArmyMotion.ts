import type {World,Journey} from '../core/types';
import type {Army} from '../core/realm';
import {armyMapPosition} from './armyMapPresentation';
import {armyVisualState} from '../core/armyPresentation';
import {sampleRoad,roadHeading} from '../core/routeGeometry';
interface Segment {route:string[];durations:number[];from:number;to:number;at:number}
const progress=(j:Journey)=>j.durations.slice(0,j.leg).reduce((n,d)=>n+d,0)+j.elapsed;
const signature=(j:Journey)=>j.route.join('|')+':'+j.durations.join('|');
/** Buffers only confirmed progress. Models, flags and hit targets share this sampler. */
export class ArmyMotion {
 private previous=new Map<number,Army>();private segments=new Map<number,Segment>();private world?:World;private day=0;
 sync(w:World,now:number,running:boolean){
  if(this.world===w){if(!running)this.segments.clear();return;}
  const armies=w.realm?.armies??[];
  for(const a of armies){if(a.id===undefined)continue;const old=this.previous.get(a.id),j=old?.journey,visual=armyVisualState(w,a);
   this.segments.delete(a.id);
   if(running&&this.world&&w.day>this.day&&w.day-this.day<=7&&j&&(visual==='marching'||visual==='retreat'||!a.journey&&a.location===j.route.at(-1))){
    const same=a.journey&&signature(a.journey)===signature(j),to=same?progress(a.journey!):!a.journey&&a.location===j.route.at(-1)?j.durations.reduce((n,d)=>n+d,0):0,from=progress(j);
    if(to>from)this.segments.set(a.id,{route:[...j.route],durations:[...j.durations],from,to,at:now});
   }
  }
  this.previous=new Map(armies.filter(a=>a.id!==undefined).map(a=>[a.id!,{...a,journey:a.journey?{...a.journey,route:[...a.journey.route],durations:[...a.journey.durations]}:null}]));this.world=w;this.day=w.day;
 }
 position(a:Army,now:number){const s=this.segments.get(a.id!);if(!s)return {...armyMapPosition(a),heading:a.journey?roadHeading(a.journey):undefined};const t=Math.max(0,Math.min(1,(now-s.at)/850));let days=s.from+(s.to-s.from)*t,leg=0;while(leg<s.durations.length-1&&days>=s.durations[leg])days-=s.durations[leg++];return {...sampleRoad(s.route[leg],s.route[leg+1],days/s.durations[leg]),heading:roadHeading({route:s.route,durations:s.durations,leg,elapsed:days,started:0})};}
 moving(a:Army,now:number){const s=this.segments.get(a.id!);return !!s&&now-s.at<850;}
}

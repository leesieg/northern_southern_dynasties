import type {World,Person,Journey} from '../core/types';
import {mapTravelers} from '../core/residence';
import {isAlive} from '../core/lifeState';
import {position} from '../core/world';
import {sampleRoad,roadHeading} from '../core/routeGeometry';
interface Segment {route:string[];durations:number[];from:number;to:number;at:number;duration:number;pausedAt?:number;settling?:boolean}
const progress=(j:Journey)=>j.durations.slice(0,j.leg).reduce((n,d)=>n+d,0)+j.elapsed;
const signature=(j:Pick<Journey,'route'|'durations'>)=>j.route.join('|')+':'+j.durations.join('|');
const displayed=(s:Segment,now:number)=>s.from+(s.to-s.from)*Math.max(0,Math.min(1,((s.pausedAt??now)-s.at)/s.duration));
export const travelerPersonId=(w:World,id:string)=>id==='player'?(w.characterId??'fictional'):id;
/** Only interpolate progress already confirmed by the world. Labels and meshes share this sampler. */
export class TravelerMotion {
 private previous=new Map<string,Person>();private segments=new Map<string,Segment>();private world?:World;private day=0;private lastAdvance?:number;private running=false;
 people:Person[]=[];
 sync(w:World,now:number,running:boolean,animated=true){
  if(!animated)this.segments.clear();
  if(this.running!==running){
   this.lastAdvance=undefined;
   for(const s of this.segments.values()){
    if(!running&&!s.settling)s.pausedAt=now;
    else if(running&&s.pausedAt!==undefined){s.at+=now-s.pausedAt;delete s.pausedAt;}
   }
   this.running=running;
  }
  if(this.world===w)return;
  const advancing=!!this.world&&w.day>this.day&&w.day-this.day<=7,duration=this.lastAdvance===undefined?1000:Math.max(500,Math.min(3000,now-this.lastAdvance));
  const seen=new Set<string>();this.people=mapTravelers(w).filter(p=>{const id=travelerPersonId(w,p.id);if(seen.has(id)||!isAlive(w,id))return false;seen.add(id);return true;});
  for(const p of this.people){
   const old=this.previous.get(p.id),j=old?.journey,s=this.segments.get(p.id),same=p.journey&&j&&signature(p.journey)===signature(j)&&p.journey.started===j.started;
   if(w.day===this.day&&same&&progress(p.journey!)===progress(j!))continue;
   if(w.day===this.day&&s&&!p.journey&&!j&&p.location===old?.location&&p.location===s.route.at(-1))continue;
   this.segments.delete(p.id);
   if(animated&&advancing&&j&&(same||!p.journey&&p.location===j.route.at(-1))){
    const to=same?progress(p.journey!):j.durations.reduce((a,b)=>a+b,0),from=s&&signature(s)===signature(j)?displayed(s,now):progress(j);
    if(to>from)this.segments.set(p.id,{route:[...j.route],durations:[...j.durations],from,to,at:now,duration,settling:!running});
   }
  }
  if(running&&advancing)this.lastAdvance=now;
  const ids=new Set(this.people.map(p=>p.id));for(const id of this.segments.keys())if(!ids.has(id))this.segments.delete(id);
  this.previous=new Map(this.people.map(p=>[p.id,{...p,journey:p.journey?{...p.journey,route:[...p.journey.route],durations:[...p.journey.durations]}:null}]));this.world=w;this.day=w.day;
 }
 position(p:Person,now:number){
  const s=this.segments.get(p.id);if(!s)return {...position(p),heading:p.journey?roadHeading(p.journey):undefined};
  let days=displayed(s,now),leg=0;while(leg<s.durations.length-1&&days>=s.durations[leg])days-=s.durations[leg++];
  return {...sampleRoad(s.route[leg],s.route[leg+1],days/s.durations[leg]),heading:roadHeading({route:s.route,durations:s.durations,leg,elapsed:days,started:0})};
 }
 moving(p:Person,now:number){const s=this.segments.get(p.id);return !!s&&s.pausedAt===undefined&&now-s.at<s.duration;}
 active(p:Person,now:number){return !!p.journey||this.moving(p,now);}
}

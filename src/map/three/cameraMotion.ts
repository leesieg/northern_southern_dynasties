import {atlasPresentation} from '../atlasPresentation';

export const MIN_CAMPAIGN_ZOOM=1.1,MAX_CAMPAIGN_ZOOM=12;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Logarithmic zoom units: equal input has equal apparent speed at every scale. */
export class CampaignZoomMotion{
 target:number|undefined;
 private direction=0;
 constructor(readonly min=MIN_CAMPAIGN_ZOOM,readonly max=MAX_CAMPAIGN_ZOOM){}
 cancel(){this.target=undefined;this.direction=0;}
 push(current:number,delta:number){
  const direction=Math.sign(delta);
  // Discard queued travel on reversal; the first opposite tick must move backwards.
  if(this.target===undefined||direction!==this.direction)this.target=current;
  this.direction=direction;
  this.target=clamp(this.target+delta,this.min,this.max);
  return this.target;
 }
 step(current:number,elapsed:number,reduced=false){
  if(this.target===undefined)return current;
  const next=reduced?this.target:current+(this.target-current)*(1-Math.exp(-Math.max(0,elapsed)/70));
  if(Math.abs(next-this.target)<.001){const end=this.target;this.cancel();return end;}
  return clamp(next,this.min,this.max);
 }
}
export function wheelZoomDelta(delta:number,mode:number,pageHeight:number){
 return -clamp(delta*(mode===1?16:mode===2?pageHeight:1),-160,160)*.003;
}
export function campaignZoomPose(zoom:number,tilted:boolean,bearing:number){
 const t=clamp((zoom-4.8)/1.4,0,1);
 return {pitch:Math.max(.06,atlasPresentation(zoom,tilted).pitch),bearing:bearing*t*t*(3-2*t)};
}

/** Raise the viewing angle, not the camera radius, when a mountain blocks the orbit. */
export function terrainSafePitch(distance:number,pitch:number,heightAt:(radius:number)=>number,clearance=7){
 const safe=(angle:number)=>distance*Math.cos(angle)>=heightAt(distance*Math.sin(angle))+clearance;
 if(safe(pitch))return pitch;
 let low=0,high=pitch;
 for(let i=0;i<10;i++){const mid=(low+high)/2;if(safe(mid))low=mid;else high=mid;}
 return low;
}

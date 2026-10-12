import {CAMPAIGN_BODY_SCALE} from '../unitScale';
import {CircleGeometry,Mesh,MeshBasicMaterial,Group} from 'three';
import type {ActorView,CampaignState} from './actors';
import {travelerKind,travelerModelAssets,animateTraveler,type TravelerModel} from '../TravelerModels';
import {ARMY_MODEL_ZOOM} from '../armyMapPresentation';
import {armyModelHeading} from '../MilitaryModels';
import {projectGround} from './geography';
/** Shares the campaign renderer, terrain and label visibility; no independent world state. */
export function travelerActors(view:ActorView,root:Group,warn:(message:string)=>void,signal?:AbortSignal){
 const assets=travelerModelAssets(view.repaint,warn,signal),models=new Map<string,TravelerModel>();
 const shadowGeometry=new CircleGeometry(.19,20),shadowMaterial=new MeshBasicMaterial({color:0x263126,transparent:true,opacity:.18,depthWrite:false});
 return {
  shows:(id:string)=>!!models.get(id)?.root.visible&&!!models.get(id)?.body,
  update(state:CampaignState,now:number){
   const keep=new Set<string>(),zoom=view.getZoom();let moving=false;
   if(state.showTravelers&&state.tilted&&zoom>=ARMY_MODEL_ZOOM)for(const person of state.travelers?.()??[]){
    if(!state.travelerVisible?.(person.id))continue;
    const kind=travelerKind(state.world,person.id);if(!kind)continue;
    const at=state.travelerPosition?.(person);if(!at)continue;const h=view.height(at.lon,at.lat);if(h===null)continue;
    const key=`${kind}-${zoom>=8?'near':'far'}` as const;let model=models.get(person.id);
    if(model?.key!==key){if(model)assets.release(model);model=assets.create(key,person.id);models.set(person.id,model);root.add(model.root);const shadow=new Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.scale.y=.7;model.root.add(shadow);}
    keep.add(person.id);const p=projectGround(at.lon,at.lat);model.root.position.set(p.x,h+.035,p.z);model.root.rotation.y=at.heading===undefined?0:armyModelHeading(at.heading);model.root.scale.setScalar(CAMPAIGN_BODY_SCALE);model.root.visible=!!model.body;
    const walking=state.travelerMoving?.(person)??false;
    moving=animateTraveler(model,now,walking,((state.speed??0)>0||walking)&&(state.travelerAnimation??state.armyMotion))||walking||moving;
   }
   for(const [id,model] of models)if(!keep.has(id)){assets.release(model);models.delete(id);}
   return moving;
  },
  retry:()=>assets.retry(),
  dispose(){assets.dispose();models.clear();shadowGeometry.dispose();shadowMaterial.dispose();},
 };
}

import bundle from 'virtual:official-content-package';
import {installContentPackage} from '../core/contentPackage';
import type {ContentPackage} from '../core/contentPackage';
import type {LaunchRequest} from '../persistence/contentLibrary';
self.onmessage=async(event:MessageEvent<{content:ContentPackage;request?:LaunchRequest}>)=>{self.onmessage=null;try{
 await installContentPackage(event.data.content,bundle.environment);
 const {createCampaign}=await import('../core/campaignStart'),{serializeWorld,parseWorld}=await import('../core/save');const r=event.data.request;
 const w=r?.type==='import'?parseWorld(r.text):createCampaign(r?.characterId,r?.scriptId,r?.mode??'sandbox');parseWorld(serializeWorld(w));
 self.postMessage({ok:true});
 }catch(e){self.postMessage({ok:false,error:e instanceof Error?e.message:String(e)});}};

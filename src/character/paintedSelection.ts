import type {PortraitContext} from './composition';
import {composePaintedStudy} from './paintedStudy';
import {composePaintedRoster} from './paintedRoster';

/** Keep the accepted original recipe for Yuan; every other identity uses a registered painted rig. */
export function approvedPaintedRecipe(characterId:string|undefined,context:PortraitContext){
 if(characterId==='yuan-shanjian'&&context.identity.sex==='male')return composePaintedStudy(context.identity.genome,{robe:context.office==='ruler'?'a':'b'});
 return composePaintedRoster(characterId,context);
}

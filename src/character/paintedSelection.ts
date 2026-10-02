import type {PortraitContext} from './composition';
import {composePaintedStudy} from './paintedStudy';
import {composePaintedRoster} from './paintedRoster';
import {culturalCostume} from './culturalCostume';

/** Keep the accepted original recipe for Yuan; every other identity uses a registered painted rig. */
export function approvedPaintedRecipe(characterId:string|undefined,context:PortraitContext){
 const recipe=characterId==='yuan-shanjian'&&context.identity.sex==='male'?composePaintedStudy(context.identity.genome,{robe:context.office==='ruler'?'a':'b'}):composePaintedRoster(characterId,context);
 return culturalCostume(recipe,context);
}

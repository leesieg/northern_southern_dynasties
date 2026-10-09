import type {PortraitContext} from './composition';
import {composePaintedStudy} from './paintedStudy';
import {composePaintedRoster} from './paintedRoster';
import {culturalCostume} from './culturalCostume';
import {wholeCulturalPortrait} from './wholePortrait';
import {courtCostume} from './courtCostume';

/** Keep the accepted original recipe for Yuan; every other identity uses a registered painted rig. */
export function approvedPaintedRecipe(characterId:string|undefined,context:PortraitContext){
 const recipe=characterId==='yuan-shanjian'&&context.identity.sex==='male'?composePaintedStudy(context.identity.genome,{robe:context.office==='ruler'?'a':'b'}):composePaintedRoster(characterId,context);
 if(context.office==='ruler'||context.office==='governor'&&(context.life?.age??18)>=16)return courtCostume(recipe,context);
 return (context.life?.age??18)<16?culturalCostume(recipe,context):wholeCulturalPortrait(recipe,context);
}

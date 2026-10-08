import {newWorld} from '../../core/world';
import {advanceConstruction,beginConstruction,buildQuote,cityBuildings,emptyCity,type CityBuilding} from '../../core/construction';
import type {World} from '../../core/types';

export const DEMO_BUILDINGS=Object.keys(cityBuildings) as CityBuilding[];
export const DEMO_SITES=['luoyang','changan'] as const;
/** Explicit isolated teaching scenario. No save, worker, or production-world access. */
export function newConstructionDemo(cityIds:readonly string[]=DEMO_SITES){
 const world=newWorld();world.people[0].coins=2000;world.people[0].location='luoyang';
 world.holdings.governedCities=[...cityIds];
 for(const site of cityIds)world.holdings.cities[site]=emptyCity();
 return world;
}
export function constructionQuote(world:World,site:string,building:CityBuilding){return buildQuote(world,{type:'build',scope:'city',site,building});}
export function startDemoConstruction(world:World,site:string,building:CityBuilding){beginConstruction(world,{type:'build',scope:'city',site,building});}
export function advanceDemoConstruction(world:World,days:number){
 if(!Number.isInteger(days)||days<1||days>180)throw new Error('营建日期只能推进 1—180 日');
 for(let i=0;i<days;i++){world.day++;advanceConstruction(world);}
}
export function buildingAppearance(world:World,site:string,building:CityBuilding){
 const holding=world.holdings.cities[site],project=holding?.project?.building===building?holding.project:null;
 const progress=project?Math.max(0,Math.min(1,(world.day-project.started)/Math.max(1,project.due-project.started))):0;
 return {level:holding?.levels[building]??0,target:project?.level??null,phase:project?Math.min(2,Math.floor(progress*3)):null,progress,remaining:project?Math.max(0,project.due-world.day):0};
}

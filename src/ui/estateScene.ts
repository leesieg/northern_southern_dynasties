import type { EstateBuilding,Holdings } from '../core/construction';
export const estatePlaces:EstateBuilding[]=['hall','storehouse','workshop','fields'];
export const spriteColumn:Record<EstateBuilding,number>={hall:0,fields:1,workshop:2,storehouse:3};
export function estateScene(estate:Holdings['estate'],day:number){
  return estatePlaces.map(id=>{
    const level=estate.levels[id],project=estate.project?.building===id?estate.project:null;
    return {id,level,row:level?level-1:null,column:spriteColumn[id],constructing:!!project,
      progress:project?Math.max(0,Math.min(1,(day-project.started)/(project.due-project.started))):null,
      remaining:project?Math.max(0,project.due-day):0,target:project?.level??null};
  });
}

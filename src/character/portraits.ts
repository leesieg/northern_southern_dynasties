/** Original illustrated interpretations, not documentary likenesses. Panels are 2×2 atlases. */
export interface PaintedPortrait {sheet:'liang'|'east'|'west';column:0|1;row:0|1}
export const paintedPortraits:Record<string,PaintedPortrait>={
 'xiao-yan':{sheet:'liang',column:0,row:0},'xiao-gang':{sheet:'liang',column:1,row:0},'xiao-yi':{sheet:'liang',column:0,row:1},fictional:{sheet:'liang',column:1,row:1},
 'yuan-shanjian':{sheet:'east',column:0,row:0},'gao-huan':{sheet:'east',column:1,row:0},'gao-cheng':{sheet:'east',column:0,row:1},'gao-yang':{sheet:'east',column:1,row:1},
 'yuan-baoju':{sheet:'west',column:0,row:0},'yuwen-tai':{sheet:'west',column:1,row:0},'yuan-qin':{sheet:'west',column:0,row:1},'dugu-xin':{sheet:'west',column:1,row:1},
};
export const portraitSource=(id:string)=>{if(!Object.hasOwn(paintedPortraits,id))throw new Error('没有该人物的绘卷立绘');return import.meta.env.BASE_URL+'art/portraits/'+paintedPortraits[id].sheet+'.png';};

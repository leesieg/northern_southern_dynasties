import {characterById} from './characters';
/** 剧本目录：新增剧本还需配套人物、地图快照及开局规则，不能只修改年份。 */
export interface GameScript {
  id:string;name:string;year:number;description:string;characterIds:readonly string[];defaultCharacter:string;allowFictional:boolean;
}
export const DEFAULT_SCRIPT='three-realms-546';
export const gameScripts:readonly GameScript[]=[{
 id:DEFAULT_SCRIPT,name:'三国并立',year:546,
 description:'梁、东魏、西魏并立。选择一位历史人物，经营城邑与家业，在时代风云中延续一族之业。',
 characterIds:Object.keys(characterById),
 defaultCharacter:'xiao-yan',allowFictional:true,
}];
export function getScript(id=DEFAULT_SCRIPT):GameScript {
 const script=gameScripts.find(s=>s.id===id);
 if(!script)throw new Error('此剧本尚未开放或无法识别，请选择已开放的剧本。');
 return script;
}
export const scriptLabel=(id?:string)=>{const s=getScript(id);return `${s.year} 年 · ${s.name}`;};

import {ArtIcon,type ArtName} from './ArtIcon';

// Immutable crops from the approved concept: only illustrations, never its example text/data.
const crops={coins:[337,219,48,51],grain:[486,218,48,53],influence:[621,220,56,51],diligent:[337,297,49,46],renown:[483,298,57,57],stress:[624,304,58,49],book:[133,617,95,101],scroll:[427,620,89,91],branch:[735,619,93,99],spears:[1287,615,127,119]} as const;
export type HudArtName=ArtName|'book'|'scroll'|'branch'|'spears';
export function HudArt({name,size=32}:{name:HudArtName;size?:number}){
 const crop=crops[name as keyof typeof crops];
 if(!crop)return <ArtIcon name={name as ArtName} size={size}/>;
 return <svg className="hud-art" width={size} height={size} viewBox={crop.join(' ')} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href={import.meta.env.BASE_URL+'art/interface/top-hud-art.png'} width="1536" height="1024"/></svg>;
}

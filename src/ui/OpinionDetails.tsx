import {HoverHint} from './HoverHint';
import {ArtIcon} from './ArtIcon';
import type { World } from '../core/types';
import { opinionBreakdown,relationName } from '../core/relationships';
export function OpinionDetails({world,actor,target}:{world:World;actor:string;target:string}){
 const score=opinionBreakdown(world,actor,target);
 const label=`${relationName(target,world)}对${actor===world.characterId?'你':relationName(actor,world)}的好感`;
 return <HoverHint label={label+' '+score.total} content={<><strong>{label}</strong><dl className="opinion-factors">{score.parts.map(p=><div key={p.label}><dt>{p.label}</dt><dd>{p.value>0?'+':''}{p.value}</dd></div>)}</dl><small>合计 {score.total} · 范围 −100 至 +100</small></>}><span className="opinion-chip"><ArtIcon name="gregarious" size={24}/><span>好感</span><b>{score.total>0?'+':''}{score.total}</b></span></HoverHint>;
}

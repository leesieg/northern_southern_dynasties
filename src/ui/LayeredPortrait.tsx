import { composePortrait,type PortraitContext } from '../character/composition';
import { PaintedComposition } from './PaintedComposition';
import { approvedPaintedRecipe } from '../character/paintedSelection';
import { PortraitFrame } from './PortraitFrame';
import type {PortraitRank} from '../character/portraitRank';
import './layeredPortrait.css';
export function LayeredPortrait({context,name,characterId,compact=false,rank}:{context:PortraitContext;name:string;characterId?:string;compact?:boolean;rank?:PortraitRank}){
 const composition=composePortrait(context);
 const painted=approvedPaintedRecipe(characterId,context);
 return <div className={`painted-portrait-frame modular-portrait mood-${composition.mood} painted-composition${compact?' painted-composition-compact':''}`} role="group" aria-label={`${name}的肖像`}>
 <PaintedComposition recipe={painted} compact={compact} life={context.life}/>
 {context.life?.deceased&&<span className="portrait-memorial">故</span>}
 {rank&&<PortraitFrame rank={rank} compact={compact}/>}
 </div>;
}

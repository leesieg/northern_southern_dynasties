import {traitDefinitions,type Trait} from '../core/social';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
export function TraitIcon({trait}:{trait:Trait}){
 const t=traitDefinitions[trait];
 return <HoverHint label={t.name+'：'+t.effect} content={<><strong>{t.name}</strong><p>{t.effect}</p></>}><span className="trait-badge trait-icon-only" role="img" aria-label={t.name}><ArtIcon name={trait==='greedy'?'coins':trait==='honest'?'steadfast':trait==='ambitious'?'influence':trait} size={32}/></span></HoverHint>;
}

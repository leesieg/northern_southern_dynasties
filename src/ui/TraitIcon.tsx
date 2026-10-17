import {traitDefinitions,type Trait} from '../core/social';
import {CharacterTraitIcon} from './CharacterTraitIcon';
import {HoverHint} from './HoverHint';
export function TraitIcon({trait}:{trait:Trait}){
 const t=traitDefinitions[trait];
 return <HoverHint label={t.name+'：'+t.effect} content={<><strong>{t.name}</strong><p>{t.effect}</p></>}><CharacterTraitIcon name={trait} label={t.name}/></HoverHint>;
}

import {isAdventurer} from '../core/resignation';
import {retinuePosts} from '../core/retinue';
import {officeHierarchy,type OfficeNode} from '../core/offices';
import {lifestyleProgress} from '../core/lifestyle';
import {lifestyleBranches,lifestyleFocuses} from '../data/lifestyles';
import {territoryNodes} from '../data/territorialHierarchy';
import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import type {World} from '../core/types';
const rank=(o:OfficeNode)=>o.kind==='sovereign'?0:o.kind==='executive'?1:o.territory?territoryNodes[o.territory]?.level==='province'?3:territoryNodes[o.territory]?.level==='prefecture'?4:5:o.kind==='office'?2:6;
export function PersonIdentityIcons({world,person,onOffice,onLifestyle}:{world:World;person:string;onOffice:()=>void;onLifestyle:()=>void}){
 const focusId=lifestyleProgress(world,person)?.focus,focus=focusId?lifestyleFocuses[focusId]:null,office=world.realm?officeHierarchy(world,person).filter(o=>o.active&&o.holder===person).sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id))[0]:null;
 const post=world.retinue?.members[person]?.post,postInfo=post?retinuePosts[post]:null,title=office?.name??postInfo?.name??(isAdventurer(world,person)?'冒险者':undefined);
 const icon:ArtName=isAdventurer(world,person)?'world':office?.kind==='sovereign'?'renown':office?.kind==='city'?'city':!office&&postInfo?postInfo.icon:'influence';
 return <div className="person-identity-icons">{title&&<HoverHint label={title} content={title}><button aria-label={title+' · 查看官职'} onClick={onOffice}><ArtIcon name={icon} size={30}/></button></HoverHint>}{(focus||person===world.characterId)&&<HoverHint label={focus?.name??'尚未选择生活重心'} content={focus?focus.name+' · '+focus.effect:'选择生活重心'}>{person===world.characterId?<button aria-label={focus?'生活重心：'+focus.name:'选择生活重心'} onClick={onLifestyle}><ArtIcon name={focus?lifestyleBranches[focus.branch].icon:'diligent'} size={30}/></button>:<span role="img" aria-label={'生活重心：'+focus!.name}><ArtIcon name={lifestyleBranches[focus!.branch].icon} size={30}/></span>}</HoverHint>}</div>;
}

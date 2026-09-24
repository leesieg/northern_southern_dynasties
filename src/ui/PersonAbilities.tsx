import {abilityBreakdown,abilityNames,type Ability} from '../core/social';
import {personInfluence} from '../core/personalInfluence';
import {governmentOf} from '../core/government';
import {characterById} from '../data/characters';
import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import type {World} from '../core/types';
const icons:Record<Ability,ArtName>={diplomacy:'gregarious',martial:'army',stewardship:'coins',intrigue:'wary'};
const effects:Record<Ability,string>={diplomacy:'每点外交为人物交涉接受度提供 2 点；高外交降低赠礼费用。',martial:'提高统军战斗加成、军事差事效率和军司马适任度。',stewardship:'提高经世差事效率；超过 12 点后，每点减少 2% 新工程造价，最多减少 20%。',intrigue:'提高巡察效率与相关事务表现。'};
export function PersonAbilities({world:w,person}:{world:World;person:string}){
 const c=characterById[person];if(!c)return null;const stats=abilityBreakdown(w,person),merit=governmentOf(w,c.polity)?.merit[person]??0,prestige=w.families?.prestige[person]??0;
 return <section className="person-ability-summary" aria-label="人物能力与资望"><div className="ability-points">{(Object.keys(abilityNames) as Ability[]).map(key=><HoverHint key={key} label={abilityNames[key]} content={<><strong>{abilityNames[key]} {stats[key].value}</strong>{stats[key].parts.map(p=><p key={p.label}>{p.label} {p.value>0?'+':''}{p.value}</p>)}<p>{effects[key]}</p></>}><span className="ability-point" tabIndex={0} aria-label={abilityNames[key]+' '+stats[key].value}><ArtIcon name={icons[key]} size={30}/><b>{stats[key].value}</b></span></HoverHint>)}</div><div className="person-standing">{[{name:'influence' as const,label:'影响力',value:personInfluence(w,person),hint:'每 30 日积累 5；办结公务按考绩增加。个人持有，交接家业不继承前任影响力。'},{name:'diligent' as const,label:'功绩',value:merit,hint:'履职与公务考绩积累，可用于争取官职；失职可能扣减。'},{name:'renown' as const,label:'个人威望',value:prestige,hint:'营建、交往和办结公务积累，并计入家族威望。'}].map(p=><HoverHint key={p.label} label={p.label} content={p.hint}><span tabIndex={0}><ArtIcon name={p.name} size={24}/><span><small>{p.label}</small><b>{p.value}</b></span></span></HoverHint>)}</div></section>;
}

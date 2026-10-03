import {getCharacter} from '../core/personRegistry';
import {allegianceRealm} from '../core/officeEligibility';
import {politicalName} from '../core/government';
import {abilityBreakdown,abilityNames,type Ability} from '../core/social';
import {personInfluence,influenceIncomeHint} from '../core/personalInfluence';
import {governmentOf} from '../core/government';

import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import type {World} from '../core/types';
const icons:Record<Ability,ArtName>={diplomacy:'gregarious',martial:'army',stewardship:'coins',intrigue:'wary'};
const effects:Record<Ability,string>={diplomacy:'每点外交为人物交涉接受度提供 2 点；高外交降低赠礼费用。',martial:'提高统军战斗加成、军事差事效率和军司马适任度。',stewardship:'提高经世差事效率；超过 12 点后，每点减少 2% 新工程造价，最多减少 20%。',intrigue:'提高巡察效率与相关事务表现。'};
export function PersonAbilities({world:w,person}:{world:World;person:string}){
 const c=getCharacter(w,person)!;if(!c)return null;const realm=allegianceRealm(w,person)??c.polity,stats=abilityBreakdown(w,person),merit=governmentOf(w,realm)?.merit[person]??0,prestige=w.families?.prestige[person]??0;
 return <section className="person-ability-summary" aria-label="人物能力与资望"><div className="person-ability-row"><div className="ability-points">{(Object.keys(abilityNames) as Ability[]).map(key=><HoverHint key={key} label={abilityNames[key]} content={<><strong>{abilityNames[key]} {stats[key].value}</strong>{stats[key].parts.map(p=><p key={p.label}>{p.label} {p.value>0?'+':''}{p.value}</p>)}<p>{effects[key]}</p></>}><span className="ability-point" aria-label={abilityNames[key]+' '+stats[key].value}><ArtIcon name={icons[key]} size={30}/><b>{stats[key].value}</b></span></HoverHint>)}</div><div className="person-standing">{[{name:'influence' as const,label:'影响力',value:personInfluence(w,person),hint:influenceIncomeHint(w,person)},{name:'diligent' as const,label:'功绩',value:merit,hint:'履职与公务考绩积累，可用于争取官职；失职可能扣减。'},{name:'renown' as const,label:'个人威望',value:prestige,hint:'营建、交往和办结公务积累，并计入家族威望。'}].map(p=><HoverHint key={p.label} label={p.label} content={<>{p.hint}{p.label==='功绩'&&<><p>既有履历 {w.deeds?.opening[realm+'|'+person]??merit}</p>{w.deeds?.recent.filter(d=>d.person===person).slice(-6).reverse().map(d=><p key={d.source+'|'+d.realm}>第 {d.day} 日 · {d.reason}：{d.amount>0?'+':''}{d.amount}{d.evidence&&<small><br/>委任：{politicalName(d.evidence.issuer,w)} · 考课：{politicalName(d.evidence.assessor,w)}<br/>实支 {d.evidence.spent.coins}/{d.evidence.allocated.coins} 钱，{d.evidence.spent.grain}/{d.evidence.allocated.grain} 粮 · 质量 {d.evidence.quality}%</small>}</p>)}</>}</>}><span><ArtIcon name={p.name} size={24}/><small>{p.label}</small><b>{p.value}</b></span></HoverHint>)}</div></div></section>;
}

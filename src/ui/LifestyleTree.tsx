import {useState} from 'react';
import {ArtIcon,type ArtName} from './ArtIcon';
import {branchPerks,lifestyleBranches,lifestylePerks,type LifestyleBranch} from '../data/lifestyles';
import {lifestyleReason,type LifestyleCommand} from '../core/lifestyle';
import type {World} from '../core/types';

// Node coordinates are presentation only. Every connection comes from the actual prerequisite graph.
const perkIcon=(p:typeof lifestylePerks[string]):ArtName=>p.bonus.grain||p.bonus.supply?'grain':p.bonus.buildCost||p.bonus.tax||p.bonus.armyExpense||p.bonus.giftCost?'coins':p.bonus.buildTime?'diligent':p.bonus.siege?'city':p.bonus.attack?'army':p.bonus.calm?'steadfast':'gregarious';
const places=[{x:19,y:68},{x:40,y:38},{x:47,y:64},{x:65,y:18},{x:82,y:52}];
export function LifestyleTree({world,branch,owned,pending,send}:{world:World;branch:LifestyleBranch;owned:string[];pending:boolean;send:(c:LifestyleCommand)=>void}){
 const perks=branchPerks(branch),[selection,setSelection]=useState(''),selected=perks.find(([id])=>id===selection)??perks[0];
 const [id,perk]=selected,command:LifestyleCommand={type:'lifestyle',action:'unlock',perk:id},reason=lifestyleReason(world,command);
 const nodes=perks.map(([key,p],index)=>({id:key,perk:p,...places[index]}));
 return <section className="lifestyle-arbor"><div className="lifestyle-arbor-scene" aria-label={lifestyleBranches[branch].name+'修习图'}><span className="lifestyle-arbor-caption">{lifestyleBranches[branch].name}<small>修习有序，积学成器</small></span>{nodes.map(n=>{const why=lifestyleReason(world,{type:'lifestyle',action:'unlock',perk:n.id}),learned=owned.includes(n.id);return <button key={n.id} className={'lifestyle-tree-node '+(learned?'is-owned':!why?'is-ready':'is-locked')} style={{left:n.x+'%',top:n.y+'%'}} aria-pressed={id===n.id} aria-label={n.perk.name+'，'+(learned?'已掌握':why||'可学习，消耗 1 点')} onClick={()=>setSelection(n.id)}><span className="lifestyle-node-seal"><ArtIcon name={perkIcon(n.perk)} size={28}/>{learned&&<i>✓</i>}</span><strong>{n.perk.name}</strong></button>;})}</div>
 <aside className="lifestyle-node-detail" aria-live="polite"><header><ArtIcon name={perkIcon(perk)} size={30}/><div><small>{perk.mastery?'路线专长':'修习技艺'}</small><h4>{perk.name}</h4></div></header><p>{perk.effect}</p><small>{perk.requires.length?'前置：'+perk.requires.map(key=>lifestylePerks[key].name).join('、'):'本路线起点，无前置技艺'}{perk.mastery?' · 掌握后获得专长特质':''}</small><footer><span>{owned.includes(id)?'已掌握':reason||'消耗 1 点技能点'}</span><button disabled={pending||!!reason} onClick={()=>{if(pending||lifestyleReason(world,command))return;send(command);}}>{owned.includes(id)?'已掌握':'确认修习'}</button></footer></aside></section>;
}

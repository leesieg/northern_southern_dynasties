import {useId,useState} from 'react';
import {ArtIcon,type ArtName} from './ArtIcon';
import {branchPerks,lifestyleBranches,lifestylePerks,type LifestyleBranch} from '../data/lifestyles';
import {lifestyleReason,type LifestyleCommand} from '../core/lifestyle';
import type {World} from '../core/types';

// Node coordinates are presentation only. Every connection comes from the actual prerequisite graph.
const perkIcon=(p:typeof lifestylePerks[string]):ArtName=>p.bonus.grain||p.bonus.supply?'grain':p.bonus.buildCost||p.bonus.tax||p.bonus.armyExpense||p.bonus.giftCost?'coins':p.bonus.buildTime?'diligent':p.bonus.siege?'city':p.bonus.attack?'army':p.bonus.calm?'steadfast':'gregarious';
const places=[{x:19,y:76},{x:40,y:43},{x:43,y:79},{x:65,y:25},{x:82,y:52}];
export function LifestyleTree({world,branch,owned,pending,send}:{world:World;branch:LifestyleBranch;owned:string[];pending:boolean;send:(c:LifestyleCommand)=>void}){
 const treeId=useId();
 const perks=branchPerks(branch),[selection,setSelection]=useState(''),selected=perks.find(([id])=>id===selection)??perks[0];
 const [id,perk]=selected,command:LifestyleCommand={type:'lifestyle',action:'unlock',perk:id},reason=lifestyleReason(world,command);
 const nodes=perks.map(([key,p],index)=>({id:key,perk:p,...places[index]}));
 return <section className="lifestyle-arbor"><div className="lifestyle-arbor-scene" aria-label={lifestyleBranches[branch].name+'修习图'}><svg className="lifestyle-ink-tree" viewBox="0 0 500 450" aria-hidden="true">
 <defs><linearGradient id={'bark-'+treeId} x2="100%" y2="30%"><stop stopColor="#282a29"/><stop offset=".5" stopColor="#585953"/><stop offset="1" stopColor="#2a302e"/></linearGradient><g id={'bloom-'+treeId}><path d="M0 0C-15-18-3-26 2-10C15-27 24-14 9-5C31-5 23 12 9 5C17 24-1 26-3 10C-20 23-26 6-9 1C-26-9-14-20 0 0" fill="currentColor"/><circle r="2" fill="#e8ce95"/><path d="M0 0 3-8M0 0 8 3M0 0-6 4" stroke="#efd39f" strokeWidth=".7"/></g></defs>
 <path d="M30 450Q46 393 34 345Q25 311 63 297Q45 324 71 346Q92 350 99 337L111 351Q89 374 64 374L69 404 88 450Z" fill={'url(#bark-'+treeId+')'}/>
 <path d="M49 367Q124 365 190 305T349 218Q404 185 455 156M58 378Q160 427 275 397M87 348Q72 252 49 203M172 318Q198 225 171 153M278 266Q331 157 326 65" fill="none" stroke="#333932" strokeWidth="7" strokeLinecap="round" opacity=".22"/>
 {nodes.flatMap(n=>n.perk.requires.map(parent=>{const from=nodes.find(x=>x.id===parent)!;return <path key={parent+n.id} d={`M${from.x*5} ${from.y*4.5} Q${from.x*5+35} ${n.y*4.5+40} ${n.x*5} ${n.y*4.5}`} fill="none" stroke={owned.includes(n.id)?'#3a3b34':'#8f9185'} strokeWidth={n.perk.mastery?5:8} strokeLinecap="round" opacity={owned.includes(n.id)?1:.4}/>;}))}
 <path d="M52 398Q63 366 95 342" fill="none" stroke="#353b32" strokeWidth="14"/>
 {nodes.filter(n=>owned.includes(n.id)).flatMap(n=>Array.from({length:9},(_,i)=><use key={n.id+i} href={'#bloom-'+treeId} transform={`translate(${n.x*5+Math.cos(i*2.4)*38} ${n.y*4.5+Math.sin(i*2.4)*34}) rotate(${i*38}) scale(${.36+(i%3)*.09})`} color={i%3===0?'#a74761':i%3===1?'#c97288':'#d994a1'}/>))}
 <path d="M25 444q35-12 65 0M14 448q45-7 97 0" stroke="#717064" opacity=".3" fill="none"/>
 </svg><span className="lifestyle-arbor-caption">{lifestyleBranches[branch].name}<small>修习有序，积学成器</small></span>{nodes.map(n=>{const why=lifestyleReason(world,{type:'lifestyle',action:'unlock',perk:n.id}),learned=owned.includes(n.id);return <button key={n.id} className={'lifestyle-tree-node '+(learned?'is-owned':!why?'is-ready':'is-locked')} style={{left:n.x+'%',top:n.y+'%'}} aria-pressed={id===n.id} aria-label={n.perk.name+'，'+(learned?'已掌握':why||'可学习，消耗 1 点')} onClick={()=>setSelection(n.id)}><span className="lifestyle-node-seal"><ArtIcon name={perkIcon(n.perk)} size={28}/>{learned&&<i>✓</i>}</span><strong>{n.perk.name}</strong></button>;})}</div>
 <aside className="lifestyle-node-detail" aria-live="polite"><header><ArtIcon name={perkIcon(perk)} size={30}/><div><small>{perk.mastery?'路线专长':'修习技艺'}</small><h4>{perk.name}</h4></div></header><p>{perk.effect}</p><small>{perk.requires.length?'前置：'+perk.requires.map(key=>lifestylePerks[key].name).join('、'):'本路线起点，无前置技艺'}{perk.mastery?' · 掌握后获得专长特质':''}</small><footer><span>{owned.includes(id)?'已掌握':reason||'消耗 1 点技能点'}</span><button disabled={pending||!!reason} onClick={()=>{if(pending||lifestyleReason(world,command))return;send(command);}}>{owned.includes(id)?'已掌握':'确认修习'}</button></footer></aside></section>;
}

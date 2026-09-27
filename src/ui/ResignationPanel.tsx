import './resignation.css';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {isAdventurer,resignablePosts,resignationReason} from '../core/resignation';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {ConfirmAction} from './ConfirmAction';
export function ResignationPanel({world,pending,send}:{world:World;pending:boolean;send:(command:GameCommand)=>void}){
 const [selected,setSelected]=useState<string|null>(null),posts=resignablePosts(world),post=posts.find(p=>p.id===selected);
 if(isAdventurer(world,world.characterId!))return <p><ArtIcon name="world" size={24}/>冒险者 · 自由行旅</p>;
 if(!posts.length)return null;
 return <section className="resignation-panel"><h3>辞官</h3><div className="resignation-posts">{posts.map(p=>{const reason=resignationReason(world,p.id);return <HoverHint key={p.id} label={p.name} content={reason||'卸任后交还此职权与公库，保留私财和家产'}><button disabled={pending||!!reason} onClick={()=>setSelected(p.id)}><ArtIcon name="influence" size={24}/><span>{p.name}</span><span aria-hidden="true">↗</span></button></HoverHint>;})}</div>{post&&<ConfirmAction title={'辞去'+post.name} detail={<><p>交还此职权与官署公库，停止领取对应俸禄；私财与家产保留。</p><p>{posts.length===1?'卸任后成为冒险者，解除个人跨境通行限制。':'其他职位继续保留；全部卸任后成为冒险者。'}</p>{resignationReason(world,post.id)&&<p>{resignationReason(world,post.id)}</p>}</>} confirmLabel="确认辞官" danger pending={pending||!!resignationReason(world,post.id)} onCancel={()=>setSelected(null)} onConfirm={()=>{if(!pending&&!resignationReason(world,post.id)){send({type:'resign',office:post.id});setSelected(null);}}}/>}</section>;
}

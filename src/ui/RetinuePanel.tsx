import {isSovereign} from '../core/officialDuties';
import {PositionSeat,PersonSelectionDialog} from './PersonSelection';
import {useState} from 'react';
import {retinueMembers,retinuePosts,retinueQuote,retinueAptitude,postStatus,recruitmentScore,isOfficial,type RetinueCommand,type RetinuePost} from '../core/retinue';
import {relationshipPersonById} from '../data/relationships';
import {personResidence} from '../core/residence';
import {siteById} from '../data/scenario';
import {CharacterPortrait} from './CharacterPortrait';
import {ArtIcon} from './ArtIcon';
import {HoverHint} from './HoverHint';
import type {World,GameCommand} from '../core/types';
import './retinue.css';
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson:(id:string)=>void};
const name=(id:string)=>relationshipPersonById[id]?.name??id;
export function RetinueRecruit({world:w,pending,send,onPerson,person}:Props&{person:string}){if(!w.retinue||person===w.characterId||isSovereign(w))return null;const member=w.retinue.members[person],command={type:'retinue',action:'recruit',person} as const,q=retinueQuote(w,command);return <section className="retinue-invite">{member?<p><ArtIcon name="person" size={24}/>幕主 <button onClick={()=>onPerson(member.host)}>{name(member.host)} ›</button>{member.post?' · '+retinuePosts[member.post].name:' · 幕僚'}</p>:<HoverHint label="延聘条件" content={<><p>束脩 {q.cost} 钱；留幕每月 2 钱，任职后每月 4 钱。</p>{recruitmentScore(w,w.characterId!,person).map(p=><p key={p.label}>{p.label} {p.value>=0?'+':''}{p.value}</p>)}<p>{q.reason||'对方接受后按道路前来，不立即到岗。'}</p></>}><button disabled={pending||!!q.reason} onClick={()=>send(command)}><ArtIcon name="person" size={28}/>延聘入幕</button></HoverHint>}</section>;}
export function RetinuePanel({world:w,host,pending,send,onPerson,onFind}:{host:string;onFind:()=>void}&Props){
 const [selected,setSelected]=useState<RetinuePost|null>(null),[candidate,setCandidate]=useState(''),[site,setSite]=useState(''),[dismiss,setDismiss]=useState<string|null>(null);
 if(!w.retinue||isSovereign(w,host))return null;
 const members=retinueMembers(w,host),own=host===w.characterId,official=isOfficial(w,host),places=Object.entries(w.realm?.cities??{}).filter(([,c])=>c.owner===relationshipPersonById[host]?.realm&&c.controller===c.owner),post=selected??'secretary';
 const action=(c:RetinueCommand,label:string)=>{const q=retinueQuote(w,c);return <HoverHint label={label} content={<>{q.effect&&<p>{q.effect}</p>}{q.cost>0&&<p>支出个人钱 {q.cost}</p>}{q.reason&&<p>{q.reason}</p>}</>}><button disabled={pending||!!q.reason} onClick={()=>send(c)}>{label}</button></HoverHint>;};
 const assign:RetinueCommand={type:'retinue',action:'assign',person:candidate,post,...site?{site}:{}};
 const tasks:Record<RetinuePost,{task:'resupply'|'audit'|'drill'|'recommend';name:string}[]>={engineer:[],steward:[{task:'resupply',name:'整备行粮'},{task:'audit',name:'清查仓赋'}],marshal:[{task:'drill',name:'整训军伍'}],secretary:[{task:'recommend',name:'修书荐举'}]};
 return <section className="retinue-panel"><header className="retinue-summary"><h3><ArtIcon name="influence"/>{official?'幕府':'随行幕僚'}</h3><span>{members.length} / 6 人 · 月俸 {members.reduce((n,m)=>n+(m.post?4:2),0)} 钱</span>{own&&<button onClick={onFind}><ArtIcon name="person" size={22}/>延揽人物 ›</button>}</header>
 <div className="retinue-seats">{(Object.keys(retinuePosts) as RetinuePost[]).filter(key=>official||!retinuePosts[key].official||members.some(m=>m.post===key)).map(key=>{const d=retinuePosts[key],m=members.find(m=>m.post===key),status=postStatus(w,key,m?.site??undefined,host);return <PositionSeat key={key} world={w} holder={m?.id} title={d.name} icon={d.icon} onPerson={onPerson} onManage={own?()=>{setSelected(key);setCandidate(m?.id??'');setSite(m?.site??'');}:undefined} status={<HoverHint label={d.name+'职掌'} content={<><p>{d.effect}</p><p>{status.reason||'已到岗，可以履职'}</p></>}><span>{m?(m.site?siteById[m.site].name:'随行')+' · 适任 '+status.aptitude:d.effect}</span></HoverHint>}>{own&&<div className="retinue-actions">{m&&<>{action({type:'retinue',action:'unassign',person:m.id},'免职')}{dismiss===m.id?<>{action({type:'retinue',action:'dismiss',person:m.id},'确认解聘')}<button onClick={()=>setDismiss(null)}>取消</button></>:<button onClick={()=>setDismiss(m.id)}>解聘</button>}</>}{m&&tasks[key].map(t=><span key={t.task}>{action({type:'retinue',action:'work',post:key,task:t.task},t.name)}</span>)}</div>}</PositionSeat>;})}</div>
 {own&&selected&&<PersonSelectionDialog world={w} title={'任命 · '+retinuePosts[selected].name} value={candidate} onSelect={setCandidate} onClose={()=>setSelected(null)} pending={pending} description={retinuePosts[selected].effect} options={members.map(m=>({id:m.id,score:retinueAptitude(w,m.id,selected),detail:m.post?retinuePosts[m.post].name:'未任职',reason:retinueQuote(w,{...assign,person:m.id}).reason}))} confirmLabel="授予幕职" onConfirm={()=>{send(assign);setSelected(null);}}><label>驻地 <select aria-label="幕职驻地" value={site} onChange={e=>setSite(e.target.value)}><option value="">随主公驻留</option>{places.map(([id])=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label>{!members.length&&<button onClick={()=>{setSelected(null);onFind();}}>前往查找延聘人物 ›</button>}</PersonSelectionDialog>}

 <div className="retinue-roster">{members.filter(m=>!m.post).map(m=><article key={m.id}><button className="retinue-holder" onClick={()=>onPerson(m.id)}><span className="retinue-portrait"><CharacterPortrait characterId={m.id} world={w} compact/></span><span className="retinue-person-info"><strong>{name(m.id)}</strong><small>{m.post?retinuePosts[m.post].name:'未任职'} · {siteById[personResidence(w,m.id).site].name}{personResidence(w,m.id).traveling?' · 在途':''}{m.arrears?' · 欠俸':''}</small></span></button>{own&&(dismiss===m.id?<>{action({type:'retinue',action:'dismiss',person:m.id},'确认解聘')}<button onClick={()=>setDismiss(null)}>取消</button></>:<button onClick={()=>setDismiss(m.id)}>解聘</button>)}</article>)}</div>
 {!members.length&&<p>暂无幕僚。可从人物详情延聘，再授予幕职。</p>}
 </section>;
}

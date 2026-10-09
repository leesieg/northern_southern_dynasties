import {NobilityPanel} from './PoliticalIdentity';
import type {PersonLifeEntry} from '../core/ongoing';
import {ActionDialog} from './ActionDialog';
import {getCharacter,getPerson,familyPersonOf} from '../core/personRegistry';
import {personCulture} from '../core/culture';
import {cultureNames,cultureSources} from '../data/cultures';
import {PactRequestPanel} from './PactRequestPanel';
import {CustodyPerson} from './CustodyPanel';
import {CommandButton} from './CommandButton';
import {allegianceRealm} from '../core/officeEligibility';
import {RealmBadge} from './RealmBadge';
import {PersonAbilities} from './PersonAbilities';
import {isSovereign} from '../core/officialDuties';
import {retinueMembers} from '../core/retinue';
import {clanStanding} from '../core/clans';
import {HoverHint} from './HoverHint';
import {ActivityProgress} from './MobilityPanel';
import {DetailTabs} from './DetailTabs';
import {LifeSummary,LifeDetails,TemporaryIllnessTrait} from './LifeDetails';
import {isDeceased} from '../core/lifeState';
import { OpinionDetails } from './OpinionDetails';
import {diplomaticQuote,returnRoute} from '../core/diplomacy';
import { playerRealm } from '../core/realm';
import type { RealmId } from '../core/realm';
import {useEffect,useState} from 'react';
import {PersonConnections} from './PersonConnections';
import { RelationshipPanel } from './RelationshipPanel';

import { FamilyPanel,FamilyCrest } from './FamilyPanel';
import {familyById} from '../data/families';

import { siteById } from '../data/scenario';
import { traitsFor,traitDefinitions } from '../core/social';
import { remainingDays } from '../core/world';
import { provisionCost } from '../core/construction';
import type { World,GameCommand } from '../core/types';
import { CharacterPortrait } from './CharacterPortrait';
import { TraitBadge,Resource,ArtIcon } from './ArtIcon';
import { SocialPanel } from './SocialPanel';
import { LifestylePanel } from './LifestylePanel';
import {personSheetPresentation} from './personSheetPresentation';
import {PersonOfficeSummary} from './PersonOfficeSummary';
import './personSheet.css';
export type PersonTab='overview'|'family'|'relations'|'interaction'|'focus';
export function MapPersonPanel({world:w,ids,lifeEntry,tab,onTab,onPerson,onSelect,onEconomy,onCourtPerson,onStaff,onEstate,onDiplomacy,onLocate,onCity,onIntrigue,pending,send}:{world:World;ids:string[];lifeEntry?:PersonLifeEntry|null;tab:PersonTab;onTab:(t:PersonTab)=>void;onPerson:(id:string)=>void;onSelect:(id:string)=>void;onDiplomacy:(r:RealmId)=>void;onEconomy:()=>void;onCourtPerson:(id:string)=>void;onStaff:(id:string)=>void;onEstate:()=>void;onLocate:(site:string)=>void;onCity:(id:string)=>void;onIntrigue?:(id:string)=>void;pending:boolean;send:(c:GameCommand)=>void}){
 const [order,setOrder]=useState<'provision'|'repatriate'|null>(null);
 const [familySelection,setFamilySelection]=useState<string|null>(null),[familyMode,setFamilyMode]=useState<'tree'|'legacy'>('tree');
 const raw=ids[0],id=raw==='player'?w.characterId??'player':raw,c=getCharacter(w,id)!,extra=getPerson(w,id)!,self=id===w.characterId||raw==='player',p=self?w.people[0]:w.people.find(p=>p.id===id),retired=w.social?.lineage.slice(0,-1).some(p=>p.id===id);
 useEffect(()=>setOrder(null),[id,tab]);
 const reference=familyPersonOf(w,id)!;
 if(!c&&!p&&!extra&&!reference)return <p>未找到人物。</p>;
 const lifeId=id==='player'?'fictional':id,deceased=isDeceased(w,lifeId);
 const provisionReason=!self||!p?'须由本人办理':p.journey?'抵达后才能补给':p.coins<provisionCost(w)?`盘缠不足，需要 ${provisionCost(w)} 钱`:w.realm?.event?'请先处理待决事务':'';
 const returnQuote=order==='repatriate'?diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}):null,route=order==='repatriate'?returnRoute(w):null;
 const orderReason=order==='provision'?provisionReason:returnQuote?.reason??'';
 const name=c?.name??extra?.name??reference?.name??p!.name,family=familyById[c?.family??reference?.family??extra?.family??''],realm=w.realm?allegianceRealm(w,id):c?.polity??extra?.realm,clan=family?clanStanding(w,id):null;
 const model=personSheetPresentation(w,id),canInteract=!retired&&!deceased&&(self&&!!w.realm||!self&&!!extra&&!!w.social);
 return <div className="person-sheet person-sheet--ink">
 {ids.length>1&&<nav className="person-picker-list" aria-label="此处人物">{ids.map(person=><button key={person} aria-pressed={person===raw} onClick={()=>onSelect(person)}><ArtIcon name="person" size={22}/>{getCharacter(w,person)?.name??getPerson(w,person)?.name??w.people.find(p=>p.id===person)?.name}</button>)}</nav>}
 <aside className="person-portrait-stage" aria-label={name+'的立绘'}>
  <div className="person-portrait-hall" aria-hidden="true"/>
  <div className="person-hero-portrait"><CharacterPortrait characterId={self&&!c?'fictional':id} name={name} world={w} cutout/></div>
  <nav className="person-portrait-shortcuts" aria-label="人物关联入口">
   {w.realm&&<button type="button" onClick={()=>onCourtPerson(id)}><ArtIcon name="influence" size={34}/><span>官职</span></button>}
   {family&&<button type="button" onClick={()=>onTab('family')}><ArtIcon name="renown" size={34}/><span>家族</span></button>}
   {w.retinue&&!deceased&&!isSovereign(w,id)&&(self||retinueMembers(w,id).length>0)&&<button type="button" onClick={()=>onStaff(id)}><ArtIcon name="person" size={34}/><span>幕府</span></button>}
  </nav>
  <div className="person-portrait-signature" aria-hidden="true"><strong>{name}</strong><small>{model.honour??model.title}</small></div>
 </aside>
 <div className="person-information">
 <header className="person-dossier-heading">
  <div className="person-heading-copy"><p className="person-status-line">{model.title}{self?' · 你':retired?' · 退居':extra?.status==='fictional'?' · 架空':''}</p><h2>{name}</h2><p className="person-rank-line">{[model.honour,model.title,model.rites?'加殊礼':null].filter(Boolean).join(' · ')}</p></div>
  <div className="person-heraldry">{realm&&<RealmBadge realm={realm} world={w} onOpen={onDiplomacy} seal/>}{family&&<HoverHint label={family.name+'家族'} content={<><strong>{family.name}</strong>{clan?.elite&&<><p>本国世族 · 族望第 {clan.rank} 位 · 家族威望 {clan.prestige}</p><p>联姻荫望 +{clan.marriage}；求官接受度 +{clan.petition}，城邑请任功绩门槛 −{clan.merit}。</p></>}</>}><button type="button" className={'person-clan'+(clan?.elite?' is-elite':'')} aria-label={'查看'+family.name+'家族详情'} onClick={()=>onTab('family')}><FamilyCrest family={family.id}/></button></HoverHint>}</div>
  <div className="person-demographics"><LifeSummary world={w} id={lifeId}/><HoverHint label="文化身份" content={(id==='gao-huan'?cultureSources.gao.note:id.startsWith('hulu-')?cultureSources.hulu.note:id==='hou-jing'?cultureSources.hou.note:'文化身份为剧本概括。')+' 文化独立于家族与效忠，换官、换国、换衣不改变身份。'}><small>{cultureNames[personCulture(w,id)]}</small></HoverHint>{model.site&&!deceased&&<button type="button" onClick={()=>onCity(model.site!)}>{model.traveling?'在途':'驻留'}{siteById[model.site]?.name}</button>}</div>
 </header>
 <PersonAbilities world={w} person={id} labels/>
 <div className="person-dossier-traits"><span>特质</span><div>{(c||extra)&&traitsFor(w,id).map(t=><span className="person-named-trait" key={t}><TraitBadge trait={t}/><small>{traitDefinitions[t].name}</small></span>)}<TemporaryIllnessTrait world={w} id={lifeId}/></div></div>
 <DetailTabs label="人物章节" value={tab} onChange={onTab} items={([{id:'overview',label:'总览',icon:'person'},{id:'family',label:'家族',icon:'renown'},{id:'relations',label:'关系',icon:'gregarious'},{id:'focus',label:'重心',icon:'diligent'},{id:'interaction',label:'互动',icon:'person'}] as const).filter(({id:key})=>key==='overview'||key==='family'&&!!family||key==='relations'||key==='focus'&&self||key==='interaction'&&canInteract)}/>

 <div key={id+'|'+tab} className="person-page-content">
 {tab==='overview'&&<>
 {w.custody?.records[id]&&<CustodyPerson key={'custody-'+id} world={w} person={id} pending={pending} send={send} onPerson={onPerson}/>}
 <PersonOfficeSummary world={w} person={id} model={model} onPerson={onPerson} onCity={onCity} onOffice={()=>onCourtPerson(id)}/>
 {!self&&w.social&&extra&&<OpinionDetails world={w} actor={w.characterId!} target={id}/>}
 <LifeDetails world={w} id={lifeId} entry={lifeEntry?.person===id?lifeEntry:null} pending={pending} send={send}/>
 {self&&w.social&&<SocialPanel world={w} pending={pending} send={send} onPerson={onPerson} section="self"/>}
 {self&&<ActivityProgress world={w} send={send} pending={pending}/>}
 {self&&p&&<section className="person-travel"><h3><ArtIcon name="world" size={26}/>行踪与行囊</h3>{w.realm&&w.realm.cities[p.location].controller!==playerRealm(w)&&<div><CommandButton label="请求返国通行" icon="world" pending={pending} reason={diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason} hint="预览指定返国路线与行粮支出，确认后启程。" onClick={()=>setOrder('repatriate')}/><p>{diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason||'只允许沿指定路线返回本国。'}</p></div>}<p>{siteById[p.location].name}{p.journey?' → '+siteById[p.journey.route.at(-1)!].name+' · 余 '+remainingDays(p)+' 日':' · 驻留'}</p><Resource name="coins" value={p.coins} label="盘缠" unit="钱"/><Resource name="grain" value={p.food} label="行粮" unit="日"/><div className="person-quick-actions"><CommandButton icon="grain" label="补充行粮" pending={pending} reason={provisionReason} hint={`个人盘缠 −${provisionCost(w)} 钱，行粮 +30 日份；预览后确认。`} onClick={()=>setOrder('provision')}/></div></section>}
 {reference&&!c&&<p>{reference.description}</p>}
 {c&&<section className="detail-record-group"><h4>生平</h4><p>{c.biography}</p></section>}
 </>}
 {tab==='family'&&family&&<>{self&&<DetailTabs label="家族事务" value={familyMode} onChange={setFamilyMode} items={[{id:'tree',label:'族谱',icon:'renown'},{id:'legacy',label:'世业继任',icon:'estate'}]}/>}{(!self||familyMode==='tree')&&<FamilyPanel world={w} selected={familySelection??id} onSelect={setFamilySelection} onPerson={onPerson}/>}{self&&familyMode==='legacy'&&<SocialPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}</>}

 {tab==='focus'&&self&&<LifestylePanel world={w} pending={pending} send={send}/>}
 {tab==='interaction'&&w.realm&&allegianceRealm(w,id)&&<NobilityPanel world={w} realm={allegianceRealm(w,id)!} person={id} pending={pending} send={send} onPerson={onPerson}/>}
 {tab==='relations'&&<PersonConnections key={id} world={w} person={id} onPerson={onPerson}/>}
 {tab==='interaction'&&self&&w.realm&&!deceased&&<PactRequestPanel world={w} pending={pending} send={send}/>}
 {tab==='interaction'&&!self&&w.social&&extra&&!retired&&!deceased&&<>{!w.custody?.records[id]&&<CustodyPerson key={'arrest-'+id} world={w} person={id} pending={pending} send={send} onPerson={onPerson}/>}<RelationshipPanel onIntrigue={onIntrigue} key={id} world={w} pending={pending} send={send} targetId={id}/></>}

 {order&&self&&p&&<ActionDialog title={(order==='provision'?'补充行粮':'请求返国通行')+' · '+name} scene="landscape" onClose={()=>setOrder(null)} actions={<button className="primary" disabled={pending||!!orderReason} onClick={()=>{if(pending||(order==='provision'?provisionReason:diplomaticQuote(w,{type:'diplomacy',action:'repatriate'}).reason))return;send(order==='provision'?{type:'provision'}:{type:'diplomacy',action:'repatriate'});setOrder(null);}}>{order==='provision'?'确认补给 · '+provisionCost(w)+' 钱':'确认返国'}</button>}>
 {order==='provision'?<p>{name}在{siteById[p.location].name}以本人盘缠支付 {provisionCost(w)} 钱，补充 30 日行粮。</p>:<><p>执行者：{name}。仅允许沿指定路线返回本国，不能改道访问他国。</p>{route&&<p>{route.route.map(site=>siteById[site].name).join(' → ')} · 路程 {route.days} 日 · 本人行粮 −{route.food} 日份。</p>}</>}
 {orderReason&&<p className="service-warning" role="status">{orderReason}</p>}
 </ActionDialog>}
 </div>
 <footer className="person-dossier-footer">
  {self?<>{w.realm&&<CommandButton label="查看经济" icon="coins" hint="查看本人财产、收入与支出。" onClick={onEconomy}/>}<CommandButton label="家族庄园" icon="estate" hint="查看庄园与营建。" onClick={onEstate}/></>:canInteract&&<CommandButton label="人物互动" icon="gregarious" hint={'与'+name+'交往、议婚或办理委任。'} onClick={()=>onTab('interaction')}/>}
  {model.site&&!deceased&&<CommandButton label="地图定位" icon="world" hint={'定位'+name+'的'+(model.traveling?'当前途经地。':'驻地。')} onClick={()=>onLocate(model.site!)}/>}
 </footer>
 </div>
 </div>;
}

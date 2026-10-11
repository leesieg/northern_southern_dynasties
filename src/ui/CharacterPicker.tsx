import {OpeningBrief} from './OpeningBrief';
import {LoadingMark} from './LoadingMark';
import {getCharacter,getPerson} from '../core/personRegistry';
import {RealmFlag} from './RealmFlag';
import type {Polity,World} from '../core/types';
import {familyById} from '../data/families';

import {useEffect,useRef,useState} from 'react';
import type {FeatureCollection,Geometry,Position} from 'geojson';
import {ageLabel} from '../core/lifeState';
import {regimeName,politicalTitle} from '../core/government';
import {Resource,ArtIcon} from './ArtIcon';
import {CharacterPortrait} from './CharacterPortrait';
import {getScript} from '../data/scripts';
import {relationsFor,roleNames,startRules,familyName} from '../data/characters';
import {siteById} from '../data/scenario';
import {territories} from '../map/territories';
import './characters.css';
const project=([lon,lat]:Position)=>[(lon-100)*25,(42-lat)*30];
function line(points:Position[],closed=false){return points.map((p,i)=>(i?'L':'M')+project(p).join(',')).join(' ')+(closed?'Z':'');}
function path(g:Geometry):string{switch(g.type){case 'Polygon':return g.coordinates.map(p=>line(p,true)).join(' ');case 'MultiPolygon':return g.coordinates.flatMap(p=>p.map(r=>line(r,true))).join(' ');case 'LineString':return line(g.coordinates);case 'MultiLineString':return g.coordinates.map(p=>line(p)).join(' ');case 'GeometryCollection':return g.geometries.map(path).join(' ');default:return '';}}
const regions=territories.features.map(f=>({id:String(f.properties?.id),polity:f.properties?.polity as Polity,shape:path(f.geometry)}));
const realmColors:Record<Polity,string>={liang:'#71986c',east:'#cb9a57',west:'#b56d59',frontier:'#b8b9ad'};
export function CharacterPicker({selected,onSelect,allowFictional=true,scriptId,sandbox=false,world,pending=false}:{selected:string;onSelect:(id:string)=>void;allowFictional?:boolean;scriptId?:string;sandbox?:boolean;world?:World;pending?:boolean;onPerson?:(id:string)=>void}){
 const listRef=useRef<HTMLDivElement>(null);
 const script=getScript(scriptId),roster=script.characterIds.map(id=>getCharacter(world,id)!).filter(Boolean);
 const [realm,setRealm]=useState('all'),[query,setQuery]=useState(''),[city,setCity]=useState(''),[profile,setProfile]=useState<'realm'|'person'>('realm'),[geography,setGeography]=useState<{land:string;rivers:string}|null>(null),[mapError,setMapError]=useState(false),[mapAttempt,setMapAttempt]=useState(0);
 useEffect(()=>{setMapError(false);const controller=new AbortController();Promise.all(['land','rivers'].map(async name=>{const response=await fetch(import.meta.env.BASE_URL+'data/'+name+'.geojson'+(mapAttempt?'?retry='+mapAttempt:''),{signal:controller.signal});if(!response.ok)throw new Error('map');const data=await response.json() as FeatureCollection;return data.features.map(f=>path(f.geometry)).join(' ');})).then(([land,rivers])=>setGeography({land,rivers})).catch(()=>{if(!controller.signal.aborted)setMapError(true);});return()=>controller.abort();},[mapAttempt]);
 const points=roster.map(p=>project([siteById[p.home].lon,siteById[p.home].lat])),left=Math.min(-65,...points.map(p=>p[0]-35)),top=Math.min(-12,...points.map(p=>p[1]-35)),right=Math.max(710,...points.map(p=>p[0]+65)),bottom=Math.max(638,...points.map(p=>p[1]+35));
 const c=getCharacter(world,selected)!,rules=c?startRules(c):null;
 const visible=roster.filter(p=>(realm==='all'||p.polity===realm)&&(p.name+p.title+siteById[p.home].name+(familyById[p.family]?.name??familyName(p.family))).includes(query.trim()));
 const cities=[...new Set(visible.map(p=>p.home))],activeCity=cities.includes(city)?city:'',listed=activeCity?visible.filter(p=>p.home===activeCity):visible;
 useEffect(()=>{listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({block:'nearest'});},[selected,realm,query,activeCity]);
 const choose=(id:string)=>{onSelect(id);};
 const pickCity=(id:string)=>{if(pending)return;const people=visible.filter(p=>p.home===id);setCity(id);if(people.length===1)choose(people[0].id);};
 const reset=()=>{setRealm('all');setQuery('');setCity('');};
 const principal=(role:string)=>role==='ruler'||role==='regent';
 return <fieldset className="character-picker campaign-cast" disabled={pending} aria-label="新战役人物选择">
  <aside className="cast-sidebar" aria-label="可选人物">
   <nav className="cast-realms" aria-label="政权筛选">{[['all','全部'],['liang','梁'],['east','东魏'],['west','西魏']].map(([id,label])=><button type="button" key={id} aria-pressed={realm===id} onClick={()=>{setRealm(id);setCity('');}}>{label}</button>)}</nav>
   {activeCity&&<div className="cast-city-filter"><span>{siteById[activeCity].name} · {listed.length} 人</span><button type="button" onClick={()=>setCity('')}>全部地点</button></div>}
   <div className="cast-scroll" ref={listRef}>{[{name:'君主与执政',test:(role:string)=>principal(role)},{name:'宗室与群臣',test:(role:string)=>!principal(role)}].map(group=>{const people=listed.filter(p=>group.test(p.role));return people.length>0&&<section className="cast-group" key={group.name}><h3>{script.name} · {group.name}</h3><div className="cast-grid">{people.map(p=><button type="button" key={p.id} className="cast-person" aria-pressed={selected===p.id} aria-label={p.name+' · '+politicalTitle(world,p.id)+' · '+siteById[p.home].name} onClick={()=>choose(p.id)}><span className="cast-ribbon">{roleNames[p.role]}</span><CharacterPortrait characterId={p.id} world={world} compact/><strong>{p.name}</strong><small>{siteById[p.home].name} · {regimeName(world,p.polity)}</small></button>)}</div></section>;})}
    {!listed.length&&<p className="cast-empty">没有匹配人物。<button type="button" onClick={reset}>清除筛选</button></p>}
    {allowFictional&&<section className="cast-group"><h3>营建教学</h3><div className="cast-grid"><button type="button" className="cast-person" aria-pressed={selected==='fictional'} onClick={()=>choose('fictional')}><span className="cast-ribbon">行旅</span><CharacterPortrait characterId="fictional" compact/><strong>沈行舟</strong><small>建康 · 架空人物</small></button></div></section>}
   </div>
   <div className="cast-search"><input aria-label="搜索剧本人物" placeholder="搜索姓名、身份、城市…" value={query} onChange={e=>{setQuery(e.target.value);setCity('');}}/>{(query||realm!=='all'||city)&&<button type="button" onClick={reset}>清除筛选</button>}<small>{listed.length} 位人物{selected!=='fictional'&&!listed.some(p=>p.id===selected)?' · 所选人物在筛选范围外':''}</small></div>
  </aside>
  <div className="cast-map" aria-label="开局山河与人物地点">
   <svg viewBox={`${left} ${top} ${right-left} ${bottom-top}`} aria-label="选择人物所在城市"><title>三国并立 · 开局人物地图</title><defs><filter id="cast-paper"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="8"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".10"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs>
    {geography&&<path d={geography.land} fill="#d5d2bf" stroke="#8b8a77" strokeWidth="1"/>}
    <g filter="url(#cast-paper)">{regions.map(region=><path key={region.id} d={region.shape} fill={realmColors[region.polity]??realmColors.frontier} fillOpacity={!c||c.polity===region.polity? .78:.42} stroke="#655f4b" strokeOpacity=".4" strokeWidth=".7"/>)}</g>
    {geography&&<path d={geography.rivers} fill="none" stroke="#748e91" strokeWidth="1.3"/>}
    {cities.map(id=>{const site=siteById[id],[x,y]=project([site.lon,site.lat]),people=visible.filter(p=>p.home===id),person=people.find(p=>p.id===selected)??people[0],chosen=c?.home===id;return <g key={id} className={'cast-map-pin'+(chosen?' is-selected':'')} role="button" tabIndex={pending?-1:0} aria-disabled={pending} aria-label={site.name+' · '+people.map(p=>p.name).join('、')} aria-pressed={activeCity===id||chosen} onClick={()=>pickCity(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickCity(id);}}}><path d={`M${x-13} ${y-8}a13 13 0 1 1 26 0q0 9-13 22q-13-13-13-22`} fill={chosen?'#a94732':'#292c25'} stroke={chosen?'#ddbd72':'#eee7d7'} strokeWidth="1.5"/><foreignObject x={x-11} y={y-20} width="22" height="22"><CharacterPortrait characterId={person.id} world={world} compact/></foreignObject><text x={x+17} y={y-5}>{site.name}{people.length>1?' · '+people.length:''}</text></g>;})}
   </svg>
   {!geography&&!mapError&&<div className="cast-map-status"><LoadingMark compact label="铺展开局山河"/></div>}{mapError&&<p className="cast-map-status" role="status">陆地与河流底图未能加载；仍可通过人物标记或名单选择。<button type="button" onClick={()=>setMapAttempt(n=>n+1)}>重试底图</button></p>}
   <div className="cast-map-caption"><span>{c?siteById[c.home].name+' · '+regimeName(world,c.polity):'建康 · 江左行旅'}</span><small>开局控制区示意 · 沿用游戏区划，非考据县界</small></div>
  </div>
  <article className="cast-profile" aria-label="所选人物"><header className="cast-identity">{c&&<RealmFlag realm={c.polity} showLabel={false}/>}<h2>{c?.name??'沈行舟'}</h2><p>{c?politicalTitle(world,c.id):'江左行旅'}</p><small>{c?roleNames[c.role]:'营建教学'} · {ageLabel(world,selected)}{getPerson(world,selected)?.status==='fictional'||selected==='fictional'?' · 架空人物':''}</small></header>
   <nav className="cast-profile-tabs" aria-label="开局详情">{(['realm','person'] as const).map(tab=><button type="button" key={tab} aria-pressed={profile===tab} onClick={()=>setProfile(tab)}>{tab==='realm'?'开局':'人物'}</button>)}</nav>
   <div className="cast-profile-body" key={selected+'|'+profile}>{c&&rules?<>{profile==='realm'?<><h3>{familyById[c.family]?.name??familyName(c.family)}</h3><p>{regimeName(world,c.polity)} · {siteById[c.home].name} · {siteById[c.home].terrain}</p><h4>开局身份</h4><div className="cast-start-icons"><RealmFlag realm={c.polity} compact showLabel={false}/><ArtIcon name={c.role==='ruler'?'renown':c.role==='commander'?'army':'influence'} size={42}/><ArtIcon name="estate" size={42}/></div><p>{c.title}</p><div className="cast-resources"><Resource caption name="coins" value={rules.coins} label="起始盘缠" unit="钱"/><Resource caption name="grain" value={rules.food} label="起始行粮" unit="日"/></div><p className="cast-objective">{sandbox?"从此人的真实身份与家产开始":`120 日内：${siteById[c.home].name}市肆 ${rules.market} 级、${rules.granary?'城仓 '+rules.granary+' 级':'驿舍 1 级'}、田庄 1 级，经营满 30 日。`}</p>{sandbox&&<OpeningBrief person={c.id} script={script.id}/>}</>:<><div className="cast-biography"><CharacterPortrait characterId={c.id} world={world}/><p>{c.biography}</p></div><h4>亲族与同道</h4><div className="cast-kin">{relationsFor(c.id).filter(r=>roster.some(p=>p.id===r.id)).map(r=><button type="button" key={r.id} onClick={()=>{reset();choose(r.id);}}><CharacterPortrait characterId={r.id} compact/><span>{getCharacter(world,r.id)!.name}<small>{r.label}</small></span></button>)}</div></>}</>:<p>从建康赴京口领取营建委任，建成市肆与田庄后返回建康。120 日期限，180 钱、90 日行粮。</p>}</div>
  </article>
 </fieldset>;
}

import {parentLinksOf,getPerson,familyPersonOf} from '../core/personRegistry';
import {worldRealms} from '../core/polityRuntime';
import {siteById} from '../data/scenario';
import {ArtIcon,type ArtName} from './ArtIcon';
import {HoverHint} from './HoverHint';
import {CharacterPortrait} from './CharacterPortrait';

import {relationshipParents,friendshipNames} from '../data/relationships';
import {spouseOf,validRegency} from '../core/relationships';
import {officeHierarchy,directSubordinates,superiorOffice} from '../core/offices';
import {ageLabel,lifeOf,isDeceased} from '../core/lifeState';
import type {World} from '../core/types';
type Contact={id:string;label:string};
export function PersonConnections({world:w,person,onPerson}:{world:World;person:string;onPerson:(id:string)=>void}){
 const edges=[...parentLinksOf(w),...relationshipParents],parents=edges.filter(e=>e.child===person).map(e=>e.parent),children=edges.filter(e=>e.parent===person).map(e=>e.child),siblings=edges.filter(e=>parents.includes(e.parent)&&e.child!==person).map(e=>e.child),spouse=spouseOf(w,person);
 const kin:Contact[]=[...(spouse?[{id:spouse,label:'配偶'}]:[]),...parents.map(id=>({id,label:'父母'})),...edges.filter(e=>parents.includes(e.child)).map(e=>({id:e.parent,label:'祖辈'})),...children.map(id=>({id,label:'子女'})),...siblings.map(id=>({id,label:'手足'}))];
 const relatedBonds=Object.values(w.relationships?.bonds??{}).filter(b=>b.a===person||b.b===person);
 const bonds:Contact[]=relatedBonds.filter(b=>b.kind==='friend'||b.kind==='confidant').map(b=>({id:b.a===person?b.b:b.a,label:friendshipNames[b.kind]}));
 const rivals:Contact[]=relatedBonds.filter(b=>b.kind==='rival'||b.kind==='nemesis').map(b=>({id:b.a===person?b.b:b.a,label:friendshipNames[b.kind]}));
 const offices=officeHierarchy(w),service:Contact[]=directSubordinates(offices,person).map(n=>({id:n.holder!,label:n.name}));
 for(const n of offices.filter(n=>n.holder===person)){const boss=superiorOffice(offices,n);if(boss?.holder&&boss.holder!==person)service.unshift({id:boss.holder,label:'上级 · '+boss.name});}
 for(const [id,m] of Object.entries(w.retinue?.members??{})){if(m.host===person)service.push({id,label:'幕僚'});if(id===person)service.unshift({id:m.host,label:'幕主'});}
 const oath=w.relationships?.oaths[person];if(oath)service.push({id:oath.lord,label:'效忠领主'});
 Object.entries(w.relationships?.oaths??{}).filter(([,o])=>o.lord===person).forEach(([id])=>service.push({id,label:'誓约属员'}));
 for(const r of worldRealms(w)){const c=validRegency(w,r);if(c&&c.origin!=='restored'){if(c.ruler===person)service.push({id:c.controller,label:'实际执政者'});else if(c.controller===person)service.push({id:c.ruler,label:'受控君主'});}}
 const unique=(rows:Contact[])=>Array.from(new Set(rows.map(p=>p.id))).map(id=>({id,label:Array.from(new Set(rows.filter(p=>p.id===id).map(p=>p.label))).join(' · ')}));
 const groups:{id:string;label:string;icon:ArtName;contacts:Contact[]}[]=[
  {id:'kin',label:'亲族',icon:'renown',contacts:unique(kin)},
  {id:'bonds',label:'亲友',icon:'gregarious',contacts:unique(bonds)},
  {id:'rivals',label:'仇敌',icon:'stress',contacts:unique(rivals)},
  {id:'service',label:'统属',icon:'influence',contacts:unique(service)}
 ];
 return <section className="person-connections" aria-label="人物关系">{groups.map(group=><div key={group.id} className="diplomacy-relation-row person-relation-row" role="group" aria-label={group.label+' · '+group.contacts.length+' 人'}>
  <span><ArtIcon name={group.icon} size={24}/>{group.label}<small className="connection-count">{group.contacts.length}</small></span>
  <div>{group.contacts.map(p=>{const name=getPerson(w,p.id)?.name??familyPersonOf(w,p.id)?.name??'未录人物',status=isDeceased(w,p.id)?'已故':lifeOf(w,p.id)?ageLabel(w,p.id):'';return <HoverHint key={p.id} label={name+' · '+p.label} content={<><strong>{name}</strong><p>{p.label}</p>{status&&<p>{status}</p>}</>}><button type="button" onClick={()=>onPerson(p.id)} className="connection-person" aria-label={'查看'+name+' · '+p.label+(status?' · '+status:'')}><CharacterPortrait characterId={p.id} name={name} world={w} compact/><span className="connection-copy"><strong>{name}</strong><small>{p.label}</small></span></button></HoverHint>;})}{!group.contacts.length&&<small className="person-relation-empty">暂无</small>}</div>
 </div>)}</section>;
}
export function PersonDomains({world,person,onCity}:{world:World;person:string;onCity:(id:string)=>void}){
 const domains=officeHierarchy(world).filter(n=>n.kind==='city'&&n.holder===person&&n.active&&n.site);
 if(!domains.length)return null;
 return <section className="person-domains" aria-label="亲自治理的领地"><span className="eyebrow">领地 · {domains.length}</span><div>{domains.map(n=><button key={n.id} className="domain-badge" onClick={()=>onCity(n.site!)} title={n.name}><span className="domain-seal" aria-hidden="true">{siteById[n.site!].name.slice(0,2)}</span><small>{siteById[n.site!].name}</small></button>)}</div></section>;
}

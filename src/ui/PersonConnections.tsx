import {worldRealms} from '../core/polityRuntime';
import {siteById} from '../data/scenario';
import {useState} from 'react';
import {DetailTabs} from './DetailTabs';
import {CharacterPortrait} from './CharacterPortrait';
import {parentLinks,familyPersonById} from '../data/families';
import {relationshipParents,relationshipPersonById,friendshipNames} from '../data/relationships';
import {spouseOf,validRegency} from '../core/relationships';
import {officeHierarchy,directSubordinates,superiorOffice} from '../core/offices';
import {ageLabel,lifeOf,isDeceased} from '../core/lifeState';
import type {World} from '../core/types';
type Contact={id:string;label:string};
export function PersonConnections({world:w,person,onPerson}:{world:World;person:string;onPerson:(id:string)=>void}){
 const [tab,setTab]=useState<'kin'|'bonds'|'service'>('kin');
 const edges=[...parentLinks,...relationshipParents],parents=edges.filter(e=>e.child===person).map(e=>e.parent),children=edges.filter(e=>e.parent===person).map(e=>e.child),siblings=edges.filter(e=>parents.includes(e.parent)&&e.child!==person).map(e=>e.child),spouse=spouseOf(w,person);
 const kin:Contact[]=[...(spouse?[{id:spouse,label:'配偶'}]:[]),...parents.map(id=>({id,label:'父母'})),...edges.filter(e=>parents.includes(e.child)).map(e=>({id:e.parent,label:'祖辈'})),...children.map(id=>({id,label:'子女'})),...siblings.map(id=>({id,label:'手足'}))];
 const bonds:Contact[]=Object.values(w.relationships?.bonds??{}).filter(b=>b.a===person||b.b===person).map(b=>({id:b.a===person?b.b:b.a,label:friendshipNames[b.kind]}));
 const offices=officeHierarchy(w),service:Contact[]=directSubordinates(offices,person).map(n=>({id:n.holder!,label:n.name}));
 for(const n of offices.filter(n=>n.holder===person)){const boss=superiorOffice(offices,n);if(boss?.holder&&boss.holder!==person)service.unshift({id:boss.holder,label:'上级 · '+boss.name});}
 for(const [id,m] of Object.entries(w.retinue?.members??{})){if(m.host===person)service.push({id,label:'幕僚'});if(id===person)service.unshift({id:m.host,label:'幕主'});}
 const oath=w.relationships?.oaths[person];if(oath)service.push({id:oath.lord,label:'效忠领主'});
 Object.entries(w.relationships?.oaths??{}).filter(([,o])=>o.lord===person).forEach(([id])=>service.push({id,label:'誓约属员'}));
 for(const r of worldRealms(w)){const c=validRegency(w,r);if(c&&c.origin!=='restored'){if(c.ruler===person)service.push({id:c.controller,label:'实际执政者'});else if(c.controller===person)service.push({id:c.ruler,label:'受控君主'});}}
 const unique=(rows:Contact[])=>Array.from(new Set(rows.map(p=>p.id))).map(id=>({id,label:Array.from(new Set(rows.filter(p=>p.id===id).map(p=>p.label))).join(' · ')}));
 const groups={kin:unique(kin),bonds:unique(bonds),service:unique(service)},rows=groups[tab];
 return <section className="person-connections"><DetailTabs label="人物关系" value={tab} onChange={setTab} items={[{id:'kin',label:`亲族 ${groups.kin.length}`,icon:'renown'},{id:'bonds',label:`亲友 ${groups.bonds.length}`,icon:'gregarious'},{id:'service',label:`统属 ${groups.service.length}`,icon:'influence'}]}/><div className="connection-grid">{rows.map(p=>{const name=relationshipPersonById[p.id]?.name??familyPersonById[p.id]?.name??'未录人物';return <button key={p.id} onClick={()=>onPerson(p.id)} className="connection-person"><CharacterPortrait characterId={p.id} name={name} world={w} compact/><strong>{name}</strong><small>{p.label}</small>{(lifeOf(w,p.id)||isDeceased(w,p.id))&&<small>{isDeceased(w,p.id)?'已故':ageLabel(w,p.id)}</small>}</button>;})}</div>{!rows.length&&<p className="small-note">{tab==='kin'?'暂无已录亲属。':tab==='bonds'?'尚无亲友或仇敌关系。':'暂无直属统属关系。'}</p>}</section>;
}
export function PersonDomains({world,person,onCity}:{world:World;person:string;onCity:(id:string)=>void}){
 const domains=officeHierarchy(world).filter(n=>n.kind==='city'&&n.holder===person&&n.active&&n.site);
 if(!domains.length)return null;
 return <section className="person-domains" aria-label="亲自治理的领地"><span className="eyebrow">领地 · {domains.length}</span><div>{domains.map(n=><button key={n.id} className="domain-badge" onClick={()=>onCity(n.site!)} title={n.name}><span className="domain-seal" aria-hidden="true">{siteById[n.site!].name.slice(0,2)}</span><small>{siteById[n.site!].name}</small></button>)}</div></section>;
}

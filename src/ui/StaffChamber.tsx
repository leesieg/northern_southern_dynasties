import {useState} from 'react';
import {ArtIcon} from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import {DetailTabs} from './DetailTabs';
import {LocalOfficeSeat,LocalRequests} from './LocalAdministration';
import {OfficialActions} from './OfficialActions';
import {PersonSelectionDialog,PositionSeat} from './PersonSelection';
import {PublicSuccessionPanel} from './PublicSuccessionPanel';
import {RetinuePanel} from './RetinuePanel';
import {RealmBadge} from './RealmBadge';
import {isSovereign} from '../core/officialDuties';
import {officeCandidates} from '../core/officeEligibility';
import {courtEnabled,courtOf,courtReason,courtSalary,ministryCompetent} from '../core/court';
import {governmentExecutive,governmentOf,politicalName,regimeName} from '../core/government';
import {isAlive} from '../core/lifeState';
import {officeHierarchy} from '../core/offices';
import {playerRealm} from '../core/realm';
import {retinueMembers} from '../core/retinue';
import {ministryIds,ministries,type MinistryId} from '../data/court';
import {territoryNodes} from '../data/territorialHierarchy';
import type {GameCommand,World} from '../core/types';
import './staffChamber.css';

export type CourtTab='central'|'local'|'succession';
type Props={world:World;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onTerritory:(id:string)=>void;onFind:()=>void;onInteract:(id:string)=>void;tab:CourtTab;onTab:(tab:CourtTab)=>void;region:string;onRegion:(region:string)=>void};

function belongsToProvince(territory:string,province:string){
 let node:(typeof territoryNodes)[string]|undefined=territoryNodes[territory];
 while(node){if(node.id===province)return true;node=node.parent?territoryNodes[node.parent]:undefined;}
 return false;
}

export function StaffChamber({world:w,pending,send,onPerson,onTerritory,onFind,onInteract,tab,onTab,region,onRegion}:Props){
 const [office,setOffice]=useState<MinistryId|null>(null),[candidate,setCandidate]=useState(''),[dismissConfirm,setDismissConfirm]=useState(false);
 const id=w.characterId!,realm=playerRealm(w);
 if(!isSovereign(w,id)){
  const members=retinueMembers(w,id);
  return <div className="staff-chamber"><div className="staff-chamber-owner"><ArtIcon name="person" size={28}/><span><strong>{politicalName(id)}</strong><small>幕主 · 个人幕僚</small></span></div><div className="staff-chamber-summary"><span><ArtIcon name="person" size={25}/><strong>{members.length} / 6</strong><small>已延聘</small></span><span><ArtIcon name="coins" size={25}/><strong>{members.reduce((sum,m)=>sum+(m.post?4:2),0)}</strong><small>钱／月俸给</small></span><span><ArtIcon name="influence" size={25}/><strong>{members.filter(m=>!!m.post).length}</strong><small>已授幕职</small></span></div><RetinuePanel world={w} host={id} pending={pending} send={send} onPerson={onPerson} onFind={onFind} onInteract={onInteract}/></div>;
 }
 const nodes=officeHierarchy(w).filter(node=>node.realm===realm),court=courtOf(w),government=governmentOf(w),executive=governmentExecutive(w),central=nodes.filter(node=>node.id.includes(':ministry:'));
 const local=[...new Map(nodes.filter(node=>!!node.territory).map(node=>[node.territory!,node])).values()],provinces=local.filter(node=>territoryNodes[node.territory!]?.level==='province'),selectedRegion=provinces.some(node=>node.territory===region)?region:provinces[0]?.territory??'';
 const localHere=selectedRegion?local.filter(node=>belongsToProvince(node.territory!,selectedRegion)):local;
 const appointed=central.filter(node=>!!node.holder).length,localAppointed=local.filter(node=>!!node.holder).length;
 const command=office?{type:'court',action:'appoint',ministry:office,candidate} as const:null;
 const dismiss=office?{type:'court',action:'appoint',ministry:office,candidate:null} as const:null;
 const openOffice=(ministry:MinistryId,holder:string|null)=>{setOffice(ministry);setCandidate(holder??id);setDismissConfirm(false);};
 return <div className="staff-chamber">
  <div className="staff-chamber-owner"><RealmBadge realm={realm} world={w}/><span><strong>{regimeName(w,realm)}</strong><small>在位君主 · {politicalName(id)}</small></span></div>
  <div className="staff-chamber-summary"><span><ArtIcon name="person" size={25}/><strong>{appointed} / {ministryIds.length}</strong><small>中枢任官</small></span><span><ArtIcon name="city" size={25}/><strong>{localAppointed} / {local.length}</strong><small>地方主官</small></span><span><ArtIcon name="coins" size={25}/><strong>{courtSalary(w,realm)}</strong><small>中央月俸 · 钱</small></span></div>
  <DetailTabs label="朝廷事务" value={tab} onChange={onTab} items={[{id:'central',label:'中枢',icon:'influence'},{id:'local',label:'地方',icon:'city'},{id:'succession',label:'继统',icon:'renown'}]}/>
  {tab==='central'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>中枢官署</h3><small>当前朝廷 · 君主亲临</small></div>{!courtEnabled(w,realm)&&<p className="government-warning">当前政体暂停中央履职与俸给；任命须待政体恢复。</p>}{!executive&&<p className="government-warning">当前君主未掌实际执政权，中央任免须由执政者决定。</p>}<div className="staff-central-grid">{ministryIds.map(ministry=>{const node=central.find(item=>item.id.endsWith(':'+ministry)),holder=node?.holder??null,competent=holder&&ministryCompetent(w,realm,ministry),merit=holder?(government?.merit[holder]??0):null;return <div className="staff-central-office" key={ministry}><PositionSeat compact world={w} holder={holder} title={ministries[ministry].name} status={holder?`功绩 ${merit} · ${!courtEnabled(w,realm)?'履职暂停':competent?'称职':'履职不足'}`:'待任命'} onPerson={onPerson} onManage={executive?()=>openOffice(ministry,holder):undefined}/><p>{ministries[ministry].duty} · {ministries[ministry].effect}</p>{holder&&executive&&<OfficialActions world={w} person={holder} pending={pending} send={send}/>}</div>;})}</div></section>}
  {tab==='local'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>地方任职</h3><small>按州查阅与授官；县级与城市共用治理席位</small></div>{provinces.length>0&&<nav className="staff-region-list" aria-label="选择州域">{provinces.map(node=><button key={node.id} aria-pressed={selectedRegion===node.territory} onClick={()=>onRegion(node.territory!)}>{territoryNodes[node.territory!].name}<small>{local.filter(item=>belongsToProvince(item.territory!,node.territory!)).filter(item=>!!item.holder).length} 任</small></button>)}</nav>}{(['province','prefecture','county'] as const).map(level=>{const group=localHere.filter(node=>territoryNodes[node.territory!]?.level===level);return group.length?<div className="staff-local-group" key={level}><h4>{level==='province'?'州刺史':level==='prefecture'?'郡太守':'县令／县长'} <small>{group.filter(node=>!!node.holder).length} / {group.length} 在任</small></h4><div className="staff-local-grid">{group.map(node=><div className="staff-local-office" key={node.id}><header><strong>{territoryNodes[node.territory!].name}</strong><button onClick={()=>onTerritory(node.territory!)}>查看辖区 ›</button></header><LocalOfficeSeat world={w} territory={node.territory!} realm={realm} pending={pending} send={send} onPerson={onPerson}/></div>)}</div></div>:null;})}<LocalRequests world={w} pending={pending} send={send} onPerson={onPerson}/></section>}
  {tab==='succession'&&<section className="staff-chamber-body"><PublicSuccessionPanel world={w} pending={pending} send={send} onPerson={onPerson}/></section>}
  {office&&command&&<PersonSelectionDialog world={w} title={'任命 · '+ministries[office].name} value={candidate} onSelect={setCandidate} onClose={()=>setOffice(null)} pending={pending} description={<>{ministries[office].duty} · {ministries[office].effect}。任免消耗个人影响力 15；功绩达到 40 时称职，撤换原任者即时生效。</>} options={officeCandidates(w,realm).filter(person=>isAlive(w,person.id)).map(person=>({id:person.id,score:government?.merit[person.id]??0,metric:'功绩',reason:courtReason(w,{...command,candidate:person.id})}))} confirmLabel="确认任命 · 15 影响力" onConfirm={()=>{if(pending||courtReason(w,command))return;send(command);setOffice(null);}}>{court?.ministries[office]&&dismiss&&executive&&<><button disabled={pending||!!courtReason(w,dismiss)} onClick={()=>setDismissConfirm(true)}>免职 · 15 影响力</button>{dismissConfirm&&<ConfirmAction title="免职" detail="撤销此人的中央官职与履职增益。" confirmLabel="确认免职" danger pending={pending||!!courtReason(w,dismiss)} onCancel={()=>setDismissConfirm(false)} onConfirm={()=>{if(pending||courtReason(w,dismiss))return;send(dismiss);setOffice(null);setDismissConfirm(false);}}/>}</>}</PersonSelectionDialog>}
 </div>;
}

import {useState} from 'react';
import {ArtIcon} from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import {DetailTabs} from './DetailTabs';
import {LocalOfficeSeat,LocalRequests} from './LocalAdministration';
import {OfficialActions} from './OfficialActions';
import {PersonSelectionDialog,PositionSeat} from './PersonSelection';
import {PublicSuccessionPanel} from './PublicSuccessionPanel';
import {RetinuePanel} from './RetinuePanel';
import {CourtTreasuryPanel} from './CourtTreasuryPanel';
import {GovernmentAuditPanel} from './GovernmentAudit';
import {GovernmentPanel} from './GovernmentPanel';
import {OfficeHierarchy} from './OfficeHierarchy';
import {LocalCareer} from './LocalAdministration';
import {ServiceProfile} from './ServicePanel';
import {ResignationPanel} from './ResignationPanel';
import {HoverHint} from './HoverHint';
import {CharacterPortrait} from './CharacterPortrait';
import {clanStanding} from '../core/clans';
import {recommendationBonus} from '../core/retinue';
import {RealmBadge} from './RealmBadge';
import {isSovereign} from '../core/officialDuties';
import {officeCandidates} from '../core/officeEligibility';
import {courtEnabled,courtOf,courtReason,courtSalary,ministryCompetent} from '../core/court';
import {governmentExecutive,governmentOf,politicalName,regimeName} from '../core/government';
import {isAlive} from '../core/lifeState';
import {officeHierarchy} from '../core/offices';
import {playerRealm,realmReason} from '../core/realm';
import {retinueMembers} from '../core/retinue';
import {ministryIds,ministries,type MinistryId} from '../data/court';
import {territoryNodes} from '../data/territorialHierarchy';
import type {GameCommand,World} from '../core/types';
import './staffChamber.css';

export type CourtTab='central'|'local'|'person'|'finance'|'government';
type Props={world:World;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onTerritory:(id:string)=>void;onService:()=>void;tab:CourtTab;onTab:(tab:CourtTab)=>void;region:string;onRegion:(region:string)=>void;person:string;financeView:'treasury'|'audit';treasuryTab:'budget'|'requests'|'ledger'};

function belongsToProvince(territory:string,province:string){
 let node:(typeof territoryNodes)[string]|undefined=territoryNodes[territory];
 while(node){if(node.id===province)return true;node=node.parent?territoryNodes[node.parent]:undefined;}
 return false;
}

export function RetinueChamber({world:w,host,pending,send,onPerson,onFind,onInteract}:{world:World;host:string;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onFind:()=>void;onInteract:(id:string)=>void}){
 const members=retinueMembers(w,host),own=host===w.characterId;
 return <div className="retinue-chamber"><aside className="retinue-chamber-master"><div className="retinue-master-portrait"><CharacterPortrait characterId={host} world={w}/></div><div className="retinue-master-seal" aria-hidden="true"><ArtIcon name="influence" size={21}/>幕府</div><small className="retinue-master-rank">{own?'你的幕府':'人物幕府'}</small><h3>{politicalName(host)}</h3><p>属员协理文书、财计与军务；授予幕职后可按职责差遣。</p><div className="retinue-master-metrics"><span><b>{members.length}<small> / 6</small></b>属员</span><span><b>{members.filter(m=>!!m.post).length}</b>授职</span><span><b>{members.reduce((sum,m)=>sum+(m.post?4:2),0)}</b>钱／月俸</span></div></aside><div className="retinue-chamber-work"><div className="retinue-work-heading"><h3>署中席位</h3><small>{own?'点击席位任命，已任职者可在席位内差遣':'查阅幕职与属员'}</small></div><RetinuePanel world={w} host={host} pending={pending} send={send} onPerson={onPerson} onFind={onFind} onInteract={onInteract}/></div></div>;
}

export function StaffChamber({world:w,pending,send,onPerson,onTerritory,onService,tab,onTab,region,onRegion,person,financeView,treasuryTab}:Props){
 const [office,setOffice]=useState<MinistryId|null>(null),[candidate,setCandidate]=useState(''),[dismissConfirm,setDismissConfirm]=useState(false);
 const id=w.characterId!,realm=playerRealm(w),sovereign=isSovereign(w,id),clan=clanStanding(w,id),recommendation=recommendationBonus(w,id),mandateReason=realmReason(w,{type:'realm',action:'mandate'});
 const nodes=officeHierarchy(w).filter(node=>node.realm===realm),court=courtOf(w),government=governmentOf(w),executive=governmentExecutive(w),central=nodes.filter(node=>node.id.includes(':ministry:'));
 const local=[...new Map(nodes.filter(node=>!!node.territory&&node.kind!=='city').map(node=>[node.territory!,node])).values()],provinces=local.filter(node=>territoryNodes[node.territory!]?.level==='province'),selectedRegion=provinces.some(node=>node.territory===region)?region:provinces[0]?.territory??'';
 const localHere=selectedRegion?local.filter(node=>belongsToProvince(node.territory!,selectedRegion)):local;
 const appointed=central.filter(node=>!!node.holder).length,localAppointed=local.filter(node=>!!node.holder).length;
 const command=office?(executive?{type:'court',action:'appoint',ministry:office,candidate} as const:{type:'court',action:'seek-office',ministry:office} as const):null;
 const dismiss=office?{type:'court',action:'appoint',ministry:office,candidate:null} as const:null;
 const openOffice=(ministry:MinistryId,holder:string|null)=>{setOffice(ministry);setCandidate(executive?holder??id:id);setDismissConfirm(false);};
 return <div className="staff-chamber">
  <div className="staff-chamber-owner"><RealmBadge realm={realm} world={w}/><span><strong>{regimeName(w,realm)}</strong><small>{sovereign?'在位君主':'本国臣属'} · {politicalName(id)}</small></span><div className="staff-chamber-summary"><span><ArtIcon name="person" size={25}/><strong>{appointed} / {ministryIds.length}</strong><small>中枢任官</small></span><span><ArtIcon name="city" size={25}/><strong>{localAppointed} / {local.length}</strong><small>地方主官</small></span><span><ArtIcon name="coins" size={25}/><strong>{w.realm!.treasuries[realm].coins}</strong><small>中央公款</small></span><span><ArtIcon name="grain" size={25}/><strong>{w.realm!.treasuries[realm].grain}</strong><small>中央公粮</small></span></div></div>
  <DetailTabs label="朝廷事务" value={tab==='person'?'central':tab} onChange={onTab} items={[{id:'central',label:'中枢',icon:'influence'},{id:'local',label:'地方',icon:'city'},{id:'finance',label:'财赋',icon:'coins'},{id:'government',label:'制度',icon:'estate'}]}/>
  {tab==='central'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>中枢官署</h3><small>{sovereign?'君主亲临':'本国科层'} · 中央月俸 {courtSalary(w,realm)} 钱</small></div>{!courtEnabled(w,realm)&&<p className="government-warning">当前政体暂停中央履职与俸给；任命须待政体恢复。</p>}{!executive&&<p className="government-warning">当前未掌实际执政权，中央任免须由执政者决定。</p>}{!sovereign&&<><div className="realm-office-actions">{((clan?.petition??0)>0||recommendation>0)&&<HoverHint label="求官影响因素" content={`世族门第：求官接受度 +${clan?.petition??0}，城邑请任功绩要求 −${clan?.merit??0}；典签荐书：求官接受度 +${recommendation}。年龄、治理权与军务门槛仍须满足。`}><span className="clan-standing-badge" tabIndex={0}>求官荫望 ⓘ</span></HoverHint>}{!w.realm?.mandate&&<HoverHint label="请求军务授权" content={mandateReason||'消耗个人影响力 40，向上级请求军务授权。'}><button disabled={pending||!!mandateReason} onClick={()=>send({type:'realm',action:'mandate'})}>请求军务授权 · 40 影响力</button></HoverHint>}</div></>}<div className="staff-central-grid">{ministryIds.map(ministry=>{const node=central.find(item=>item.id.endsWith(':'+ministry)),holder=node?.holder??null,competent=holder&&ministryCompetent(w,realm,ministry),merit=holder?(government?.merit[holder]??0):null;return <div className="staff-central-office" key={ministry}><PositionSeat compact world={w} holder={holder} title={ministries[ministry].name} status={holder?`功绩 ${merit} · ${!courtEnabled(w,realm)?'履职暂停':competent?'称职':'履职不足'}`:'待任命'} onPerson={onPerson} onManage={executive||!sovereign?()=>openOffice(ministry,holder):undefined}/><p>{ministries[ministry].duty} · {ministries[ministry].effect}</p>{holder&&(executive||!sovereign)&&<OfficialActions world={w} person={holder} pending={pending} send={send}/>}</div>;})}</div><section className="staff-succession-block"><div className="staff-chamber-heading"><h3>继统</h3><small>君位与执政交接</small></div><PublicSuccessionPanel world={w} pending={pending} send={send} onPerson={onPerson}/></section></section>}
  {tab==='local'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>地方任职</h3><small>按州查阅与授官；县级与城市共用治理席位</small></div>{provinces.length>0&&<nav className="staff-region-list" aria-label="选择州域">{provinces.map(node=><button key={node.id} aria-pressed={selectedRegion===node.territory} onClick={()=>onRegion(node.territory!)}>{territoryNodes[node.territory!].name}<small>{local.filter(item=>belongsToProvince(item.territory!,node.territory!)).filter(item=>!!item.holder).length} 任</small></button>)}</nav>}{(['province','prefecture','county'] as const).map(level=>{const group=localHere.filter(node=>territoryNodes[node.territory!]?.level===level);return group.length?<div className="staff-local-group" key={level}><h4>{level==='province'?'州刺史':level==='prefecture'?'郡太守':'县令／县长'} <small>{group.filter(node=>!!node.holder).length} / {group.length} 在任</small></h4><div className="staff-local-grid">{group.map(node=><div className="staff-local-office" key={node.id}><header><strong>{territoryNodes[node.territory!].name}</strong><button onClick={()=>onTerritory(node.territory!)}>查看辖区 ›</button></header><LocalOfficeSeat world={w} territory={node.territory!} realm={realm} pending={pending} send={send} onPerson={onPerson}/></div>)}</div></div>:null;})}<LocalRequests world={w} pending={pending} send={send} onPerson={onPerson}/></section>}
  {tab==='person'&&<section className="staff-chamber-body staff-person-record"><div className="staff-chamber-heading"><h3>{politicalName(person)} · 官爵与任职</h3><button onClick={()=>onTab('central')}>← 返回中枢</button></div><button className="staff-person-link" onClick={()=>onPerson(person)}>查看人物详情 ›</button>{person===id&&<ResignationPanel world={w} pending={pending} send={send}/>}<OfficeHierarchy world={w} person={person} onPerson={onPerson}/><LocalCareer world={w} person={person} send={send} pending={pending} onPerson={onPerson}/><ServiceProfile world={w} person={person} onOpen={onService}/></section>}
  {tab==='finance'&&<section className="staff-chamber-body staff-finance-body">{financeView==='audit'&&<GovernmentAuditPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}<CourtTreasuryPanel key={treasuryTab} world={w} pending={pending} send={send} onPerson={onPerson} initialTab={treasuryTab}/>{financeView!=='audit'&&<GovernmentAuditPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}</section>}
  {tab==='government'&&<section className="staff-chamber-body"><GovernmentPanel world={w} pending={pending} send={send}/></section>}
  {office&&command&&<PersonSelectionDialog world={w} title={(executive?'任命 · ':'请任 · ')+ministries[office].name} value={executive?candidate:id} onSelect={setCandidate} onClose={()=>setOffice(null)} pending={pending} description={<>{ministries[office].duty} · {ministries[office].effect}。功绩达到 40 时称职。{executive?'任免消耗个人影响力 15，撤换原任者即时生效。':'仅可请任空缺职位，消耗个人影响力 25；本人功绩至少 40，且功绩达到 60 或执政者接受度达到 60（含门第与荐举）。'}</>} options={officeCandidates(w,realm).filter(person=>isAlive(w,person.id)&&(executive||person.id===id)).map(person=>({id:person.id,score:government?.merit[person.id]??0,metric:'功绩',reason:courtReason(w,command.action==='appoint'?{...command,candidate:person.id}:command)}))} confirmLabel={executive?'确认任命 · 15 影响力':'确认请任 · 25 影响力'} onConfirm={()=>{if(pending||courtReason(w,command))return;send(command);setOffice(null);}}>{court?.ministries[office]&&dismiss&&executive&&<><button disabled={pending||!!courtReason(w,dismiss)} onClick={()=>setDismissConfirm(true)}>免职 · 15 影响力</button>{dismissConfirm&&<ConfirmAction title="免职" detail="撤销此人的中央官职与履职增益。" confirmLabel="确认免职" danger pending={pending||!!courtReason(w,dismiss)} onCancel={()=>setDismissConfirm(false)} onConfirm={()=>{if(pending||courtReason(w,dismiss))return;send(dismiss);setOffice(null);setDismissConfirm(false);}}/>}</>}</PersonSelectionDialog>}
 </div>;
}

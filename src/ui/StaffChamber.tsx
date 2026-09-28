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
import {GovernancePolicyPanel} from './GovernancePolicyPanel';
import {NationalJournal} from './NationalJournal';
import {SituationPanel} from './SituationPanel';
import {OfficeHierarchy} from './OfficeHierarchy';
import {LocalCareer} from './LocalAdministration';
import {ServiceProfile} from './ServicePanel';
import {ResignationPanel} from './ResignationPanel';
import {HoverHint} from './HoverHint';
import {CharacterPortrait} from './CharacterPortrait';
import {RealmBadge} from './RealmBadge';
import {isSovereign} from '../core/officialDuties';
import {officeCandidates} from '../core/officeEligibility';
import {courtEnabled,courtOf,courtReason,courtSalary,ministryCompetent,ministryPerformance,courtMonthPreview,centralAppointmentCost} from '../core/court';
import {governingExecutives,governmentOf,politicalName} from '../core/government';
import {presentAt} from '../core/residence';
import {personalRoute} from '../core/diplomacy';
import {departureReason} from '../core/mobility';
import {realmReason} from '../core/realm';
import {siteById} from '../data/scenario';
import {isAlive} from '../core/lifeState';
import {officeHierarchy} from '../core/offices';
import {playerRealm,capital,realmForecast,type RealmId} from '../core/realm';
import {retinueMembers} from '../core/retinue';
import {ministryIds,ministries,phases,type MinistryId} from '../data/court';
import {territoryNodes} from '../data/territorialHierarchy';
import {appointmentEvaluation} from '../core/appointmentRules';
import type {GameCommand,World} from '../core/types';
import './staffChamber.css';

export type CourtTab='central'|'local'|'person'|'finance'|'government'|'situation'|'history';
type Props={realm?:RealmId;world:World;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onTerritory:(id:string)=>void;onService:(task?:number,site?:string)=>void;tab:CourtTab;onTab:(tab:CourtTab)=>void;region:string;onRegion:(region:string)=>void;person:string;financeView:'treasury'|'audit';treasuryTab:'budget'|'requests'|'ledger'};

function belongsToProvince(territory:string,province:string){
 let node:(typeof territoryNodes)[string]|undefined=territoryNodes[territory];
 while(node){if(node.id===province)return true;node=node.parent?territoryNodes[node.parent]:undefined;}
 return false;
}

export function RetinueChamber({world:w,host,pending,send,onPerson,onFind,onInteract}:{world:World;host:string;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onFind:()=>void;onInteract:(id:string)=>void}){
 const members=retinueMembers(w,host),own=host===w.characterId;
 return <div className="retinue-chamber"><aside className="retinue-chamber-master"><div className="retinue-master-portrait"><CharacterPortrait characterId={host} world={w}/></div><div className="retinue-master-seal" aria-hidden="true"><ArtIcon name="influence" size={21}/>幕府</div><small className="retinue-master-rank">{own?'你的幕府':'人物幕府'}</small><h3>{politicalName(host)}</h3><p>属员协理文书、财计与军务；授予幕职后可按职责差遣。</p><div className="retinue-master-metrics"><span><b>{members.length}<small> / 6</small></b>属员</span><span><b>{members.filter(m=>!!m.post).length}</b>授职</span><span><b>{members.reduce((sum,m)=>sum+(m.post?4:2),0)}</b>钱／月俸</span></div></aside><div className="retinue-chamber-work"><div className="retinue-work-heading"><h3>署中席位</h3><small>{own?'点击席位任命，已任职者可在席位内差遣':'查阅幕职与属员'}</small></div><RetinuePanel world={w} host={host} pending={pending} send={send} onPerson={onPerson} onFind={onFind} onInteract={onInteract}/></div></div>;
}

export function StaffChamber({world:w,realm:targetRealm,pending,send,onPerson,onTerritory,onService,tab,onTab,region,onRegion,person,financeView,treasuryTab}:Props){
 const [office,setOffice]=useState<MinistryId|null>(null),[candidate,setCandidate]=useState(''),[dismissConfirm,setDismissConfirm]=useState(false);
 const id=w.characterId!,realm=targetRealm??playerRealm(w),own=realm===playerRealm(w),sovereign=own&&isSovereign(w,id),executives=governingExecutives(w,realm),executive=own&&executives.includes(id);
 const nodes=officeHierarchy(w).filter(node=>node.realm===realm),court=courtOf(w,realm),government=governmentOf(w,realm),central=nodes.filter(node=>node.id.includes(':ministry:'));
 const local=[...new Map(nodes.filter(node=>!!node.territory&&node.kind!=='city').map(node=>[node.territory!,node])).values()],provinces=local.filter(node=>territoryNodes[node.territory!]?.level==='province'),selectedRegion=provinces.some(node=>node.territory===region)?region:provinces[0]?.territory??'';
 const localHere=selectedRegion?local.filter(node=>belongsToProvince(node.territory!,selectedRegion)):local;
 const projection=court?courtMonthPreview(w,realm):null,primary=tab==='local'||tab==='person'?'central':tab;
 const command=office?(executive?{type:'court',action:'appoint',ministry:office,candidate} as const:{type:'court',action:'seek-office',ministry:office} as const):null;
 const dismiss=office?{type:'court',action:'appoint',ministry:office,candidate:null} as const:null;
 const cost=office?executive?centralAppointmentCost(w,realm,office,candidate):25:0;
 const openOffice=(ministry:MinistryId,holder:string|null)=>{setOffice(ministry);setCandidate(executive?holder??id:id);setDismissConfirm(false);};
 const mandateReason=own?realmReason(w,{type:'realm',action:'mandate'}):'';
 const centralTravel=departureReason(w)||(!personalRoute(w,capital(realm))?'暂无可通行道路':'');
 const forecast=realmForecast(w,realm),role=own?sovereign?'在位君主':executive?'实际执政':nodes.filter(n=>n.holder===id&&n.active).map(n=>n.name).join(' / ')||'本国臣属':'他国朝廷 · 只供查阅';
 return <div className="staff-chamber national-chamber">
  <div className="staff-chamber-owner"><RealmBadge realm={realm} world={w}/><span><strong>{role}</strong><small>君主 <button onClick={()=>onPerson(government!.ruler)}>{politicalName(government!.ruler)} ›</button> · 执政 {executives.map(e=><button key={e} onClick={()=>onPerson(e)}>{politicalName(e)} ›</button>)}</small></span><div className="staff-chamber-summary"><span><ArtIcon name="person" size={25}/><strong>{central.filter(n=>!!n.holder).length} / {ministryIds.length}</strong><small>中枢任官</small></span><span><ArtIcon name="city" size={25}/><strong>{local.filter(n=>!!n.holder).length} / {local.length}</strong><small>地方主官</small></span></div></div>
  {court&&projection&&<div className={'national-situation-summary national-situation-summary--'+court.phase}><strong>{phases[court.phase].name}</strong><span>紧张 {court.tension} {projection.enabled?(projection.delta>0?'↑':projection.delta<0?'↓':'→'):''}</span><HoverHint label="月结条件预估" content="按当前地方财赋、任职与战争条件，依次结算官署、集团支持和局势；月结前的新事件、地方产出与支出可能改变结果。"><span tabIndex={0}>{projection.enabled?'条件预估：'+phases[projection.phase].name:'局势结算暂停'}</span></HoverHint><small>{phases[court.phase].effect}；治理规则持续有效</small><button onClick={()=>onTab('situation')}>查看原因 ›</button></div>}
  <DetailTabs label="国家治理" value={primary} onChange={onTab} items={[{id:'situation',label:'朝局',icon:'renown'},{id:'central',label:'官署',icon:'person'},{id:'government',label:'国策',icon:'estate'},{id:'finance',label:'财赋',icon:'coins'},{id:'history',label:'纪事',icon:'diligent'}]}/>
  {tab==='situation'&&<SituationPanel key={realm} world={w} realm={realm} pending={pending} send={send} onPerson={onPerson} onTerritory={onTerritory} onService={onService} embedded/>}
  {(['central','local','person'] as CourtTab[]).includes(tab)&&<DetailTabs label="官署层级" value={tab==='local'?'local':'central'} onChange={onTab} items={[{id:'central',label:'中枢',icon:'influence'},{id:'local',label:'地方',icon:'city'}]}/>}
  {tab==='central'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>中枢官署</h3><small>{own?'本国官署':'查阅官署'} · 中央月俸 {courtSalary(w,realm)} 钱</small></div>{!courtEnabled(w,realm)&&<p className="government-warning">当前政体暂停中央履职与俸给；任命须待政体恢复。</p>}{own&&!executive&&<p className="government-warning">当前未掌实际执政权，可请任空缺职位；任免由执政者决定。</p>}{own&&!sovereign&&!w.realm?.mandate&&<HoverHint label="请求军务授权" content={mandateReason||'消耗个人影响力 40，向上级请求军务授权。'}><button disabled={pending||!!mandateReason} onClick={()=>send({type:'realm',action:'mandate'})}>请求军务授权 · 40 影响力</button></HoverHint>}<div className="staff-central-grid">{ministryIds.map(ministry=>{const holder=court?.ministries[ministry]??null;return <div className="staff-central-office" key={ministry}><PositionSeat compact world={w} holder={holder} title={ministries[ministry].name} status={holder?`功绩 ${government?.merit[holder]??0} · ${!courtEnabled(w,realm)?'履职暂停':ministryCompetent(w,realm,ministry)?'称职':'履职受阻'}`:'待任命'} onPerson={onPerson} onManage={own&&(executive||!sovereign)?()=>openOffice(ministry,holder):undefined}/><p>{ministries[ministry].duty} · {ministries[ministry].effect}</p>{holder&&<HoverHint label={ministries[ministry].name+'履职依据'} content={ministryPerformance(w,realm,ministry).reason}><small tabIndex={0}>履职依据 ⓘ</small></HoverHint>}{holder===id&&own&&!presentAt(w,id,capital(realm))&&<HoverHint label="中央赴任" content={centralTravel||'前往都城履职；抵达后才产生职掌增益。'}><button disabled={pending||!!w.people[0].journey||!!centralTravel} onClick={()=>send({type:'travel',destination:capital(realm)})}>赴任 · {siteById[capital(realm)].name}</button></HoverHint>}{holder&&own&&<OfficialActions world={w} person={holder} pending={pending} send={send}/>}</div>;})}</div><section className="staff-succession-block"><div className="staff-chamber-heading"><h3>继统</h3><small>君位与执政交接</small></div>{own?<PublicSuccessionPanel world={w} pending={pending} send={send} onPerson={onPerson}/>:<div className="staff-central-grid"><PositionSeat compact world={w} holder={government?.heirs?.ruler??null} title="君位继承人" onPerson={onPerson}/><PositionSeat compact world={w} holder={government?.heirs?.executive??null} title="执政继任人" onPerson={onPerson}/></div>}</section></section>}
  {tab==='local'&&<section className="staff-chamber-body"><div className="staff-chamber-heading"><h3>地方任职</h3><small>按州查阅与授官；县级与城市共用治理席位</small></div>{provinces.length>0&&<nav className="staff-region-list" aria-label="选择州域">{provinces.map(node=><button key={node.id} aria-pressed={selectedRegion===node.territory} onClick={()=>onRegion(node.territory!)}>{territoryNodes[node.territory!].name}<small>{local.filter(item=>belongsToProvince(item.territory!,node.territory!)).filter(item=>!!item.holder).length} 任</small></button>)}</nav>}{(['province','prefecture','county'] as const).map(level=>{const group=localHere.filter(node=>territoryNodes[node.territory!]?.level===level);return group.length?<div className="staff-local-group" key={level}><h4>{level==='province'?'州刺史':level==='prefecture'?'郡太守':'县令／县长'} <small>{group.filter(node=>!!node.holder).length} / {group.length} 在任</small></h4><div className="staff-local-grid">{group.map(node=><div className="staff-local-office" key={node.id}><header><strong>{territoryNodes[node.territory!].name}</strong><button onClick={()=>onTerritory(node.territory!)}>查看辖区 ›</button></header><LocalOfficeSeat world={w} territory={node.territory!} realm={realm} pending={pending} send={send} onPerson={onPerson}/></div>)}</div></div>:null;})}{own&&<LocalRequests world={w} pending={pending} send={send} onPerson={onPerson}/>}</section>}
  {tab==='person'&&own&&<section className="staff-chamber-body staff-person-record"><div className="staff-chamber-heading"><h3>{politicalName(person)} · 官爵与任职</h3><button onClick={()=>onTab('central')}>← 返回中枢</button></div><button className="staff-person-link" onClick={()=>onPerson(person)}>查看人物详情 ›</button>{person===id&&<ResignationPanel world={w} pending={pending} send={send}/>}<OfficeHierarchy world={w} person={person} onPerson={onPerson}/><LocalCareer world={w} person={person} send={send} pending={pending} onPerson={onPerson}/><ServiceProfile world={w} person={person} onOpen={()=>onService()}/></section>}
  {tab==='finance'&&<section className="staff-chamber-body staff-finance-body">{own?<>{financeView==='audit'&&<GovernmentAuditPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}<CourtTreasuryPanel key={treasuryTab} world={w} pending={pending} send={send} onPerson={onPerson} initialTab={treasuryTab}/>{financeView!=='audit'&&<GovernmentAuditPanel world={w} pending={pending} send={send} onPerson={onPerson}/>}</>:<><h3>中央财赋</h3><div className="service-metrics"><span>公款 {w.realm!.treasuries[realm].coins} 钱</span><span>公粮 {w.realm!.treasuries[realm].grain}</span><span>本期预计收入 {forecast.income} 钱</span><span>预计支出 {forecast.expense} 钱</span></div><p>他国公库仅供查阅。</p></>}</section>}
  {tab==='government'&&<section className="staff-chamber-body"><GovernancePolicyPanel world={w} realm={realm} pending={pending} send={send} onPerson={onPerson} onTerritory={onTerritory} onService={()=>onService()}/></section>}
  {tab==='history'&&<section className="staff-chamber-body"><NationalJournal world={w} realm={realm} onPerson={onPerson} onService={task=>{if(own)onService(task);}}/></section>}
  {office&&command&&own&&<PersonSelectionDialog world={w} title={(executive?'任命 · ':'请任 · ')+ministries[office].name} value={executive?candidate:id} onSelect={setCandidate} onClose={()=>setOffice(null)} pending={pending} description={<>{ministries[office].duty} · {ministries[office].effect}。任用评价按现行准则与任职通道；实际履职须到任，对口能力加履历经验达到 10。空缺常额补任不耗影响力；撤换或破格 15，破格另使支持 −3、紧张 +3。</>} options={officeCandidates(w,realm).filter(p=>isAlive(w,p.id)&&(executive||p.id===id)).map(p=>{const q=appointmentEvaluation(w,realm,p.id,{ministry:office,site:capital(realm)},executives[0]);return {id:p.id,score:q.score,metric:'任用评价',detail:q.factors.map(f=>f.label+' '+f.value).join(' / ')+(q.trial?' · 任事试用':q.sponsored?' · 担保取用':q.ordinary?' · 常额任用':' · 需破格'),reason:courtReason(w,command.action==='appoint'?{...command,candidate:p.id}:command)};})} confirmLabel={(executive?'确认任命':'确认请任')+' · '+cost+' 影响力'} onConfirm={()=>{if(pending||courtReason(w,command))return;send(command);setOffice(null);}}>{court?.ministries[office]&&dismiss&&executive&&<><button disabled={pending||!!courtReason(w,dismiss)} onClick={()=>setDismissConfirm(true)}>免职 · 15 影响力</button>{dismissConfirm&&<ConfirmAction title="免职" detail="撤销此人的中央官职与履职增益。" confirmLabel="确认免职" danger pending={pending||!!courtReason(w,dismiss)} onCancel={()=>setDismissConfirm(false)} onConfirm={()=>{if(pending||courtReason(w,dismiss))return;send(dismiss);setOffice(null);setDismissConfirm(false);}}/>}</>}</PersonSelectionDialog>}
 </div>;
}

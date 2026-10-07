import {NobilityPanel,RulerHistoryPanel} from './PoliticalIdentity';
import {terrainSceneStyle,personTerrainSite} from './terrainScene';
import {PowerPoliticsPanel} from './PowerPoliticsPanel';
import {CustodyPanel} from './CustodyPanel';
import {useState,useEffect,type ReactNode} from 'react';
import {ArtIcon,type ArtName} from './ArtIcon';
import {ConfirmAction} from './ConfirmAction';
import {ActionDialog} from './ActionDialog';
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
import './courtAudience.css';

export type CourtTab='central'|'factions'|'local'|'person'|'finance'|'government'|'situation'|'history';
type Props={realm?:RealmId;world:World;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onTerritory:(id:string)=>void;onService:(task?:number,site?:string)=>void;tab:CourtTab;onTab:(tab:CourtTab)=>void;region:string;onRegion:(region:string)=>void;person:string;financeView:'treasury'|'audit';treasuryTab:'budget'|'requests'|'ledger'};

function belongsToProvince(territory:string,province:string){
 let node:(typeof territoryNodes)[string]|undefined=territoryNodes[territory];
 while(node){if(node.id===province)return true;node=node.parent?territoryNodes[node.parent]:undefined;}
 return false;
}

export function RetinueChamber({world:w,host,pending,send,onPerson,onFind,onInteract}:{world:World;host:string;pending:boolean;send:(command:GameCommand)=>void;onPerson:(id:string)=>void;onFind:()=>void;onInteract:(id:string)=>void}){
 const members=retinueMembers(w,host),own=host===w.characterId;
 return <div className="retinue-chamber"><aside className="retinue-chamber-master detail-landscape" style={terrainSceneStyle(personTerrainSite(w,host))}><div className="retinue-master-portrait"><CharacterPortrait characterId={host} world={w}/></div><div className="retinue-master-seal" aria-hidden="true"><ArtIcon name="influence" size={21}/>幕府</div><small className="retinue-master-rank">{own?'你的幕府':'人物幕府'}</small><h3>{politicalName(host,w)}</h3><p>属员协理文书、财计与军务；授予幕职后可按职责差遣。</p><div className="retinue-master-metrics"><span><b>{members.length}<small> / 6</small></b>属员</span><span><b>{members.filter(m=>!!m.post).length}</b>授职</span><span><b>{members.reduce((sum,m)=>sum+(m.post?4:2),0)}</b>钱／月俸</span></div></aside><div className="retinue-chamber-work"><div className="retinue-work-heading"><h3>署中席位</h3><small>{own?'点击席位任命，已任职者可在席位内差遣':'查阅幕职与属员'}</small></div><RetinuePanel world={w} host={host} pending={pending} send={send} onPerson={onPerson} onFind={onFind} onInteract={onInteract}/></div></div>;
}

export function StaffChamber({world:w,realm:targetRealm,pending,send,onPerson,onTerritory,onService,tab,onTab,region,onRegion,person,financeView,treasuryTab}:Props){
 const [nobilityOpen,setNobilityOpen]=useState(false);
 const [office,setOffice]=useState<MinistryId|null>(null),[candidate,setCandidate]=useState(''),[dismissConfirm,setDismissConfirm]=useState(false),[requestsOpen,setRequestsOpen]=useState(false);
 const id=w.characterId!,realm=targetRealm??playerRealm(w),own=realm===playerRealm(w),government=governmentOf(w,realm)!,court=courtOf(w,realm)!;
 const executives=governingExecutives(w,realm),sovereign=own&&isSovereign(w,id),executive=own&&executives.includes(id);
 const nodes=officeHierarchy(w).filter(node=>node.realm===realm),local=[...new Map(nodes.filter(node=>!!node.territory&&node.kind!=='city').map(node=>[node.territory!,node])).values()];
 const provinces=local.filter(node=>territoryNodes[node.territory!]?.level==='province'),selectedRegion=provinces.some(node=>node.territory===region)?region:provinces[0]?.territory??'';
 const localHere=selectedRegion?local.filter(node=>belongsToProvince(node.territory!,selectedRegion)):local;
 const projection=courtMonthPreview(w,realm),forecast=realmForecast(w,realm),active=tab==='person'?'central':tab;
 const role=own?sovereign?'在位君主':executive?'执掌朝政':nodes.filter(n=>n.holder===id&&n.active).map(n=>n.name).join(' / ')||'本国臣属':'他国 · 查阅';
 const serviceTasks=w.service?.tasks.filter(t=>t.realm===realm&&t.phase!=='closed')??[],localRecords=own?w.realm!.local?.requests.filter(q=>q.realm===realm&&(q.actor===id||q.approver===id))??[]:[],localRequests=localRecords.filter(q=>q.status==='pending');
 const regents=executives.filter(person=>person!==government.ruler),occupied=ministryIds.filter(ministry=>court.ministries[ministry]).length;
 const ministryIcons:Record<MinistryId,ArtName>={secretariat:'influence',personnel:'person',finance:'coins',military:'army',censorate:'diligent'};
 const pages:{id:CourtTab;label:string;icon:ArtName;detail:string}[]=[
  {id:'central',label:'朝会',icon:'renown',detail:'君位、掌政、五项中枢职掌与继承安排'},
  {id:'factions',label:'发起派系',icon:'gregarious',detail:'发起派系、争取支持、公开呈请与查看当前议案'},
  {id:'local',label:'地方官署',icon:'city',detail:'按真实州郡县辖区查阅、授官与请任'},
  {id:'situation',label:'朝局',icon:'influence',detail:'局势、地方压力与政治集团'},
  {id:'government',label:'国策',icon:'estate',detail:'现行政体、任用准则、通道与赋役落实'},
  {id:'finance',label:'财赋',icon:'coins',detail:'中央公库、地方拨款与公款查核'},
  {id:'history',label:'纪事',icon:'diligent',detail:'任免、承统、政务与真实政治影响'},
 ];
 const command=office?(executive?{type:'court',action:'appoint',ministry:office,candidate} as const:{type:'court',action:'seek-office',ministry:office} as const):null;
 const dismiss=office?{type:'court',action:'appoint',ministry:office,candidate:null} as const:null;
 const cost=office?executive?centralAppointmentCost(w,realm,office,candidate):25:0;
 const centralTravel=departureReason(w)||(!personalRoute(w,capital(realm,w))?'暂无可通行道路':''),mandateReason=own?realmReason(w,{type:'realm',action:'mandate'}):'';
 useEffect(()=>{setOffice(null);setDismissConfirm(false);setRequestsOpen(false);},[realm,tab]);
 const openOffice=(ministry:MinistryId)=>{setOffice(ministry);setCandidate(executive?court.ministries[ministry]??id:id);setDismissConfirm(false);};
 const closeOffice=()=>{setOffice(null);setDismissConfirm(false);};
 const metric=(icon:ArtName,value:number|string,label:string,detail:ReactNode)=><HoverHint label={label} content={detail}><span className="court-metric" tabIndex={0} aria-label={label+'：'+value}><ArtIcon name={icon} size={25}/><b>{value}</b></span></HoverHint>;
 return <div className="court-audience">
  <div className="court-ribbon detail-landscape" style={terrainSceneStyle(capital(realm,w))}>
   <div className="court-identity"><RealmBadge realm={realm} world={w}/><span>{role}</span>{own&&<HoverHint label="我的官爵与任职" content="查看自己的科层、履历与辞官操作。"><button className="court-icon-button" aria-label="查看我的官爵与任职" onClick={()=>onTab('person')}><ArtIcon name="person" size={24}/></button></HoverHint>}</div>
   <div className="court-metrics">
    {metric('coins',w.realm!.treasuries[realm].coins,'中央公款',<>当前中央公库余额，单位钱。下月预计收入 {forecast.income}、支出 {forecast.expense}；拨款须经实际权限批准。</>)}
    {metric('grain',w.realm!.treasuries[realm].grain,'中央公粮','中央储粮存量，按实际赈济、军粮与运输结算。')}
    {metric('renown',government.legitimacy,'合法性','君位与政权合法性，0—100；影响承统、改革与朝局。')}
    {metric('gregarious',government.support,'朝野支持','当前支持，0—100；集团态度、议政和实际行动共同影响。')}
    {metric('stress',court.tension,'局势紧张',<>{phases[court.phase].name}。{projection.enabled?'下次月结条件预估 '+projection.tension+'（'+(projection.delta>=0?'+':'')+projection.delta+'）':'当前暂停局势结算'}。{phases[court.phase].effect}。</>)}
   </div>
  </div>
  <div className="court-workspace">
   <nav className="court-rail" aria-label="朝廷事务">
    {pages.map(page=><HoverHint key={page.id} label={page.label} content={page.detail}><button className="court-rail-button" aria-label={page.label} aria-pressed={active===page.id} onClick={()=>onTab(page.id)}><ArtIcon name={page.icon} size={32}/>{page.id==='central'&&<small aria-hidden="true">{occupied}/5</small>}{page.id==='local'&&localRequests.length>0&&<small aria-hidden="true">{localRequests.length}</small>}</button></HoverHint>)}
   </nav>
   <main className={'court-page court-page--'+active} aria-label={pages.find(page=>page.id===active)?.label??'朝会'}>
    {active==='factions'&&<PowerPoliticsPanel world={w} realm={realm} pending={pending} send={send} onPerson={onPerson}/>}
    {active==='central'&&<section className="court-hall" aria-label="中枢席位与继统">
     <div className="court-dais">
      <section className="court-regency" aria-label="实际掌政者">{regents.map(regent=><PositionSeat key={regent} world={w} holder={regent} title="执掌朝政" icon="influence" onPerson={onPerson}/>)}</section>
      <div className="court-throne"><PositionSeat world={w} holder={government.ruler} title={executives.includes(government.ruler)?'君主 · 亲理朝政':'在位君主'} icon="renown" onPerson={onPerson}/></div>
      <PublicSuccessionPanel world={w} realm={realm} compact pending={pending} send={send} onPerson={onPerson}/>
     </div>
     <div className="court-ministers" aria-label="中枢职掌">
      {ministryIds.map(ministry=>{const holder=court.ministries[ministry],performance=ministryPerformance(w,realm,ministry),working=courtEnabled(w,realm)&&ministryCompetent(w,realm,ministry),state=!holder?'空缺':!courtEnabled(w,realm)?'履职暂停':working?'称职':'履职受阻';return <article className="court-minister" key={ministry}>
       <PositionSeat world={w} holder={holder} title={ministries[ministry].name} icon={ministryIcons[ministry]} onPerson={onPerson} onManage={own&&(executive||!sovereign)?()=>openOffice(ministry):undefined}/>
       <HoverHint label={ministries[ministry].name+' · '+state} content={<>{ministries[ministry].duty}；{ministries[ministry].effect}。{holder&&<p>{performance.reason}；功绩 {government.merit[holder]??0}。</p>}{!holder&&<p>{own?'点击空席或官名，按当前权限任命或请任。':'他国空席只供查阅。'}</p>}</>}><span className="court-office-state" data-working={working} tabIndex={0}>{state}</span></HoverHint>
       <div className="court-office-tools">
        {holder&&own&&<OfficialActions world={w} person={holder} iconOnly pending={pending} send={send}/>}
        {holder===id&&own&&!presentAt(w,id,capital(realm,w))&&<HoverHint label="赴都履职" content={centralTravel||'前往都城，抵达后才产生职掌增益。'}><button className="court-icon-button" aria-label={'赴任 '+siteById[capital(realm,w)].name} disabled={pending||!!w.people[0].journey||!!centralTravel} onClick={()=>send({type:'travel',destination:capital(realm,w)})}><ArtIcon name="world" size={23}/></button></HoverHint>}
       </div>
      </article>;})}
     </div>
     {!courtEnabled(w,realm)&&<p className="court-hall-notice">当前政体暂停中央履职与俸给</p>}
    </section>}
    {active==='local'&&own&&(Object.values(w.custody?.records??{}).some(p=>p.cause==='arrest'&&p.captor===realm)||w.custody?.warrants.some(q=>q.realm===realm&&q.status==='pending'))&&<CustodyPanel world={w} domestic pending={pending} send={send} onPerson={onPerson}/>}
    {active==='local'&&<section className="court-local-desk">
     <header className="court-desk-heading"><h3>地方官署</h3><label className="court-jurisdiction"><ArtIcon name="city" size={23}/><select aria-label="选择州域" value={selectedRegion} onChange={event=>onRegion(event.target.value)}>{provinces.map(node=><option key={node.id} value={node.territory!}>{territoryNodes[node.territory!].name}</option>)}{!provinces.length&&<option value="">全部已录辖区</option>}</select></label>{own&&<HoverHint label="任职文书" content={localRequests.length?'查看自己的地方任职申请、举荐与待审文书':'查看自己的任职文书与既有批复'}><button className="court-icon-button" aria-label="查看地方任职文书" onClick={()=>setRequestsOpen(true)}><ArtIcon name="diligent" size={25}/>{localRequests.length>0&&<b>{localRequests.length}</b>}</button></HoverHint>}</header>
     <div className="court-local-columns">{(['province','prefecture','county'] as const).map(level=>{const group=localHere.filter(node=>territoryNodes[node.territory!]?.level===level);return <section className={'court-local-column court-local-column--'+level} key={level}>
      <h4>{level==='province'?'州刺史':level==='prefecture'?'郡太守':'县令／县长'}<small>{group.filter(node=>!!node.holder).length}/{group.length}</small></h4>
      <div className="court-local-roster">{group.map(node=><article className="court-local-seat" key={node.id}><header><strong>{territoryNodes[node.territory!].name}</strong><HoverHint label="查看辖区" content={territoryNodes[node.territory!].name}><button className="court-icon-button" aria-label={'查看'+territoryNodes[node.territory!].name} onClick={()=>onTerritory(node.territory!)}><ArtIcon name="world" size={21}/></button></HoverHint></header><LocalOfficeSeat world={w} territory={node.territory!} realm={realm} pending={pending} send={send} onPerson={onPerson}/></article>)}{!group.length&&<p className="court-empty">此范围没有已录席位</p>}</div>
     </section>;})}</div>
    </section>}
    {active==='situation'&&<SituationPanel world={w} realm={realm} pending={pending} send={send} onPerson={onPerson} onTerritory={onTerritory} onService={onService} embedded/>}
    {active==='government'&&<GovernancePolicyPanel world={w} realm={realm} pending={pending} send={send} onPerson={onPerson} onTerritory={onTerritory} onService={onService}/>}
    {active==='finance'&&<div className="court-finance-desk">{own?<>
     <section className="court-scroll-pane"><CourtTreasuryPanel world={w} compact pending={pending} send={send} onPerson={onPerson} initialTab={treasuryTab}/></section>
     <section className="court-scroll-pane" data-emphasis={financeView==='audit'}><GovernmentAuditPanel world={w} compact pending={pending} send={send} onPerson={onPerson}/></section>
    </>:<section className="court-foreign-finance"><h3>中央财赋</h3><dl><div><dt>公款存量</dt><dd>{w.realm!.treasuries[realm].coins} 钱</dd></div><div><dt>公粮存量</dt><dd>{w.realm!.treasuries[realm].grain}</dd></div><div><dt>下月预计收入</dt><dd>{forecast.income} 钱</dd></div><div><dt>下月预计支出</dt><dd>{forecast.expense} 钱</dd></div></dl><p>他国公库仅供查阅</p></section>}</div>}
    {active==='history'&&<RulerHistoryPanel pending={pending} send={send} world={w} realm={realm} onPerson={onPerson}/>}
    {active==='history'&&<NationalJournal world={w} realm={realm} onPerson={onPerson} onService={task=>{if(own)onService(task);}}/>}
   </main>
  </div>
  {nobilityOpen&&<ActionDialog title="爵位与殊礼" onClose={()=>setNobilityOpen(false)} cancelLabel="返回朝廷" actions={null}><NobilityPanel world={w} realm={realm} pending={pending} send={send} onPerson={onPerson}/></ActionDialog>}
  <footer className="court-footer"><HoverHint label="爵位与殊礼" content="查阅封侯、晋公、封王与殊礼；爵位不替代官职与土地。"><button className="court-icon-button" aria-label="爵位与殊礼" onClick={()=>setNobilityOpen(true)}><ArtIcon name="renown" size={25}/></button></HoverHint>
   <HoverHint label="朝局与下次月结" content={<>{phases[court.phase].effect}。{projection.enabled?'当前条件预估 '+phases[projection.phase].name:'当前政体暂停结算'}；治理规则持续有效。</>}><button className={'court-phase court-phase--'+court.phase} onClick={()=>onTab('situation')} aria-label="查看朝局与月结原因"><span aria-hidden="true"/>{phases[court.phase].name}<b>{projection.enabled?(projection.delta>0?'↑':projection.delta<0?'↓':'→'):''}</b></button></HoverHint>
   <HoverHint label="中央薪俸" content="已填中枢职掌的每月薪俸，支付与收款仍按实际任职结算。"><span className="court-salary" tabIndex={0}><ArtIcon name="coins" size={21}/>{courtSalary(w,realm)} / 月</span></HoverHint>
   <div className="court-footer-actions">{own&&<>
    {!sovereign&&!w.realm?.mandate&&<HoverHint label="请求军务授权" content={mandateReason||'向上级请求军务授权，消耗个人影响力 40。'}><button className="court-icon-button" aria-label="请求军务授权" disabled={pending||!!mandateReason} onClick={()=>send({type:'realm',action:'mandate'})}><ArtIcon name="army" size={25}/></button></HoverHint>}
    <HoverHint label="差事与奏事" content={serviceTasks.length+' 项本国在办差事；按自己的职权委派、请领与呈报。'}><button className="court-icon-button" aria-label="打开差事与奏事" onClick={()=>onService()}><ArtIcon name="diligent" size={25}/><b>{serviceTasks.length}</b></button></HoverHint>
   </>}</div>
  </footer>
  {requestsOpen&&own&&<ActionDialog title="地方任职文书" onClose={()=>setRequestsOpen(false)} cancelLabel="返回朝廷" actions={null}><LocalRequests world={w} pending={pending} send={send} onPerson={onPerson}/>{!localRecords.length&&<p>暂无自己的地方任职文书。</p>}</ActionDialog>}
  {tab==='person'&&own&&<ActionDialog title={politicalName(person,w)+' · 官爵与任职'} onClose={()=>onTab('central')} cancelLabel="返回朝会" actions={null}><div className="court-person-record"><NobilityPanel world={w} realm={realm} person={person} pending={pending} send={send} onPerson={onPerson}/>{person===id&&<ResignationPanel world={w} pending={pending} send={send}/>}<OfficeHierarchy world={w} person={person} onPerson={onPerson}/><LocalCareer world={w} person={person} send={send} pending={pending} onPerson={onPerson}/><ServiceProfile world={w} person={person} onOpen={()=>onService()}/></div></ActionDialog>}
  {office&&command&&own&&<PersonSelectionDialog world={w} context={{realm,site:capital(realm,w)}} title={(executive?'任命 · ':'请任 · ')+ministries[office].name} value={executive?candidate:id} onSelect={setCandidate} onClose={closeOffice} pending={pending}
   description={<>{ministries[office].duty}；{ministries[office].effect}。任用评价按现行准则与通道；实际履职须到任、对口能力加经验达到 10。空缺常额补任不耗影响力；撤换或破格 15，破格另使支持 −3、紧张 +3。</>}
   options={officeCandidates(w,realm).filter(p=>isAlive(w,p.id)&&(executive||p.id===id)).map(p=>{const q=appointmentEvaluation(w,realm,p.id,{ministry:office,site:capital(realm,w)},executives[0]);return {id:p.id,score:q.score,metric:'任用评价',detail:q.factors.map(f=>f.label+' '+f.value).join(' / ')+(q.trial?' · 任事试用':q.sponsored?' · 担保取用':q.ordinary?' · 常额任用':' · 需破格'),reason:courtReason(w,command.action==='appoint'?{...command,candidate:p.id}:command)};})}
   confirmLabel={(executive?'确认任命':'确认请任')+' · '+cost+' 影响力'} onConfirm={()=>{if(pending||courtReason(w,command))return;send(command);closeOffice();}}>
   {court.ministries[office]&&dismiss&&executive&&<><button disabled={pending||!!courtReason(w,dismiss)} onClick={()=>setDismissConfirm(true)}>免职 · 15 影响力</button>{dismissConfirm&&<ConfirmAction title="免职" detail="撤销此人的中央官职与履职增益。" confirmLabel="确认免职" danger pending={pending||!!courtReason(w,dismiss)} onCancel={()=>setDismissConfirm(false)} onConfirm={()=>{if(pending||courtReason(w,dismiss))return;send(dismiss);closeOffice();}}/>}</>}
  </PersonSelectionDialog>}
 </div>;
}

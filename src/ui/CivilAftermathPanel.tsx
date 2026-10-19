import {useEffect,useState} from 'react';
import type {World,GameCommand} from '../core/types';
import {civilAftermathReason,civilAftermathInfluenceCost,civilAppointmentOptions,civilOffices,visibleCivilSettlements,settlementResultName,type CivilAftermathCommand,type CivilSettlement} from '../core/civilAftermath';
import {civilCommitments,civilPromiseNames} from '../core/civilPromises';
import {allegianceRealm} from '../core/officeEligibility';
import {governingExecutives,politicalName} from '../core/government';
import {siteById} from '../data/scenario';
import {ministries,type MinistryId} from '../data/court';
import type {CivilPromise} from '../core/civilPromises';
import {dateLabel} from '../core/world';
import {CharacterPortrait} from './CharacterPortrait';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';
import './civilMobilization.css';
const promiseLabel=(q:{target:CivilPromise['target'];mode:CivilPromise['mode']})=>(q.mode==='retain'?'保留':'战后授予')+(q.target.kind==='county'?(siteById[q.target.id]?.name??'原县域')+'职权':q.target.kind==='army'?'第 '+q.target.id+' 军兵权':ministries[q.target.id as MinistryId]?.name??'原中央职掌');
type Props={world:World;pending:boolean;send:(c:GameCommand)=>Promise<boolean>;war?:number;onPerson?:(id:string)=>void};
function SettlementDialog({world:w,record,person,pending,send,onClose,onPerson}:Props&{record:CivilSettlement;person:string;onClose:()=>void}){
 const [action,setAction]=useState<CivilAftermathCommand['action']>('pardon'),[coins,setCoins]=useState('25'),[office,setOffice]=useState<string|null>(null),[error,setError]=useState('');
 const r=w.characterId&&allegianceRealm(w,w.characterId),p=record.members.find(p=>p.person===person)!;
 const positions=r?(action==='dismiss'?civilOffices(w,r,person):civilAppointmentOptions(w,r,person)):[],promises=civilCommitments(w).filter(q=>q.civil.war===record.war&&q.person===person&&(q.chief===w.characterId||person===w.characterId));
 const command:CivilAftermathCommand={type:'civilAftermath',war:record.war,person,action,...(action==='reward'?{coins:Number(coins)}:{}),...(office?{office}:{})},reason=civilAftermathReason(w,command);
 const names={pardon:'抚慰赦免',retain:'确认留任',reward:'论功赏钱',appoint:'授予空席',dismiss:'撤免现职',fulfil:'兑现承诺'};
 const execute=async()=>{if(pending||reason)return;if(await send(command))onClose();else setError('世界状态已变化，请重新核对当前条件。');};
 return <ActionDialog className="civil-member-dialog" art="staff" title={'战后善后 · '+politicalName(person,w)} onClose={onClose} actions={<><span role="status">{reason}</span><button className="primary" disabled={pending||!!reason} onClick={()=>void execute()}>确认{names[action]}{action==='reward'?' · '+coins+' 钱':''}</button></>}>
  <div className="civil-member-summary"><CharacterPortrait world={w} characterId={person} compact/><span><strong>{politicalName(person,w)}</strong><small>{settlementResultName(record)} · {dateLabel(record.ended,w.scriptId)}</small></span></div>
  <p>按战时阵营与实际贡献办理赏罚。赦免与留任生效后，本场战争不再追责。</p>
  <SingleChoiceCards label="善后事项" value={action} onChange={value=>{setAction(value as typeof action);setOffice(null);setError('');}} options={(Object.keys(names) as (keyof typeof names)[]).map(id=>({id,title:names[id],description:({pardon:'关系 +5；赦免后不得再借本场战争追责。',retain:'只确认当前合法任职，关系 +5；不恢复已失效的旧职。',reward:'本国中央公库支付至本人私财；每场同一人物只发赏一次。',appoint:'选择当前空缺中央职掌，按现有任命成本、资格和赴任办理。',dismiss:'仅按失败阵营和当前合法职权办理，复用撤免成本及政治后果。',fulfil:'办理本场仍有效的具体授官承诺；空席、费用和资格重新核对。'})[id]}))}/>
  {action==='reward'&&<SingleChoiceCards label="赏钱金额" value={coins} onChange={setCoins} options={['25','50','100'].map(id=>({id,title:id+' 钱',description:'本国中央公库 −'+id+' 钱，本人私财 +'+id+' 钱；每场只赏一次。'}))}/>}
  {(action==='appoint'||action==='dismiss')&&<SingleChoiceCards label={action==='appoint'?'选择空席':'选择实际现职'} value={office} onChange={setOffice} options={positions.map(o=>({id:o.id,title:o.label,description:action==='appoint'?'任命依当前真实权限、影响力、考课与赴任规则。':'只撤免本席位，不远程拘捕本人。'}))}/>}
  {(['appoint','dismiss','fulfil'] as string[]).includes(action)&&<p>本人影响力支出 {civilAftermathInfluenceCost(w,command)}。{action==='dismiss'?'原职交接与撤免后果按现职办理。':'任官须完成实际交接与赴任。'}</p>}
  <p>战时事实：参战 {p.facts.filter(f=>f.kind==='battle').length} 场 · 夺城 {p.facts.filter(f=>f.kind==='capture').length} 次 · 送达供粮 {p.facts.filter(f=>f.kind==='supply').reduce((n,f)=>n+f.amount-(f.returned??0),0)}。已领赏 {p.reward} 钱。</p>
  <ul className="civil-conduct-facts">{p.facts.map(f=><li key={f.source+':'+f.kind+':'+f.side}>{dateLabel(f.day,w.scriptId)} · {f.side==='attack'?'起兵方':'朝廷方'} · {({battle:'实际参战',capture:'实际夺城',supply:'专项供粮',switch:'改投阵营',wait:'选择等候'})[f.kind]}{f.kind==='supply'?(' '+(f.amount-(f.returned??0))+' 粮'+(f.returned?'，已退回 '+f.returned+' 粮':'')):''}</li>)}</ul>{p.facts.some(f=>f.kind==='wait')&&<p>选择等候不视为拒征，也不计作出征功劳。</p>}
  {promises.map((q,i)=><p key={i}>战时待遇：{promiseLabel(q.civil)} · {civilPromiseNames[q.civil.status]}{q.civil.due!==null?' · 办理期限 '+dateLabel(q.civil.due,w.scriptId):''}</p>)}
  {promises.length===0&&(record.promises??[]).filter(q=>q.person===person&&(q.chief===w.characterId||person===w.characterId)).map((q,i)=><p key={i}>待遇终局记录：{promiseLabel(q)} · {q.outcome?civilPromiseNames[q.outcome]:civilPromiseNames[q.atEnd]+'，后续结论未录'}。</p>)}
  {w.custody?.records[person]&&onPerson&&<button onClick={()=>{onClose();onPerson(person);}}>查看人物与实际拘押处置</button>}
  {error&&<p role="alert">{error}</p>}
 </ActionDialog>;
}
export function CivilAftermathPanel({world:w,pending,send,war,onPerson}:Props){
 const records=visibleCivilSettlements(w).filter(s=>war===undefined||s.war===war),[chosen,setChosen]=useState<number|null>(war??null),[person,setPerson]=useState<string|null>(null);
 const s=records.find(s=>s.war===chosen)??records.at(-1),r=w.characterId&&allegianceRealm(w,w.characterId),authority=!!r&&governingExecutives(w,r).includes(w.characterId!);
 useEffect(()=>setPerson(null),[s?.war,w.characterId]);
 if(!records.length)return null;
 return <section className="civil-mobilization civil-aftermath"><header><h3>战后善后</h3><span>战争已经结束，未办事项不暂停日期。</span></header>
  {records.length>1&&<div className="civil-settlement-choices" aria-label="选择已结束的内战">{records.map(v=><button key={v.war} aria-pressed={v.war===s?.war} onClick={()=>{setChosen(v.war);setPerson(null);}}>{politicalName(v.claimant,w)} · {settlementResultName(v)} · {dateLabel(v.ended,w.scriptId)}</button>)}</div>}
  {s&&<><p>{settlementResultName(s)} · {dateLabel(s.ended,w.scriptId)}。参战、夺城和供粮依据已保存的实际凭据；缺失旧记录不补造。{(s.result==='white'||s.result==='partition')&&'本场和约包含赦免，不再以本场战争追责。'}</p>
  <div className="civil-roster">{s.members.map(p=><article key={p.person}>{onPerson?<button className="civil-person" onClick={()=>onPerson(p.person)}><CharacterPortrait world={w} characterId={p.person} compact/><span><strong>{politicalName(p.person,w)}</strong><small>{p.side==='attack'?'起兵方':p.side==='defend'?'朝廷方':p.side==='outside'?'另属其他势力':'观望守土'} · 参战 {p.facts.filter(f=>f.kind==='battle').length} 场 · 夺城 {p.facts.filter(f=>f.kind==='capture').length} 次 · 供粮 {p.facts.filter(f=>f.kind==='supply').reduce((n,f)=>n+f.amount-(f.returned??0),0)}</small></span></button>:<strong>{politicalName(p.person,w)}</strong>}<small>{({pending:'尚待办理',pardon:'已赦免',retain:'确认留任',dismiss:'已撤免'})[p.justice]}{p.reward?' · 赏钱 '+p.reward:''}</small>{authority&&<button onClick={()=>setPerson(p.person)}>办理善后</button>}</article>)}</div>
  {person&&s.members.some(p=>p.person===person)&&<SettlementDialog key={s.war+':'+person} world={w} record={s} person={person} pending={pending} send={send} onPerson={onPerson} onClose={()=>setPerson(null)}/>}</>}
 </section>;
}

import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {CustodyCommand} from '../core/custodyState';
import {custodyTreatmentNames,detained} from '../core/custodyState';
import {custodyReason,custodyAuthority,recruitQuote,arrestEvidence} from '../core/custody';
import {allegianceRealm,officeName} from '../core/officeEligibility';
import {governingExecutives,regimeName,governmentOf,governingAuthority} from '../core/government';
import {playerRealm} from '../core/realm';
import {relationshipPeople} from '../data/relationships';
import {siteById} from '../data/scenario';
import {presentAt} from '../core/residence';
import {isAlive} from '../core/lifeState';
import {relationOpinion} from '../core/relationships';
import {CharacterPortrait} from './CharacterPortrait';
import {PersonSelectionDialog} from './PersonSelection';
import {ActionDialog} from './ActionDialog';
import {ArtIcon} from './ArtIcon';
import {RealmBadge} from './RealmBadge';
import './custody.css';
type Props={world:World;pending:boolean;send:(c:GameCommand)=>void;onPerson?:(id:string)=>void};
const names:Record<CustodyCommand['action'],string>={release:'释放',execute:'处决',ransom:'赎回',recruit:'招降',treatment:'待遇',exchange:'换俘',arrest:'拘捕',acquit:'释案',fine:'罚赎',guarantee:'担保','request-family':'请族筹赎','request-lord':'请朝筹赎',escape:'逃脱',accept:'接受招降'};
export function CustodyPerson({world:w,person,pending,send,onPerson}:Props&{person:string}){
 const p=w.custody?.records[person],actor=w.characterId!,self=person===actor,r=playerRealm(w),[opened,setOpened]=useState(false),[action,setAction]=useState<CustodyCommand['action']>(self?'ransom':'release'),[offer,setOffer]=useState<'stipend'|'office'>('stipend'),[treatment,setTreatment]=useState(p?.treatment??'guarded'),[mediator,setMediator]=useState(''),[other,setOther]=useState(''),[guarantor,setGuarantor]=useState(actor),[pick,setPick]=useState<'mediator'|'exchange'|'guarantor'|null>(null);
 const actions:CustodyCommand['action'][]=!p?['arrest']:self?['ransom','request-family','request-lord','accept','escape']:custodyAuthority(w,actor,p)?['recruit','release','execute','treatment',...(p.cause==='arrest'?['acquit','fine','guarantee'] as const:['exchange'] as const)]:['ransom'];
 const command:CustodyCommand=action==='recruit'?{type:'custody',person,action,offer,...(mediator?{mediator}:{})}:action==='treatment'?{type:'custody',person,action,treatment}:action==='exchange'?{type:'custody',person,action,other}:action==='guarantee'?{type:'custody',person,action,guarantor}:{type:'custody',person,action};
 const reason=custodyReason(w,command),q=p&&action==='recruit'?recruitQuote(w,p,actor,offer,mediator||undefined):null;
 const description=(a:CustodyCommand['action'])=>a==='recruit'?'中央礼金 80 钱；关系、旧主忠诚、礼遇与战争处境影响意愿':a==='release'?'无偿归还自由，改善交情；仍可为旧国效力':a==='execute'?'永久死亡，触发身后清理与继承；亲友仇恨、朝野支持损失':a==='treatment'?'严押 2／优待 6／软禁 3 钱每月，中央支付；宽待更利于游说与逃脱':a==='exchange'?'双方国家同意后互换两名人物，军队与领地不转移':a==='arrest'?'七日后依实际地点执行；边将可拒捕或举兵，无个案依据会损伤支持':a==='guarantee'?'担保人私财押金 100 钱，九十日守约返还，再犯没收':a==='fine'?'本人私财罚金 60 钱进入中央；仅有叛乱或拒命记录时可用':a==='acquit'?'释放本案人物，恢复行动与履职资格':a==='escape'?'三十日一次；严押／优待／软禁基础机会 15%／30%／50%，还须有返国道路；失败健康 −10':a==='accept'?'接受俘获方已提出的待遇；获得礼金 80 钱并交接原国职权':a==='request-family'?'向实际亲族筹赎，须亲族愿意且私财充足':a==='request-lord'?'请求旧国中央筹赎，须旧主及俘获方同意':`本人私财或旧国中央实付 ${p?.ransom??0} 钱至俘获方中央公库`;
 const pickerOptions=pick==='exchange'?Object.values(w.custody?.records??{}).filter(v=>p&&v.captor===p.origin&&v.origin===p.captor&&v.person!==person).map(v=>({id:v.person,detail:siteById[v.site].name+' · 被俘 '+(w.day-v.since)+' 日'})):relationshipPeople.filter(v=>isAlive(w,v.id)&&allegianceRealm(w,v.id)===(p?.captor??r)).map(v=>({id:v.id,score:relationOpinion(w,person,v.id),metric:'与对象交情',detail:pick==='guarantor'?'司法担保人':'到场游说者',reason:detained(w,v.id)?'正在被拘押':pick==='mediator'&&!presentAt(w,v.id,p!.site)?'须先到看管地点':undefined}));
 if(!p&&(self||!governingExecutives(w,r).includes(actor)||allegianceRealm(w,person)!==r||!isAlive(w,person)))return null;
 return <section className="custody-person">
  {p&&<div className="custody-status"><ArtIcon name="steadfast" size={24}/><strong>{p.cause==='arrest'?'收押待审':'身陷囹圄'}</strong><RealmBadge realm={p.captor} world={w}/><span>{siteById[p.site].name} · {w.day-p.since} 日 · {custodyTreatmentNames[p.treatment]}</span></div>}
  <button disabled={pending} className="custody-entry" onClick={()=>{setAction(actions[0]);setOffer('stipend');setTreatment(p?.treatment??'guarded');setMediator('');setOther('');setGuarantor(actor);setOpened(true);}}><ArtIcon name={p?'steadfast':'influence'} size={24}/>{p?self?'囚中交涉':custodyAuthority(w,actor,p)?'人物处置':'筹赎此人':'发出拘捕令'} ›</button>
  {opened&&<ActionDialog title={(p?self?'囚中交涉 · ':'人物处置 · ':'国内拘捕 · ')+officeName(person)} onClose={()=>{setOpened(false);setPick(null);}} className="custody-dialog" actions={<button className={action==='execute'?'danger':'primary'} disabled={pending||!!reason} title={reason||description(action)} onClick={()=>{send(command);setOpened(false);setPick(null);}}>{names[action]==='处决'?'确认处决，无法撤销':'确认'+names[action]}</button>}>
   <div className="custody-subject"><button aria-label={'查看'+officeName(person)} disabled={!onPerson} onClick={()=>{setOpened(false);onPerson?.(person);}}><CharacterPortrait characterId={person} world={w}/></button><div><strong>{officeName(person)}</strong><p>{p?`原属 ${regimeName(w,p.origin)} · ${p.cause==='battle'?'野战被俘':p.cause==='city'?'城陷被俘':'国内案件'}`:arrestEvidence(w,person)||'无已记录的个案依据'}</p><p>执行者：{officeName(actor)}{p?' · '+(custodyAuthority(w,actor,p)||'筹赎请求人'):''}</p>{p&&<p>看管：{regimeName(w,p.captor)} · {siteById[p.site].name}；供养由中央支付</p>}</div></div>
   <fieldset className="custody-choices"><legend>选择处置</legend>{actions.map(a=><label key={a} className={action===a?'selected':''}><input type="radio" name={'custody-action-'+person} checked={action===a} onChange={()=>setAction(a)}/><strong>{names[a]}</strong><small>{description(a)}</small></label>)}</fieldset>
   {action==='treatment'&&<fieldset className="custody-choices"><legend>看管待遇</legend>{(['guarded','honored','house'] as const).map(v=><label key={v} className={treatment===v?'selected':''}><input type="radio" name="custody-treatment" checked={treatment===v} onChange={()=>setTreatment(v)}/>{custodyTreatmentNames[v]}<small>中央 {v==='honored'?6:v==='house'?3:2} 钱／月</small></label>)}</fieldset>}
   {action==='recruit'&&<><fieldset className="custody-choices"><legend>招降条件</legend>{(['stipend','office'] as const).map(v=><label key={v} className={offer===v?'selected':''}><input type="radio" name="custody-offer" checked={offer===v} onChange={()=>setOffer(v)}/>{v==='stipend'?'礼金延聘':'许诺授职'}<small>礼金均为 80 钱；{v==='office'?'九十日内授职，失信会损伤关系与忠诚':'不附带官职承诺'}</small></label>)}</fieldset><button onClick={()=>setPick('mediator')}>游说者：{mediator?officeName(mediator):'亲自交涉'} ›</button>{mediator&&<button onClick={()=>setMediator('')}>改为亲自交涉</button>}{q&&<div className="custody-estimate"><strong>{q.willing?'有意归附':'暂不愿归附'} · 接受倾向，非成功概率</strong>{q.factors.map(v=><span key={v.label}>{v.label} {v.value>0?'+':''}{v.value}</span>)}</div>}</>}
   {action==='exchange'&&<button onClick={()=>setPick('exchange')}>交换对象：{other?officeName(other):'选择己方被俘人物'} ›</button>}
   {action==='guarantee'&&<button onClick={()=>setPick('guarantor')}>担保人：{officeName(guarantor)} ›</button>}
   {action==='execute'&&<p className="service-warning">人物将永久死亡，婚姻、官职与继承按公共规则清理，亲友可能因此结仇。</p>}
   {p&&governmentOf(w,p.origin)?.executives.every(id=>detained(w,id))&&<p>原国临时代理：{officeName(governingAuthority(w,p.origin)??'')}；君位未发生继承。</p>}
   {reason&&<p className="service-warning" role="status">{reason}</p>}
  </ActionDialog>}
  {pick&&<PersonSelectionDialog world={w} title={pick==='exchange'?'选择换俘对象':pick==='guarantor'?'选择担保人':'选择游说者'} options={pickerOptions} value={pick==='exchange'?other:pick==='guarantor'?guarantor:mediator} onSelect={v=>pick==='exchange'?setOther(v):pick==='guarantor'?setGuarantor(v):setMediator(v)} onClose={()=>setPick(null)} onConfirm={()=>setPick(null)} pending={pending} confirmLabel="使用此人"/>}
 </section>;
}
export function CustodyPanel({world:w,pending,send,onPerson,domestic=false}:Props&{domestic?:boolean}){
 const r=playerRealm(w),records=Object.values(w.custody?.records??{}).filter(p=>(p.captor===r||p.origin===r||p.person===w.characterId)&&(!domestic||p.cause==='arrest'));
 return <section className="custody-panel"><div className="custody-roster">{records.map(p=><article key={p.person}><button className="custody-roster-portrait" aria-label={'查看'+officeName(p.person)} onClick={()=>onPerson?.(p.person)}><CharacterPortrait characterId={p.person} world={w}/></button><div><strong>{officeName(p.person)}</strong><CustodyPerson key={p.person} world={w} person={p.person} pending={pending} send={send} onPerson={onPerson}/></div></article>)}</div>{!records.length&&<p>当前没有{domestic?'收押案件':'相关被俘人物'}。</p>}{w.custody?.warrants.filter(q=>q.realm===r&&q.status==='pending').map(q=><p key={q.id}>{officeName(q.person)} · 拘捕令待执行 · {Math.max(0,q.due-w.day)} 日后复核 · {q.evidence||'无个案依据'}</p>)}{w.custody?.promises.filter(q=>q.realm===r&&q.status==='pending').map(q=><p key={q.person}>{officeName(q.person)} · 授职承诺 · 余 {Math.max(0,q.due-w.day)} 日</p>)}</section>;
}

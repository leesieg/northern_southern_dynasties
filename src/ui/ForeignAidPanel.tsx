import {px} from './peopleScale';
import {useState} from 'react';
import type {World,GameCommand} from '../core/types';
import type {RealmId} from '../core/realm';
import {allegianceRealm} from '../core/officeEligibility';
import {worldRealms} from '../core/polityRuntime';
import {governingExecutives,regimeName,politicalName} from '../core/government';
import {personResidence} from '../core/residence';
import {foreignAidModes,foreignAidQuote,type ForeignAidMode} from '../core/foreignAid';
import {defectionReason} from '../core/defections';
import {siteById} from '../data/scenario';
import {ActionDialog} from './ActionDialog';
import {SingleChoiceCards} from './SingleChoiceCards';

const notes={paid:'实际中央公库或本城公库支付 100 钱给援助国，接受时实扣实收；外国军队保持本国指挥、供饷与真实行程。',tribute:'由本政权执政者同意称藩，承担现有宗属义务；外国加入当前战事，不复制援军或上缴整个地方公库。',cession:'仅交接本人可处分的实控县域、愿意追随的兵员及对应公库；原法理归属保留，接纳国承担 100 钱保护预算及与法理朝廷交战的后果。'};
export function ForeignAidPanel({world:w,pending,send}:{world:World;pending:boolean;send:(c:GameCommand)=>Promise<boolean>}){
 const actor=w.characterId!,r=allegianceRealm(w,actor),chief=!!r&&governingExecutives(w,r).includes(actor),locations=Object.entries(w.realm!.cities).filter(([,c])=>c.controller===r&&(chief||c.governor===actor)).map(([id])=>id);
 const [open,setOpen]=useState(false),[site,setSite]=useState(personResidence(w,actor).site),[target,setTarget]=useState<RealmId>('west'),[mode,setMode]=useState<ForeignAidMode>('paid'),[selected,setSelected]=useState<number|null>(null);
 const request={type:'defection',action:'request',site,target,mode} as const,quote=foreignAidQuote(w,request),item=w.defections?.items.find(q=>q.id===selected),rows=w.defections?.items.filter(q=>q.mode&&q.status==='pending'&&(q.actor===actor||q.to===r&&chief))??[];
 const receipt=item?.mode==='cession'&&item.actor?foreignAidQuote(w,{type:'defection',action:'request',site:item.site,target:item.to,mode:item.mode},item.actor).transfer:null;
 const submit=async(c:Parameters<typeof defectionReason>[1])=>{if(pending||defectionReason(w,c))return;if(await send(c)){setOpen(false);setSelected(null);}};
 return <section className="foreign-aid-panel"><h3>外援交涉</h3>{locations.length>0&&<button onClick={()=>{setSite(locations.includes(site)?site:locations[0]);setOpen(true);}}>请求外援</button>}{rows.map(q=><button key={q.id} onClick={()=>setSelected(q.id)}>{siteById[q.site].name} · {foreignAidModes[q.mode!]} · {regimeName(w,q.to)} · 交涉余 {Math.max(0,7-(w.day-q.created))} 日</button>)}
 {open&&<ActionDialog title="请求外国援助" art="dispatch" onClose={()=>setOpen(false)} actions={<><span role="status">{quote.reason||'七日后按实际局势与援方兵力复核；援军不会立即抵达。'}</span><button className="primary" disabled={pending||!!quote.reason} onClick={()=>void submit(request)}>发出{foreignAidModes[mode]}</button></>}>
 <label>求援地区<select value={site} onChange={e=>setSite(e.target.value)}>{locations.map(id=><option key={id} value={id}>{siteById[id].name}</option>)}</select></label><label>交涉对象<select value={target} onChange={e=>setTarget(e.target.value as RealmId)}>{worldRealms(w).filter(id=>id!==r).map(id=><option key={id} value={id}>{regimeName(w,id)}</option>)}</select></label>
 <SingleChoiceCards label="求援条件" value={mode} onChange={id=>setMode(id as ForeignAidMode)} options={(Object.keys(foreignAidModes) as ForeignAidMode[]).map(id=>({id,title:foreignAidModes[id],description:notes[id],art:'dispatch'}))}/><p>{notes[mode]}</p>{quote.transfer&&<p>可交接县域：{quote.transfer.cities.map(id=>siteById[id].name).join('、')||'无'}；实际追随 {px(quote.transfer.troops)} 人；对应公库 {quote.transfer.accounts.reduce((n,a)=>n+a.coins,0)} 钱。人口与粮仓保持原地，原有其他县域公职撤除。</p>}<p>提出者：{politicalName(actor,w)}；当前对手：{quote.enemy?regimeName(w,quote.enemy):'尚无符合条件的实际战事'}。交涉失效或遭拒绝不扣援费，不替第三方割地。</p>
 </ActionDialog>}
 {item&&item.mode&&item.status==='pending'&&<ActionDialog title={siteById[item.site].name+' · '+foreignAidModes[item.mode]} art="dispatch" onClose={()=>setSelected(null)} actions={item.to===r&&chief?<>{(['reject','accept'] as const).map(action=>{const c={type:'defection',action,id:item.id} as const,why=defectionReason(w,c);return <button key={action} className={action==='accept'?'primary':undefined} disabled={pending||!!why} title={why||undefined} onClick={()=>void submit(c)}>{action==='accept'?'确认接纳并承担保护责任':'拒绝求援'}</button>;})}</>:null}>
 <p>{item.reason}</p><p>{notes[item.mode]}</p>{receipt&&<p>当前交接：{receipt.cities.map(id=>siteById[id].name).join('、')||'无可交接县域'}；随行 {px(receipt.troops)} 人；地方公库 {receipt.accounts.reduce((n,a)=>n+a.coins,0)} 钱。提出者 {politicalName(item.actor!,w)}转入本国，仅保留交接县域的合法职权。</p>}<p>求援方：{regimeName(w,item.from)}；接纳方：{regimeName(w,item.to)}。兵地、钱粮、条约、求援者身份与原战事在接受前重新核验。</p>{item.to===r&&<p role="status">{defectionReason(w,{type:'defection',action:'accept',id:item.id})}</p>}
 </ActionDialog>}
 </section>;
}

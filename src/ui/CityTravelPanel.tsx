import {useState} from 'react';
import {personalRoute,travelDiplomacyReason} from '../core/diplomacy';
import {provisionCost} from '../core/construction';
import {siteById} from '../data/scenario';
import type {World,GameCommand} from '../core/types';
import {ActionDialog} from './ActionDialog';
import {DialogArt} from './DialogArt';
import {DecisionMetrics} from './DecisionPresentation';
import {afterCommand} from './actionFeedback';
export function CityTravelPanel({world,site,pending,send}:{world:World;site:string;pending:boolean;send:(c:GameCommand)=>Promise<boolean>}){
 const [draft,setDraft]=useState<'provision'|'travel'|null>(null),person=world.people[0],plan=person.journey?null:personalRoute(world,site),cost=provisionCost(world);
 const reason=person.journey?'正在途中，请先完成当前行程。':site===person.location?'你已身在此地。':!plan?travelDiplomacyReason(world,site)||'没有可用道路。':person.food<plan.food?'行粮不足，请先整备。':'';
 const provisionReason=person.journey?'途中无法补充行粮。':person.coins<cost?`本人盘缠不足，需要 ${cost} 钱。`:'';
 return <section className="city-travel-page"><div><h3>{siteById[person.location].name} → {siteById[site].name}</h3>{plan?<><DecisionMetrics items={[{label:'预计行程',value:plan.days+' 日'},{label:'估算路程',value:plan.distance.toLocaleString()+' 公里'},{label:'需备行粮',value:plan.food+' 日份',icon:'grain'}]}/><ol className="city-route-stops">{plan.route.map((id,i)=><li key={id}>{siteById[id].name}<small>{i===0?'出发':i===plan.route.length-1?'抵达':'途经'}</small></li>)}</ol></>:<p>{reason}</p>}<p>本人行粮 {person.food} 日份 · 盘缠 {person.coins} 钱</p><div className="city-travel-actions"><button disabled={pending||!!provisionReason} onClick={()=>setDraft('provision')}>整备行粮</button><button disabled={pending||!!reason} onClick={()=>setDraft('travel')}>查看行程并启程</button></div>{reason&&plan&&<p role="status">{reason}</p>}{provisionReason&&<p role="status">{provisionReason}</p>}</div><DialogArt scene="migration" className="city-travel-paint"/>
 {draft&&<ActionDialog className="city-travel-dialog" title={draft==='provision'?'整备行粮':'启程文书'} art="migration" onClose={()=>setDraft(null)} actions={<button className="primary" disabled={pending||!!(draft==='provision'?provisionReason:reason)} onClick={()=>{if(pending||(draft==='provision'?provisionReason:reason))return;void afterCommand(send(draft==='provision'?{type:'provision'}:{type:'travel',destination:site}),()=>setDraft(null));}}>{draft==='provision'?'确认备粮':'确认启程'}</button>}><DialogArt scene="migration" className="city-policy-paint"/><h3>{draft==='provision'?siteById[person.location].name+' · 备办旅粮':siteById[person.location].name+' → '+siteById[site].name}</h3><DecisionMetrics items={draft==='provision'?[{label:'本人盘缠支出',value:cost+' 钱',icon:'coins'},{label:'补充行粮',value:'30 日份',icon:'grain'},{label:'备粮后余粮',value:person.food+30+' 日份'}]:[{label:'预计抵达',value:(plan?.days??'—')+' 日'},{label:'扣除本人行粮',value:(plan?.food??'—')+' 日份',icon:'grain'}]}/><p>{draft==='provision'?'从本人盘缠支付，仅补充行粮；不会自动启程。':'确认后将所需行粮备入旅囊，沿已选路线行进；抵达自动暂停。'}</p>{(draft==='provision'?provisionReason:reason)&&<p role="status" className="service-warning">{draft==='provision'?provisionReason:reason}</p>}</ActionDialog>}
 </section>;
}

import {canEnter} from '../core/diplomacy';
import {armyControls,civilWar} from '../core/civilWars';
import {armyDailyFood,armyMonthlyPay,realmReason,type Army} from '../core/realm';
import {civilianFood} from '../core/population';
import {accountName} from '../core/treasury';
import {siteById} from '../data/scenario';
import {ArtIcon} from './ArtIcon';
import type {World,GameCommand} from '../core/types';
export function ArmySupplyStatus({world:w,army:a,pending,send}:{world:World;army:Army;pending:boolean;send:(c:GameCommand)=>void}){
 const daily=armyDailyFood(w,a),days=Math.floor(a.supply/Math.max(1,daily)),c=a.convoy,city=w.realm!.cities[a.location],reserve=civilianFood(w,a.location)*2;
 const battle=w.militaryAftermath?.battles.slice().reverse().find(b=>b.a===a.id||b.b===a.id);
 const blocked=c?.route.slice(c.leg+1).some(id=>!canEnter(w,a.realm,w.realm!.cities[id].controller,undefined,true)||(civilWar(w,a.realm)&&!armyControls(w,a,id)));
 const homes=Object.entries(w.realm!.cities).filter(([,v])=>v.controller===a.realm).map(([id,v])=>({id,free:Math.max(0,v.grain-civilianFood(w,id)*2),cmd:{type:'realm',action:'march',army:a.id,site:id} as const})).filter(v=>v.free>120&&!realmReason(w,v.cmd)).sort((a,b)=>b.free-a.free).slice(0,3);
 return <article className="army-supply-status"><h4><ArtIcon name="grain" size={24}/>{days<3?'军粮告急':days<10?'补给预警':'军粮与损失'}</h4><p>随军粮保守可用 {days} 日 · 每日最多 {daily} 粮 · 每 30 日军饷 {armyMonthlyPay(w,a)} 钱</p><small>{accountName(a.payer??'central:'+a.realm)}供饷{a.arrears?` · 欠饷 ${a.arrears} 钱，士气下降、集训延期`:''}</small>
 {c?<p>{blocked?'粮道中断，需恢复军队通行或撤往己方粮仓。':'粮道可通行。'}粮队赴 {siteById[c.to].name} · 余 {Math.max(0,c.durations.slice(c.leg).reduce((n,d)=>n+d,0)-c.elapsed)} 通行日（另计道路装运）；抵达损耗 5%。{c.to!==(a.journey?.route.at(-1)??a.location)&&'军队已改变目的地，粮队不会追随改道。'}</p>:<p>驻地可调粮 {Math.max(0,city.grain-reserve)}，保留民食 {reserve}。粮队按可通行道路自动调运；无余粮或道路不通时无法补给。</p>}
 {days<10&&<><p className="service-warning">当日口粮不足：现役减员 2%（向上取整），士气 −4；集训期间同样需粮。</p><div className="city-policy-grid">{homes.map(v=><button key={v.id} disabled={pending} onClick={()=>send(v.cmd)}><ArtIcon name="world" size={24}/>移驻 {siteById[v.id].name}<small>当地可调粮 {v.free} · 路程见行军进度</small></button>)}</div>{!homes.length&&<p>暂无可直达的充足粮仓。可在迁运页向驻地运粮，或在结清欠饷后遣散部分军队。</p>}</>}
 {battle&&<p>最近交锋 · 第 {battle.last} 日：本军累计减员 {battle.a===a.id?battle.lossA:battle.lossB} 人。脱离交战可使用下方撤军行动。</p>}
 {w.chronicle.filter(e=>e.text.startsWith(`第 ${a.id} 军断粮`)).slice(-3).reverse().map((e,i)=><small key={i}>第 {e.day} 日 · {e.text}</small>)}
 </article>;
}

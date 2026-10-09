import {manpower,recruitmentSources,consumeManpower} from '../core/manpower';
import {estateById,estatePolicies,actualEstatePolicy} from '../core/estates';
import {getPerson} from '../core/personRegistry';
import {cityYield} from '../core/realm';
import type {World} from '../core/types';
export function ManpowerPreview({world:w,site,owner,amount}:{world:World;site:string;owner?:string;amount:number}){
 const q=manpower(w,site,owner),selection=recruitmentSources(w,site,amount,owner),before=cityYield(w,site),after=selection.reason?null:(()=>{const next=structuredClone(w);consumeManpower(next,site,selection.parts);return cityYield(next,site);})();
 return <section className="manpower-preview"><h4>来源与动员</h4><p>基础比例 4% · 本县总兵额 {q.total} · 现役、伤兵、俘虏及返乡占用 {q.used} · 差事预留 {q.reserved}</p><p>公共剩余 {q.publicAvailable} · 本人私人剩余 {q.privateAvailable} · 实际赋役 {estatePolicies[actualEstatePolicy(w,site)].name}</p><div>{selection.parts.map((p,i)=><p key={i}>{p.sourceEstate?getPerson(w,estateById(w,p.sourceEstate)?.owner??'')?.name+'庄园':'普通编户'}：{p.troops} 人，占{p.quota==='private'?'私人':'公共'}兵额</p>)}</div><p>征募真实减少民用人口 {Number.isFinite(amount)?amount:0}；县域下月总产粮 {before.grossGrain} → {after?.grossGrain??before.grossGrain}。中央与地方共用公共额度，改编不释放原额度。</p>{amount<100&&<p>不足 100 人须继续集结或合编后独立出征。</p>}{selection.reason&&<p role="status">{selection.reason}</p>}</section>;
}

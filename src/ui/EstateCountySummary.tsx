import {estatePopulation,ordinaryPopulation,estatesAt,estatePolicies,actualEstatePolicy} from '../core/estates';
import {manpower} from '../core/manpower';
import {cityYield} from '../core/realm';
import {ArtIcon} from './ArtIcon';
import type {World} from '../core/types';
export function EstateCountySummary({world:w,sites}:{world:World;sites:string[]}){
 if(!w.realm)return null;
 const rows=sites.map(site=>({site,army:manpower(w,site),yield:cityYield(w,site)}));
 return <section className="estate-county-summary" aria-label="编户与庄园赋役"><h4><ArtIcon name="estate" size={24}/>编户与庄园</h4><p>普通编户 {sites.reduce((n,s)=>n+ordinaryPopulation(w,s),0).toLocaleString()} 人 · 庄户 {sites.reduce((n,s)=>n+estatePopulation(w,s),0).toLocaleString()} 人（县域人口的子集） · {sites.reduce((n,s)=>n+estatesAt(w,s).length,0)} 处庄园</p><p>公共可征 {rows.reduce((n,r)=>n+r.army.publicAvailable,0).toLocaleString()} 人 · 现役及未落户占額 {rows.reduce((n,r)=>n+r.army.used,0).toLocaleString()} 人 · 差事预留 {rows.reduce((n,r)=>n+r.army.reserved,0)} 人</p><p>每月农业赋税 {rows.reduce((n,r)=>n+r.yield.agriculturalTax,0)} 钱 · 商业税 {rows.reduce((n,r)=>n+r.yield.commercialTax,0)} 钱。庄粮独立储存，未计入公粮。</p>{sites.length===1&&<small>实际执行：{estatePolicies[actualEstatePolicy(w,sites[0])].name}；朝廷目标须经合格核籍差事完成后生效。</small>}</section>;
}

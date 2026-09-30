import {assignmentTemplates,type AssignmentKind} from '../data/assignments';
import {cityYield,type RealmId} from './realm';
import {politicalAction,type PolicyDomain} from './politicalActions';
import type {World} from './types';
export const serviceDomain=(kind:AssignmentKind):PolicyDomain=>kind==='taxation'?'tax':['training','supply','recruitment'].includes(kind)?'military':kind==='inspection'?'reform':['commerce','marketworks','hostelworks'].includes(kind)?'commerce':'welfare';
export function serviceNeed(w:World,kind:AssignmentKind,site:string){const c=w.realm!.cities[site],y=cityYield(w,site),army=w.realm!.armies.find(a=>a.location===site),deficit=Math.max(0,y.food-y.grain);let score=10,reason='长期经营机会',neglect='可等待资源充裕后再办';
 if(kind==='relief'&&(deficit||c.order<50)){score=80+Math.max(0,50-c.order)+deficit;reason=deficit?c.grain+y.grain<y.food?'本期库存与产粮不足以支应民食':'当期产粮低于民食，正在消耗库存':'地方秩序低落';neglect=deficit?'若库存耗尽且缺口持续，月结会损失人口与秩序':'秩序低落会压低征收与生产效率';}
 if(['agriculture','greatworks'].includes(kind)){score=30+deficit*3+Math.max(0,65-c.prosperity);reason='水利改善可提升人口生产效率';neglect='长期产能难以支持人口与军粮';}
 if(kind==='supply'&&army){score=army.supply<40?95:20;reason='驻军粮储 '+army.supply;neglect='补给耗尽会减员';}
 if(kind==='training'&&army){score=100-army.morale;reason='驻军士气 '+army.morale;neglect='作战效率受限';}
 if(kind==='inspection'){score=100-c.order;reason='秩序 '+c.order+'，整饬地方执行';neglect='征收和生产效率受损';}
 if(kind==='taxation'){score=w.realm!.treasuries[c.owner as RealmId]?.coins<200?75:15;reason='追征可缓解公库紧张，但降低秩序';neglect='须缩减其他公共支出';}
 if(['commerce','marketworks'].includes(kind)){score=20+Math.round(y.region.trade*10)+(100-c.prosperity)/5;reason=y.region.name+' · 商贸效率 '+y.region.trade;neglect='保留经费也可等待，非紧急任务';}
 return {score:Math.round(score),tier:score>=80?'必须处理':score>=40?'值得争取':'自主经营',reason,neglect};}
export function servicePolitics(w:World,r:RealmId,kind:AssignmentKind){return politicalAction(w,r,serviceDomain(kind));}
export function incidentChoices(kind:AssignmentKind){
 const category=assignmentTemplates[kind].category;
 return {spend:kind==='inspection'?'雇员核账 · 追加 20 钱，触动地方关系':category==='military'?'购买军需 · 追加 20 钱，需道路畅通':category==='economy'?'雇工赶办 · 追加 20 钱，增加劳役负担':'雇员承办 · 追加 20 钱，成果较少',delay:'协商缓办 · 工作量 +40，成果更稳妥',strain:category==='military'?'强征督办 · 秩序 −8，压力 +18':'强令推进 · 秩序 −8，压力 +18'};
}

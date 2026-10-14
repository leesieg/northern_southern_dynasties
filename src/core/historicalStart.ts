import type {World} from './types';
import {DEFAULT_SCRIPT} from '../data/scripts';
import {capital} from './realm';
import {consumeManpower,recruitmentSources,recruitmentRegiments} from './manpower';
import {ensureArmyOrganization,troopKinds} from './armyOrganization';
import {ensureHistorical} from './historicalEvents';
import {relationOpinion,changeRelationOpinion} from './relationships';
import {awardInfluence,personInfluence} from './personalInfluence';
import {fiscalRecord} from './treasury';
/** Only the new-game entry calls this; never invoked by migration or event triggers.
 * Sources: 梁書卷56 (Hou Jing's military position). All quantities are game parameters. */
export function initializeHistoricalStart(w:World){
 if(w.mode!=='sandbox'||w.scriptId!==DEFAULT_SCRIPT)return;
 if(w.day!==0||w.realm!.armies.length)throw new Error('历史开局军政配置只能初始化一次');
 const next=structuredClone(w),r=next.realm!;ensureArmyOrganization(next);ensureHistorical(next);
 const entries=[{realm:'east',site:'yingchuan',commander:'hou-jing'},...(['liang','east','west'] as const).map(realm=>({realm,site:capital(realm,next),commander:undefined}))] as const;
 for(const entry of entries){
  const realm=entry.realm as 'east'|'liang'|'west',city=r.cities[entry.site],source=recruitmentSources(next,entry.site,600),cost=troopKinds.shield.cost*3*2,grain=180;
  if(source.reason||!city||city.controller!==realm||city.grain<grain||r.treasuries[realm].coins<cost)throw new Error('历史开局配置无效：'+entry.site+' '+(source.reason||'钱粮或实际控制不足'));
  const id=r.nextArmyId!++,units=recruitmentRegiments(source.parts,id,entry.site,'shield','standing');
  for(const unit of units){unit.experience=20;unit.institution=60;if(entry.commander){unit.loyalTo=entry.commander;unit.commanderLoyalty=70;}}
  consumeManpower(next,entry.site,source.parts);city.grain-=grain;r.treasuries[realm].coins-=cost;
  r.armies.push({id,realm,location:entry.site,troops:600,morale:70,supply:grain,journey:null,siege:0,payer:'central:'+realm,arrears:0,foodRemainder:0,regiments:units});
  if(entry.commander){next.mobility!.armyCommanders??={};next.mobility!.armyCommanders[id]=entry.commander;}
  fiscalRecord(next,realm,'central:'+realm,'expense',cost,'546 年开局常备军装备；兵额与军粮从来源县域扣除');
 }
 awardInfluence(next,'hou-jing',80-personInfluence(next,'hou-jing'));
 for(const [person,target] of [['gao-huan',30],['gao-cheng',-30]] as const)changeRelationOpinion(next,'hou-jing',person,target-relationOpinion(next,'hou-jing',person));
 Object.assign(w,next);
}

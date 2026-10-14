import type {World} from './types';
import {campaignSetup} from '../data/campaignSetup';
import {consumeManpower,recruitmentSources,recruitmentRegiments} from './manpower';
import {ensureArmyOrganization,troopKinds} from './armyOrganization';
import {ensureHistorical} from './historicalEvents';
import {relationOpinion,changeRelationOpinion} from './relationships';
import {awardInfluence,personInfluence} from './personalInfluence';
import {fiscalRecord} from './treasury';
/** Only the new-game entry calls this; never invoked by migration or event triggers.
 * Sources: 梁書卷56 (Hou Jing's military position). All quantities are game parameters. */
export function initializeHistoricalStart(w:World){
 if(w.mode!=='sandbox')return;
 if(w.day!==0||w.realm!.armies.length)throw new Error('历史开局军政配置只能初始化一次');
 const next=structuredClone(w),r=next.realm!;ensureArmyOrganization(next);ensureHistorical(next);
 const entries=campaignSetup.armies,setup=campaignSetup;
 for(const entry of entries){
  const realm=entry.realm as 'east'|'liang'|'west',city=r.cities[entry.site],source=recruitmentSources(next,entry.site,setup.troops),cost=troopKinds.shield.cost*(setup.troops/200)*2,grain=setup.grain;
  if(source.reason||!city||city.controller!==realm||city.grain<grain||r.treasuries[realm].coins<cost)throw new Error('历史开局配置无效：'+entry.site+' '+(source.reason||'钱粮或实际控制不足'));
  const id=r.nextArmyId!++,units=recruitmentRegiments(source.parts,id,entry.site,'shield','standing');
  for(const unit of units){unit.experience=setup.experience;unit.institution=setup.institution;if(entry.commander){unit.loyalTo=entry.commander;unit.commanderLoyalty=setup.commanderLoyalty;}}
  consumeManpower(next,entry.site,source.parts);city.grain-=grain;r.treasuries[realm].coins-=cost;
  r.armies.push({id,realm,location:entry.site,troops:setup.troops,morale:setup.morale,supply:grain,journey:null,siege:0,payer:'central:'+realm,arrears:0,foodRemainder:0,regiments:units});
  if(entry.commander){next.mobility!.armyCommanders??={};next.mobility!.armyCommanders[id]=entry.commander;}
  fiscalRecord(next,realm,'central:'+realm,'expense',cost,'546 年开局常备军装备；兵额与军粮从来源县域扣除');
 }
 for(const entry of setup.influence)awardInfluence(next,entry.person,entry.value-personInfluence(next,entry.person));
 for(const entry of setup.opinions)changeRelationOpinion(next,entry.from,entry.to,entry.value-relationOpinion(next,entry.from,entry.to));
 Object.assign(w,next);
}

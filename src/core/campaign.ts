import {getCharacter} from './personRegistry';
import {startRules} from '../data/characters';
import { siteById } from '../data/scenario';
import type { World } from './types';
export interface Campaign {id:'jiangzuo'|'stewardship';deadline:120;appointed:boolean;status:'active'|'won'|'lost';finishedDay:number|null}
export function campaignGoals(w:World){
  if(w.characterId){const c= getCharacter(w,w.social?.founder??w.characterId)!,r=startRules(c),levels=w.holdings.cities[c.home]?.levels;
    return [
      {title:siteById[c.home].name+'市肆升至 '+r.market+' 级',done:(levels?.market??0)>=r.market,hint:'在起始城市安排市肆建设，等待竣工。'},
      {title:r.granary?'城仓升至 '+r.granary+' 级':'建成一级驿舍',done:r.granary?(levels?.granary??0)>=r.granary:(levels?.hostel??0)>=1,hint:'同一城市只能同时推进一个工程。'},
      {title:'建成家族田庄',done:w.holdings.estate.levels.fields>=1,hint:'打开家族庄园，兴建一级田庄。'},
      {title:'经营满 30 日',done:w.day>=30,hint:'推进时间，体验营建收益结算；120 日内完成全部目标。'},
    ];
  }
  return [
  {title:'赴京口领取委任',done:!!w.campaign?.appointed,hint:'前往京口，抵达后领取委任与 180 钱营建款。'},
  {title:'建成京口市肆',done:(w.holdings.cities.jingkou?.levels.market??0)>=1,hint:'取得治理权后，在京口营建一级市肆。'},
  {title:'建成家族田庄',done:w.holdings.estate.levels.fields>=1,hint:'打开庄园，兴建一级田庄。'},
  {title:'返抵建康',done:!!w.campaign?.appointed&&w.people[0].location==='jiankang'&&!w.people[0].journey,hint:'建设完成后返回建康，自动结算本局。'},
];}
export function commission(w:World){
  const c=w.campaign,p=w.people[0];
  if(!c||c.id!=='jiangzuo'||c.status!=='active'||c.appointed)throw new Error('当前没有可领取的委任。');
  if(p.journey||p.location!=='jingkou')throw new Error('请先抵达京口，再领取委任。');
  c.appointed=true;if(!w.holdings.governedCities.includes('jingkou'))w.holdings.governedCities.push('jingkou');p.coins=Math.min(1_000_000,p.coins+180);
  w.chronicle.push({day:w.day,person:'player',text:'你在京口领取营建委任，获得本城治理权与 180 钱营建款。'});w.chronicle=w.chronicle.slice(-100);
}
export function evaluateCampaign(w:World){
  const c=w.campaign;if(w.mode==='sandbox'||!c||c.status!=='active')return;
  if(campaignGoals(w).every(g=>g.done))c.status='won';else if(w.day>=c.deadline)c.status='lost';
  if(c.status!=='active'){c.finishedDay=w.day;w.chronicle.push({day:w.day,person:'player',text:c.status==='won'?(w.characterId?'营建有成：本局全部目标达成。':'立足江左：你完成营建，返抵建康，本局达成。'):'期限已至，营建目标未全部完成。本局结束，可重新开局。'});w.chronicle=w.chronicle.slice(-100);}
}

export const campaignTitle=(w:World)=>w.characterId? getCharacter(w,w.characterId)!.name+' · 营建有成':'立足江左';

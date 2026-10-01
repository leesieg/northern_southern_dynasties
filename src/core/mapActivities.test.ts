import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {mapActivities} from './mapActivities';
import {parseWorld,serializeWorld} from './save';
import {ongoingItems} from './ongoing';
import {newGovernedCampaignWorld} from './governedTestWorld';
import {routeGrant} from './treasury';
describe('地图重要活动',()=>{
 it('庄园工程复用既有入口，不重复地图徽记，顶部仍追踪施工且存读一致',()=>{const w=newCampaignWorld('xiao-gang',undefined,'sandbox');act(w,{type:'mobility',action:'plan',kind:'visit',site:'jiankang',target:'xiao-yan'});act(w,{type:'build',scope:'estate',site:w.holdings.estate.location,building:'fields'});const before=structuredClone(w),groups=mapActivities(w);expect(groups).toHaveLength(1);expect(groups[0].items).toHaveLength(1);expect(groups[0].items[0].kind).toBe('activity');expect(w).toEqual(before);expect(mapActivities(parseWorld(serializeWorld(w)))).toEqual(groups);expect(ongoingItems(w).some(i=>i.target.page==='estate')).toBe(true);act(w,{type:'mobility',action:'cancel',id:w.mobility!.activities[0].id});expect(mapActivities(w)).toEqual([]);expect(ongoingItems(w).some(i=>i.target.page==='estate')).toBe(true);w.holdings.estate.project=null;expect(ongoingItems(w).some(i=>i.target.page==='estate')).toBe(false);});
 it('个人重心及技能点待办不生成地图事项徽记，城市工程仍保留',()=>{const w=newGovernedCampaignWorld('xiao-gang',undefined,'sandbox');expect(mapActivities(w)).toEqual([]);act(w,{type:'lifestyle',action:'focus',focus:'architecture'});expect(ongoingItems(w).some(i=>i.kind==='skills')).toBe(true);expect(mapActivities(w)).toEqual([]);act(w,{type:'retinue',action:'recruit',person:'guest-liang'});act(w,{type:'retinue',action:'assign',person:'guest-liang',post:'engineer',site:'jiankang'});routeGrant(w,'jiankang',100,'营建预算');act(w,{type:'build',scope:'city',site:'jiankang',building:'market'});expect(mapActivities(w)[0].items[0].target).toEqual({page:'city',site:'jiankang',tab:'build'});});
 it('普通出行和私人计谋不额外生成活动标记',()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox');act(w,{type:'travel',destination:'jingkou'});expect(mapActivities(w)).toEqual([]);});
});

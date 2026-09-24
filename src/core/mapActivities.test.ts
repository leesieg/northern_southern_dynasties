import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act} from './world';
import {mapActivities} from './mapActivities';
import {parseWorld,serializeWorld} from './save';
describe('地图重要活动',()=>{
 it('同城活动聚合、完成移除，存读后不丢失入口',()=>{const w=newCampaignWorld('xiao-gang',undefined,'sandbox');act(w,{type:'mobility',action:'plan',kind:'visit',site:'jiankang',target:'xiao-yan'});act(w,{type:'build',scope:'estate',site:w.holdings.estate.location,building:'fields'});const before=structuredClone(w),groups=mapActivities(w);expect(groups).toHaveLength(1);expect(groups[0].items).toHaveLength(2);expect(w).toEqual(before);expect(mapActivities(parseWorld(serializeWorld(w)))).toEqual(groups);act(w,{type:'mobility',action:'cancel',id:w.mobility!.activities[0].id});expect(mapActivities(w)[0].items).toHaveLength(1);w.holdings.estate.project=null;expect(mapActivities(w)).toEqual([]);});
 it('普通出行和私人计谋不额外生成活动标记',()=>{const w=newCampaignWorld('xiao-yan',undefined,'sandbox');act(w,{type:'travel',destination:'jingkou'});expect(mapActivities(w)).toEqual([]);});
});

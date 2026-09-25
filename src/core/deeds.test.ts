import {describe,it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {awardDeed,validDeeds} from './deeds';
import {governmentOf} from './government';
import {parseWorld,serializeWorld} from './save';
const start=()=>newCampaignWorld('xiao-yan',undefined,'sandbox');
describe('可核验成果',()=>{
 it('旧功绩不臆造来源，重复及乱序结算不能重复授予',()=>{const w=start(),g=governmentOf(w)!;const opening=g.merit['xiao-yan'];expect(awardDeed(w,'liang','xiao-yan','assignment:3',4,'办理完成')).toBe(4);expect(w.deeds!.opening['liang|xiao-yan']).toBe(opening);expect(awardDeed(w,'liang','xiao-yan','assignment:1',2,'较早委任晚结案')).toBe(2);expect(awardDeed(w,'liang','xiao-yan','assignment:2',3,'办理完成')).toBe(3);expect(awardDeed(w,'liang','xiao-yan','assignment:1',2,'重复')).toBe(0);expect(w.deeds!.settled['liang|xiao-yan|assignment']).toEqual([1,3]);expect(parseWorld(serializeWorld(w))).toEqual(w);});
 it('归档可压缩连续回执，截断展示记录不开放重复奖励',()=>{const w=start();for(let i=1;i<=900;i++)awardDeed(w,'liang','xiao-yan','test:'+i,1,'测试成果');expect(w.deeds!.recent).toHaveLength(512);expect(w.deeds!.settled['liang|xiao-yan|test']).toEqual([1,900]);expect(awardDeed(w,'liang','xiao-yan','test:1',1,'重复')).toBe(0);expect(validDeeds(w)).toBe(true);w.deeds!.settled['liang|xiao-yan|test']=[4,1];expect(validDeeds(w)).toBe(false);});
 it('保留预算和责任凭证并拒绝伪造支出',()=>{const w=start();const evidence={task:2,site:'jiankang',issuer:'xiao-yan',assessor:'xiao-yan',allocated:{coins:30,grain:10},spent:{coins:20,grain:5},quality:100,progress:100,effects:['秩序 +5'],contributors:[{person:'xiao-yi',lead:20,support:0}]};awardDeed(w,'liang','xiao-yi','assignment:2',5,'办结',evidence);expect(parseWorld(serializeWorld(w))).toEqual(w);w.deeds!.recent[0].evidence!.spent.coins=31;expect(validDeeds(w)).toBe(false);});
 it('不论经济是否已初始化，都禁止付费购买功绩',()=>{const w=start(),before=structuredClone(w);expect(()=>act(w,{type:'government',action:'appraise'})).toThrow('不再收取');expect(w).toEqual(before);advance(w);expect(w.economy).toBeDefined();expect(()=>act(w,{type:'government',action:'appraise'})).toThrow('不再收取');});
});

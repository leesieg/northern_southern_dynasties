import {it,expect} from 'vitest';
import {newCampaignWorld} from './world';
import {getPerson,getCharacter,allPeople,parentLinksOf,relativesOf,familyMembersOf} from './personRegistry';
import {closeKin,opinionBreakdown,changeRelationOpinion} from './relationships';
import {officeCandidates,publicOfficeReason} from './officeEligibility';
import {residentsAt} from './placePeople';
import {relationshipPersonById} from '../data/relationships';
it('本局生成角色进入人物、亲缘、驻留及任官查询且不污染另一个世界',()=>{
 const w=newCampaignWorld('xiao-gang'),other=newCampaignWorld('xiao-gang'),id='born-1';
 w.generatedPeople={[id]:{birthDay:0,father:'xiao-gang',mother:'wang-lingbin',person:{id,name:'萧宁',family:'xiao',realm:'liang',sex:'male',adult:false,status:'fictional',note:'模拟出生',home:'jiankang'},character:{id,name:'萧宁',family:'xiao',polity:'liang',title:'家族子弟',role:'scholar',home:'jiankang',biography:'模拟出生',sources:[]}}};
 w.life!.people[id]={health:100,illness:null,careUntil:0,death:null};
 expect(getPerson(w,id)?.name).toBe('萧宁');expect(getCharacter(w,id)?.id).toBe(id);
 expect(allPeople(w).some(p=>p.id===id)).toBe(true);expect(getPerson(other,id)).toBeUndefined();expect(relationshipPersonById[id]).toBeUndefined();
 expect(parentLinksOf(w).filter(p=>p.child===id)).toHaveLength(2);
 expect(relativesOf(w,'xiao-yan','descendants').some(p=>p.id===id)).toBe(true);
 expect(familyMembersOf(w,'xiao').some(p=>p.id===id)).toBe(true);
 expect(closeKin(id,'xiao-yi',w)).toBe(true);
 expect(residentsAt(w,['jiankang']).some(p=>p.id===id)).toBe(true);
 expect(officeCandidates(w,'liang').some(p=>p.id===id)).toBe(true);expect(publicOfficeReason(w,id)).toBe('须成年后任官');
});
it('既有谱系幼子可查人物角色，不虚构历史官职',()=>{
 const w=newCampaignWorld('xiao-yi');
 const child=getCharacter(w,'xiao-fangzhi');expect(child?.family).toBe('xiao');expect(child?.title).toBe('宗室');
 expect(relativesOf(w,'xiao-yi','descendants').some(p=>p.id==='xiao-fangzhi')).toBe(true);
});

it('新增亲缘首次写入意见沿用同一亲属基础',()=>{
 const w=newCampaignWorld('xiao-gang');const before=opinionBreakdown(w,'xiao-lun','xiao-yan').parts[1].value;
 changeRelationOpinion(w,'xiao-lun','xiao-yan',8);expect(opinionBreakdown(w,'xiao-lun','xiao-yan').parts[1].value-before).toBe(8);
});

it('注册查询拒绝继承自对象原型的伪造人物ID',()=>{
 const w=newCampaignWorld('xiao-gang');for(const id of ['__proto__','constructor','toString']){expect(getPerson(w,id)).toBeUndefined();expect(getCharacter(w,id)).toBeUndefined();}
});

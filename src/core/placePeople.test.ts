import { it,expect } from 'vitest';
import { residentsAt } from './placePeople';
import {relationshipPeople} from '../data/relationships';
import {isAlive} from './lifeState';
import { newCampaignWorld,act } from './world';
import { sites } from '../data/scenario';
const all=sites.map(s=>s.id);
it('同城名单聚合历史人物和实际驻留人物，玩家不重复',()=>{
 const w=newCampaignWorld('xiao-yan'),people=residentsAt(w,all),ids=people.map(p=>p.id);
 expect(new Set(ids).size).toBe(ids.length);
 expect(ids.filter(id=>id==='xiao-yan')).toHaveLength(1);
 expect(people).toHaveLength(relationshipPeople.filter(p=>isAlive(w,p.id)).length+w.people.length-1);
 expect(residentsAt(w,['ye']).map(p=>p.id)).toEqual(expect.arrayContaining(['yuan-shanjian','gao-cheng','gao-yang']));
});
it('出发即退出驻留名单，抵达后只出现在实际目的地',()=>{
 const w=newCampaignWorld('xiao-yan'),p=w.people[0];
 p.journey={route:['jiankang','jingkou'],leg:0,elapsed:0,durations:[2],started:w.day};
 expect(residentsAt(w,all).some(p=>p.id==='xiao-yan')).toBe(false);
 p.journey=null;p.location='jingkou';
 expect(residentsAt(w,['jiankang']).some(p=>p.id==='xiao-yan')).toBe(false);
 expect(residentsAt(w,['jingkou']).filter(p=>p.id==='xiao-yan')).toHaveLength(1);
});
it('辖区范围不重复人物且不纳入外地驻留者',()=>{
 const w=newCampaignWorld('xiao-yan');
 expect(residentsAt(w,['jiankang','jiankang'])).toEqual(residentsAt(w,['jiankang']));
 expect(residentsAt(w,['jiankang']).every(p=>p.site==='jiankang')).toBe(true);
 expect(residentsAt(w,[])).toEqual([]);
});
it('交接后新玩家仅有一处驻地，原人物仍可查阅',()=>{
 const w=newCampaignWorld('xiao-yan');act(w,{type:'heir',target:'xiao-yi'});act(w,{type:'handover'});
 const people=residentsAt(w,all);
 expect(people.filter(p=>p.id==='xiao-yi')).toHaveLength(1);
 expect(people.find(p=>p.id==='xiao-yi')?.self).toBe(true);
 expect(people.some(p=>p.id==='xiao-yan')).toBe(true);
});

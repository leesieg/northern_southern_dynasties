import { it,expect } from 'vitest';
import { newCampaignWorld,act } from './world';
import { opinionBreakdown,relationOpinion,changeRelationOpinion,setFriendship,relationshipScore } from './relationships';
import { acceptance,pair } from './social';
import { diplomaticPair } from './diplomacy';
import { parseWorld,serializeWorld } from './save';
const start=()=>newCampaignWorld('gao-huan',undefined,'sandbox');
it('明细相加等于显示值，特质随人物变化而变化且不会写回交往记忆',()=>{
 const w=start(),a='gao-huan',b='yuwen-tai',raw=w.social!.opinions[pair(a,b)];
 w.social!.traits[a]=['diligent'];w.social!.traits[b]=['diligent'];
 const shared=relationOpinion(w,a,b);w.social!.traits[b]=['steadfast'];expect(relationOpinion(w,a,b)).toBe(shared-4);
 const score=opinionBreakdown(w,a,b);expect(score.parts.reduce((n,p)=>n+p.value,0)).toBe(score.total);
 expect(w.social!.opinions[pair(a,b)]).toBe(raw);
});
it('善交与多疑有方向，慷慨与节俭相冲',()=>{
 const w=start(),a='gao-huan',b='gao-cheng';w.social!.traits[a]=['gregarious','frugal'];w.social!.traits[b]=['wary','generous'];
 const parts=opinionBreakdown(w,a,b).parts;expect(parts.find(p=>p.label==='你的善交')?.value).toBe(8);expect(parts.find(p=>p.label==='对方多疑')?.value).toBe(-6);expect(parts.find(p=>p.label==='节俭与慷慨相冲')?.value).toBe(-10);
 expect(relationOpinion(w,a,b)).not.toBe(relationOpinion(w,b,a));
});
it('友好和交战即时改变好感，接受度只计入一次外交修正',()=>{
 const w=start(),a='gao-huan',b='yuwen-tai',before=relationOpinion(w,a,b),oldScore=acceptance(w,b).reduce((n,p)=>n+p.value,0);
 diplomaticPair(w,'east','west')!.opinion=80;
 expect(relationOpinion(w,a,b)).toBe(before+30);expect(acceptance(w,b).reduce((n,p)=>n+p.value,0)).toBe(oldScore+30);
 const friendly=relationOpinion(w,a,b);act(w,{type:'realm',action:'war',site:'changan'});
 expect(opinionBreakdown(w,a,b).parts.find(p=>p.label==='两国交战')?.value).toBe(-30);expect(relationOpinion(w,a,b)).toBeLessThan(friendly);
});
it('亲友加成只计一次，赠礼修改记忆而非烘焙动态修正，读档一致',()=>{
 const w=start(),a='gao-huan',b='gao-cheng',before=relationshipScore(w,b).reduce((n,p)=>n+p.value,0);
 setFriendship(w,a,b,'friend');expect(relationshipScore(w,b).reduce((n,p)=>n+p.value,0)).toBe(before+15);
 const score=relationOpinion(w,a,b);changeRelationOpinion(w,a,b,5);expect(relationOpinion(w,a,b)).toBe(score+5);
 expect(parseWorld(serializeWorld(w))).toEqual(w);
});
it('扩展人物不会把外交因素永久累加到记忆，封顶后明细仍能核对',()=>{
 const w=start(),a='gao-huan',b='guest-west',base=relationOpinion(w,a,b);
 changeRelationOpinion(w,a,b,5);expect(relationOpinion(w,a,b)).toBe(base+5);
 expect(w.relationships!.opinions[pair(a,b)]).toBe(-20);
 w.social!.opinions[pair(a,'gao-cheng')]=100;setFriendship(w,a,'gao-cheng','confidant');
 const score=opinionBreakdown(w,a,'gao-cheng');expect(score.total).toBe(100);expect(score.parts.reduce((n,p)=>n+p.value,0)).toBe(100);
});

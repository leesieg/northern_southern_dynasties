import {it,expect} from 'vitest';
import {newCampaignWorld,act,advance} from './world';
import {die} from './life';
import {honorReason,actHonor,advanceRulerHonors,honorOfPerson,honorsOfPerson,honorRecommendations,validRulerHistory} from './rulerHistory';
import {governingAuthority} from './government';
import {successionPauses} from './pauseEvents';
import {parseWorld,serializeWorld} from './save';
import {applyPowerArrangement} from './powerPolitics';

it('allows the actual successor to confer a posthumous title on a deceased executive',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');die(w,'gao-huan','illness');
 const t=w.rulerHistory!.tenures.find(t=>t.person==='gao-huan'&&t.office==='executive')!;
 expect(honorReason(w,{type:'honor',action:'confer',tenure:t.id,posthumous:'武'},governingAuthority(w,'east'))).toBe('');
});
it('notifies a player successor of the executive handover without calling it an imperial accession',()=>{
 const w=newCampaignWorld('gao-cheng',undefined,'sandbox');die(w,'gao-huan','illness');
 expect(successionPauses(w)[0]?.title).toContain('执政');
 expect(successionPauses(w)[0]?.title).not.toContain('践祚');
});

it('lets an NPC government honor a deceased executive once without spending resources or changing world rules',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');die(w,'gao-huan','illness');
 const realm=structuredClone(w.realm),life=structuredClone(w.life),identities=structuredClone(w.identities);
 advanceRulerHonors(w);const h=honorOfPerson(w,'east','gao-huan')!;
 expect(h).toMatchObject({posthumous:honorRecommendations(w,h.tenure).posthumous,temple:null,grantor:governingAuthority(w,'east'),day:w.day});
 expect(w.realm).toEqual(realm);expect(w.life).toEqual(life);expect(w.identities).toEqual(identities);
 expect(w.chronicle.some(e=>e.text.includes('高欢')&&e.text.includes('议定谥号'))).toBe(true);
 const once=structuredClone(w);advanceRulerHonors(w);expect(w).toEqual(once);expect(validRulerHistory(w.rulerHistory,w)).toBe(true);
 expect(parseWorld(serializeWorld(w)).rulerHistory).toEqual(w.rulerHistory);
});

it.each(['gao-cheng','yuan-shanjian'])('preserves a player ruler or executive choice after acknowledging the handover: %s',id=>{
 const w=newCampaignWorld(id,undefined,'sandbox');die(w,'gao-huan','illness');advanceRulerHonors(w);
 const tenure=successionPauses(w)[0].tenureId!;expect(w.rulerHistory!.honors).toHaveLength(0);
 act(w,{type:'honor',action:'acknowledge',tenure});advanceRulerHonors(w);expect(w.rulerHistory!.honors).toHaveLength(0);
 act(w,{type:'honor',action:'confer',tenure,posthumous:'武'});expect(honorOfPerson(w,'east','gao-huan')?.posthumous).toBe('武');
 expect(()=>act(w,{type:'honor',action:'confer',tenure,posthumous:'文'})).toThrow('重复');
});

it('keeps an ordinary local player notice unread after NPC conferral and lets the player acknowledge it',()=>{
 const w=newCampaignWorld('gao-yang',undefined,'sandbox');die(w,'gao-huan','illness');advanceRulerHonors(w);
 expect(honorOfPerson(w,'east','gao-huan')).toBeTruthy();expect(successionPauses(w)).toHaveLength(1);
 const tenure=successionPauses(w)[0].tenureId!;act(w,{type:'honor',action:'acknowledge',tenure});
 expect(successionPauses(w)).toHaveLength(0);expect(w.rulerHistory!.honors).toHaveLength(1);
});

it('honors a deceased ruler who also governed only once, using the ruler tenure',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');die(w,'xiao-yan','age');advanceRulerHonors(w);
 expect(w.rulerHistory!.honors).toHaveLength(1);const h=w.rulerHistory!.honors[0];expect(w.rulerHistory!.tenures.find(t=>t.id===h.tenure)?.office).toBe('ruler');
 expect(honorsOfPerson(w,'xiao-yan')).toHaveLength(1);expect(validRulerHistory(w.rulerHistory,w)).toBe(true);
});

it('gives an actual game founder the recommended temple name once and rejects reuse in the same dynasty',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');applyPowerArrangement(w,'east',{goal:'dynasty',sponsor:'gao-huan',beneficiary:'gao-huan',executive:'gao-huan',name:'齐'});
 w.day=1;die(w,'gao-huan','illness');advanceRulerHonors(w);const h=honorOfPerson(w,'east','gao-huan')!;
 expect(h.temple).toBe('太祖');expect(validRulerHistory(w.rulerHistory,w)).toBe(true);
 w.day=2;die(w,'gao-cheng','illness');const t=w.rulerHistory!.tenures.filter(t=>t.person==='gao-cheng'&&t.office==='ruler').at(-1)!;
 expect(honorReason(w,{type:'honor',action:'confer',tenure:t.id,posthumous:'文',temple:'太祖'},governingAuthority(w,'east'))).toContain('已有此庙号');
 advanceRulerHonors(w);expect(honorOfPerson(w,'east','gao-cheng')?.temple).toBeNull();expect(validRulerHistory(w.rulerHistory,w)).toBe(true);
});

it('rejects imperial temple names for executive-only service in commands and saves',()=>{
 const w=newCampaignWorld('gao-cheng',undefined,'sandbox');die(w,'gao-huan','illness');const t=w.rulerHistory!.tenures.find(t=>t.person==='gao-huan')!;
 expect(honorReason(w,{type:'honor',action:'confer',tenure:t.id,posthumous:'武',temple:'太祖'})).toContain('君主任期');
 expect(honorReason(w,{type:'honor',action:'confer',tenure:t.id,posthumous:'武'},'yuwen-tai')).toContain('当前君主');
 actHonor(w,{type:'honor',action:'confer',tenure:t.id,posthumous:'武'});const forged=structuredClone(w.rulerHistory)!;forged.honors[0].temple='太祖';expect(validRulerHistory(forged,w)).toBe(false);
 const future=structuredClone(w.rulerHistory)!;future.honors[0].day=w.day+1;expect(validRulerHistory(future,w)).toBe(false);
});

it('does not give living retired rulers death titles or duplicate the existing notices',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');applyPowerArrangement(w,'liang',{goal:'ruler',sponsor:'xiao-gang',beneficiary:'xiao-gang',executive:'xiao-gang',name:''});
 const t=w.rulerHistory!.tenures.find(t=>t.person==='xiao-yan'&&t.office==='ruler')!;
 expect(honorReason(w,{type:'honor',action:'confer',tenure:t.id,posthumous:'文'},'xiao-gang')).toContain('在世');advanceRulerHonors(w);
 expect(honorsOfPerson(w,'xiao-yan')).toHaveLength(0);expect(w.rulerHistory!.honors).toHaveLength(0);const once=structuredClone(w);advanceRulerHonors(w);expect(w).toEqual(once);
});

it('reopens a read abdication notice once when the retired ruler later dies, without reporting a new accession',()=>{
 const w=newCampaignWorld('xiao-gang',undefined,'sandbox');applyPowerArrangement(w,'liang',{goal:'ruler',sponsor:'xiao-gang',beneficiary:'xiao-gang',executive:'xiao-gang',name:''});
 const tenure=successionPauses(w)[0].tenureId!;act(w,{type:'honor',action:'acknowledge',tenure});expect(successionPauses(w)).toHaveLength(0);
 w.day=1;die(w,'xiao-yan','age');advanceRulerHonors(w);expect(successionPauses(w)).toHaveLength(1);expect(successionPauses(w)[0].title).toContain('前任君主逝世');expect(successionPauses(w)[0].title).not.toContain('践祚');
 const once=structuredClone(w);advanceRulerHonors(w);expect(w).toEqual(once);expect(w.rulerHistory!.honors).toHaveLength(0);
});

it('fills known unhonored legacy deaths on advancement without inventing unobserved tenures on load',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');die(w,'gao-huan','illness');w.rulerHistory!.notifications=[];
 const restored=parseWorld(serializeWorld(w));expect(restored.rulerHistory!.honors).toHaveLength(0);advanceRulerHonors(restored);expect(honorOfPerson(restored,'east','gao-huan')).toBeTruthy();
 delete w.rulerHistory;const unobserved=parseWorld(serializeWorld(w));advanceRulerHonors(unobserved);expect(honorOfPerson(unobserved,'east','gao-huan')).toBeUndefined();
});

it('runs NPC conferral from the actual daily world boundary',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');die(w,'gao-huan','illness');advance(w,1);
 expect(honorOfPerson(w,'east','gao-huan')).toBeTruthy();expect(w.day).toBe(1);
});

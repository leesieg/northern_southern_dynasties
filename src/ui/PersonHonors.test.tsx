import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newCampaignWorld} from '../core/world';
import {die} from '../core/life';
import {actHonor,advanceRulerHonors,syncLocalHistory} from '../core/rulerHistory';
import {applyPowerArrangement} from '../core/powerPolitics';
import {successionPauses} from '../core/pauseEvents';
import {PersonHonors} from './PersonHonors';
import {RulerHistoryPanel,HonorChoice} from './PoliticalIdentity';

it('shows stored posthumous and temple names with their original realm after the regime changes',()=>{
 const w=newCampaignWorld('xiao-gang',undefined,'sandbox');die(w,'xiao-yan','age');const tenure=successionPauses(w)[0].tenureId!;
 actHonor(w,{type:'honor',action:'confer',tenure,posthumous:'文',temple:'太宗'});
 applyPowerArrangement(w,'liang',{goal:'dynasty',sponsor:'chen-baxian',beneficiary:'chen-baxian',executive:'chen-baxian',name:'陈'});
 const html=renderToStaticMarkup(<PersonHonors world={w} person="xiao-yan"/>);
 expect(html).toContain('aria-label="身后称号"');expect(html).toContain('梁');expect(html).toContain('谥「文」');expect(html).toContain('庙号「太宗」');expect(html).not.toContain('陈');
});

it('exposes the same executive title in national and local histories',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');w.realm!.cities.yingchuan.governor='gao-huan';syncLocalHistory(w);die(w,'gao-huan','illness');advanceRulerHonors(w);
 const national=renderToStaticMarkup(<RulerHistoryPanel world={w} realm="east" onPerson={()=>{}}/>),local=renderToStaticMarkup(<RulerHistoryPanel world={w} territory="yingchuan" onPerson={()=>{}}/>);
 for(const html of [national,local]){expect(html).toContain('高欢');expect(html).toContain('aria-label="身后称号"');expect(html).toContain('谥「');expect(html).not.toContain('庙号「');}
});

it('offers an executive successor posthumous conferral without an imperial temple input',()=>{
 const w=newCampaignWorld('gao-cheng',undefined,'sandbox');die(w,'gao-huan','illness');const tenure=successionPauses(w)[0].tenureId!;
 const html=renderToStaticMarkup(<HonorChoice world={w} tenure={tenure} pending={false} send={async()=>true} onPerson={()=>{}}/>);
 expect(html).toContain('已故执政');expect(html).toContain('现任执政');expect(html).toContain('谥号<input');expect(html).not.toContain('庙号<input');expect(html).not.toContain('新君践祚');
});

it('shows an NPC-granted title and an acknowledgement action in an unread local handover',()=>{
 const w=newCampaignWorld('gao-yang',undefined,'sandbox');die(w,'gao-huan','illness');advanceRulerHonors(w);const tenure=successionPauses(w)[0].tenureId!;
 const html=renderToStaticMarkup(<HonorChoice world={w} tenure={tenure} pending={false} send={async()=>true} onPerson={()=>{}}/>);
 expect(html).toContain('谥「');expect(html).toContain('知道了');expect(html).not.toContain('确认议谥与交接文书');
});

it('does not invent death titles for living people or dead people without a conferral record',()=>{
 const w=newCampaignWorld('yuwen-tai',undefined,'sandbox');expect(renderToStaticMarkup(<PersonHonors world={w} person="gao-huan"/>)).toBe('');
 die(w,'gao-huan','illness');expect(renderToStaticMarkup(<PersonHonors world={w} person="gao-huan"/>)).toBe('');
});

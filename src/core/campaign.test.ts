import { describe,it,expect } from 'vitest';
import { newCampaignWorld,newWorld,act,advance,planRoute } from './world';
import { campaignGoals } from './campaign';
import { parseWorld,serializeWorld,validateWorld } from './save';
describe('a complete playable campaign',()=>{
  it('finishes a funded trip, appointment, both builds, a midgame save and return home',()=>{
    let w=newCampaignWorld();
    expect(()=>act(w,{type:'commission'})).toThrow('抵达');
    act(w,{type:'travel',destination:'jingkou'});advance(w,planRoute('jiankang','jingkou')!.days);
    act(w,{type:'commission'});const coins=w.people[0].coins;
    expect(()=>act(w,{type:'commission'})).toThrow('没有');expect(w.people[0].coins).toBe(coins);
    act(w,{type:'build',scope:'city',site:'jingkou',building:'market'});
    act(w,{type:'build',scope:'estate',site:'jiankang',building:'fields'});
    advance(w,5);w=parseWorld(serializeWorld(w));advance(w,10);
    expect(w.campaign?.status).toBe('active');expect(campaignGoals(w).filter(g=>g.done)).toHaveLength(3);
    act(w,{type:'travel',destination:'jiankang'});advance(w,planRoute('jingkou','jiankang')!.days);
    expect(w.campaign?.status).toBe('won');expect(w.day).toBeLessThan(120);expect(campaignGoals(w).every(g=>g.done)).toBe(true);
    const terminal=serializeWorld(w);advance(w,50);expect(serializeWorld(w)).toBe(terminal);
    expect(()=>act(w,{type:'provision'})).toThrow('结束');expect(parseWorld(terminal)).toEqual(w);
  });
  it('ends at the deadline, freezes and preserves a loss through export/import',()=>{
    const w=newCampaignWorld();advance(w,130);expect(w.day).toBe(120);expect(w.campaign).toMatchObject({status:'lost',finishedDay:120});expect(parseWorld(serializeWorld(w))).toEqual(w);
  });
  it('rejects corrupt campaign state and leaves older sandbox saves playable',()=>{
    const old=newWorld();advance(old,121);expect(parseWorld(serializeWorld(old)).campaign).toBeUndefined();
    const w=newCampaignWorld();w.campaign!.status='won';w.campaign!.finishedDay=0;expect(()=>validateWorld(w)).toThrow();
    w.campaign!.status='active';w.campaign!.finishedDay=null;w.campaign!.appointed=true;expect(()=>validateWorld(w)).toThrow();
  });
});

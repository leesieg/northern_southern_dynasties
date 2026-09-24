import { describe,it,expect } from 'vitest';
import { historicalCharacters,characterById,characterRelations,relationsFor,startRules,familyNames } from './characters';
import { siteById } from './scenario';
import { newCampaignWorld,act,advance } from '../core/world';
import { parseWorld,serializeWorld,validateWorld } from '../core/save';
import { campaignGoals } from '../core/campaign';
import type { CityBuilding } from '../core/construction';

describe('546 historical character starts',()=>{
  it('links unique, sourced people, known cities and resolvable relationships',()=>{
    expect(new Set(historicalCharacters.map(c=>c.id)).size).toBe(historicalCharacters.length);
    expect(new Set(historicalCharacters.map(c=>c.polity))).toEqual(new Set(['liang','east','west']));
    for(const c of historicalCharacters){expect(siteById[c.home]).toBeDefined();expect(familyNames[c.family]).toBeDefined();expect(c.sources.length).toBeGreaterThan(0);expect(c.sources.every(s=>s.url.startsWith('https://zh.wikisource.org/'))).toBe(true);}
    for(const r of characterRelations){expect(characterById[r.from]).toBeDefined();expect(characterById[r.to]).toBeDefined();expect(r.from).not.toBe(r.to);expect(relationsFor(r.to).some(link=>link.id===r.from)).toBe(true);}
    expect(characterById['xiao-yi'].home).toBe('xunyang');expect(characterById['gao-yang'].title).not.toContain('皇帝');
  });
  for(const c of historicalCharacters)it(`${c.name} can finish a distinct, affordable start and restore the selected identity`,()=>{
    let w=newCampaignWorld(c.id);const rules=startRules(c);
    expect(w.people[0]).toMatchObject({id:'player',name:c.name,location:c.home,home:c.home,coins:rules.coins});
    expect(w.holdings.estate).toMatchObject({family:c.family,location:c.home});expect(w.holdings.governedCities).toEqual([c.home]);
    expect(()=>act(w,{type:'commission'})).toThrow('没有');
    act(w,{type:'build',scope:'estate',site:c.home,building:'fields'});
    for(const building of ['market','granary','hostel'] as CityBuilding[]){
      for(let level=1;level<=rules[building];level++){
        act(w,{type:'build',scope:'city',site:c.home,building});
        advance(w,1);w=parseWorld(serializeWorld(w));
        advance(w,w.holdings.cities[c.home].project!.due-w.day);
      }
    }
    if(w.day<30)advance(w,30-w.day);
    expect(w.campaign?.status).toBe('won');expect(campaignGoals(w).every(g=>g.done)).toBe(true);expect(w.people[0].coins).toBeGreaterThanOrEqual(0);expect(parseWorld(serializeWorld(w)).characterId).toBe(c.id);
  });
  it('rejects forged characters, mixed identities and deleted identity metadata',()=>{
    expect(()=>newCampaignWorld('__proto__')).toThrow('选择');
    let w=newCampaignWorld('gao-huan');w.people[0].name='萧衍';expect(()=>validateWorld(w)).toThrow();
    w=newCampaignWorld('gao-huan');w.holdings.estate.family='shen';expect(()=>validateWorld(w)).toThrow();
    w=newCampaignWorld('gao-huan');delete w.characterId;expect(()=>validateWorld(w)).toThrow();
    w=newCampaignWorld('gao-huan');w.characterId='__proto__';expect(()=>validateWorld(w)).toThrow();
    expect(parseWorld(serializeWorld(newCampaignWorld())).characterId).toBeUndefined();
  });
});

import {it,expect} from 'vitest';
import {portraitRank} from './portraitRank';
import {newCampaignWorld} from '../core/world';

it('开局按身份区分帝王、执政、将领、宗室与行旅',()=>{
 expect(portraitRank('xiao-yan')).toBe('sovereign');expect(portraitRank('gao-huan')).toBe('official');
 expect(portraitRank('dugu-xin')).toBe('commander');expect(portraitRank('yuan-qin')).toBe('noble');expect(portraitRank('fictional')).toBe('adventurer');
 const w=newCampaignWorld('gao-huan',undefined,'sandbox');expect(portraitRank('dugu-xin',w)).toBe('commander');expect(portraitRank('gao-huan',w)).toBe('official');
});
it('受禅与公职变化读取当前官制，旧君主不保留帝王框，女性任职同样生效',()=>{
 const w=newCampaignWorld('gao-huan',undefined,'sandbox'),g=w.realm!.governments!.realms.east;
 g.ruler='gao-yang';expect(portraitRank('gao-yang',w)).toBe('sovereign');expect(portraitRank('yuan-shanjian',w)).not.toBe('sovereign');
 expect(portraitRank('guest-east',w)).toBe('adventurer');w.realm!.cities.ye.governor='guest-east';
 expect(portraitRank('guest-east',w)).toBe('official');w.realm!.cities.ye.governor=null;expect(portraitRank('guest-east',w)).toBe('adventurer');
});

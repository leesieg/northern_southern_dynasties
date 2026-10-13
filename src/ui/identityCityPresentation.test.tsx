import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {bannerSvg} from './heraldry';
import {FamilyCrest} from './FamilyCrest';
import {RealmBadge} from './RealmBadge';
import {TerritoryTabs} from './TerritoryNavigation';
import {FamilyPanel} from './FamilyPanel';
import {CityTravelPanel} from './CityTravelPanel';
import {taxPreview} from './CityPolicyDialog';
import {newCampaignWorld} from '../core/world';
import {cityYield} from '../core/realm';
import {families} from '../data/families';

describe('approved identity and city presentation boundaries',()=>{
 it('keeps compound surnames and distinguishes branches in accessible identity',()=>{
  for(const surname of ['宇文','独孤','侯莫陈']){
   const family=families.find(f=>f.surname===surname)!;expect(family).toBeDefined();
   const html=render(<FamilyCrest family={family.id}/>);expect(html).toContain(family.name);
   for(const c of surname)expect(html).toContain('>'+c+'</text>');
   expect(html).toContain(family.originKind);
  }
  const branches=families.filter(f=>f.surname==='崔');expect(branches.length).toBeGreaterThan(1);
  expect(new Set(branches.map(f=>render(<FamilyCrest family={f.id}/>)))).toHaveLength(branches.length);
 });
 it('uses the flag renderer even for former round-seal entrances and preserves full reign names',()=>{
  for(const name of ['东魏','西魏','周','齐','长国号测试']){
   const html=render(<RealmBadge realm="west" name={name} seal onOpen={()=>{}}/>);
   expect(html).toContain('realm-flag-art');expect(html).toContain(name+' · 国家详情');
   for(const char of name)expect(html).toContain('>'+char+'</text>');
   expect(html).not.toContain('<circle');
  }
 });
 it('escapes custom dynasty labels before generating markup',()=>{
  const html=bannerSvg('<img onerror="bad">','liang','test');expect(html).not.toContain('<img');expect(html).toContain('&lt;');expect(html).toContain('&quot;');
 });
 it('previews taxes using the settlement yield without changing the world',()=>{
  const w=newCampaignWorld('xiao-yan',undefined,'sandbox'),before=structuredClone(w);
  for(const tax of ['light','normal','heavy'] as const){const quote=taxPreview(w,'jiankang',tax),draft=structuredClone(w);draft.realm!.cities.jiankang.tax=tax;expect(quote.after).toBe(cityYield(draft,'jiankang').coins);expect(quote.before).toBe(cityYield(w,'jiankang').coins);}
  expect(w).toEqual(before);
 });
 it('retains nine city and eight regional tabs with only the selected state active',()=>{
  const onTab=vi.fn();for(const regional of [false,true]){const html=render(<TerritoryTabs tab="finance" peopleCount={0} onTab={onTab} regional={regional}/>);expect(html.match(/<button/g)).toHaveLength(regional?8:9);expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);expect(html).toContain('公库');}expect(onTab).not.toHaveBeenCalled();
 });
 it('family navigation and travel drafts neither spend resources nor create relatives',()=>{
  const world=newCampaignWorld('xiao-yan',undefined,'sandbox'),before=structuredClone(world),send=vi.fn(async()=>true),onPerson=vi.fn();
  for(const chapter of ['tree','contributions'] as const){const html=render(<FamilyPanel world={world} selected="xiao-yan" chapter={chapter} onSelect={onPerson} onPerson={onPerson}/>);expect(html).toContain('兰陵萧氏');}
  const html=render(<CityTravelPanel world={world} site="moling" pending={false} send={send}/>);expect(html).toContain('整备行粮');expect(html).toContain('查看行程并启程');expect(send).not.toHaveBeenCalled();expect(onPerson).not.toHaveBeenCalled();expect(world).toEqual(before);
 });
});

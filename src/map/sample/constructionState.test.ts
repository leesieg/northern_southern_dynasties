import {describe,it,expect} from 'vitest';
import {advanceDemoConstruction,buildingAppearance,constructionQuote,newConstructionDemo,startDemoConstruction} from './constructionState';
describe('isolated construction sample uses production rules',()=>{
 it('quotes, pays once, progresses and completes a building before upgrading',()=>{
  const w=newConstructionDemo(),q=constructionQuote(w,'luoyang','market');expect(q).toEqual({cost:80,days:15,level:1,reason:''});
  startDemoConstruction(w,'luoyang','market');expect(w.people[0].coins).toBe(1920);expect(buildingAppearance(w,'luoyang','market')).toMatchObject({level:0,target:1,phase:0});
  expect(()=>startDemoConstruction(w,'luoyang','market')).toThrow();expect(w.people[0].coins).toBe(1920);
  advanceDemoConstruction(w,5);expect(buildingAppearance(w,'luoyang','market')).toMatchObject({level:0,phase:1,remaining:10});
  advanceDemoConstruction(w,5);expect(buildingAppearance(w,'luoyang','market').phase).toBe(2);
  advanceDemoConstruction(w,5);expect(buildingAppearance(w,'luoyang','market')).toMatchObject({level:1,target:null,phase:null});
  expect(w.holdings.cities.changan.levels.market).toBe(0);expect(constructionQuote(w,'luoyang','market')).toMatchObject({level:2,cost:160,days:30});
  startDemoConstruction(w,'luoyang','market');expect(buildingAppearance(w,'luoyang','market')).toMatchObject({level:1,target:2});
 });
 it('enforces a single active city project, level cap, funds and independent reset',()=>{
  const w=newConstructionDemo();startDemoConstruction(w,'luoyang','granary');expect(constructionQuote(w,'luoyang','hostel').reason).toBe('已有工程进行中');
  advanceDemoConstruction(w,12);w.holdings.cities.luoyang.levels.granary=3;expect(constructionQuote(w,'luoyang','granary').reason).toBe('已达最高等级');
  w.people[0].coins=0;expect(()=>startDemoConstruction(w,'changan','hostel')).toThrow('盘缠不足');expect(w.holdings.cities.changan.project).toBeNull();
  expect(newConstructionDemo().holdings.cities.luoyang.levels.granary).toBe(0);expect(()=>advanceDemoConstruction(w,-1)).toThrow();
 });
});

it('previews actual construction state across the national settlement list, not just Heluo',async()=>{
 const {sites,siteById}=await import('../../data/scenario');
 const {controlledSite}=await import('../campaignDomains');
 const {campaignCityAppearance}=await import('../campaignScenery');
 const initial=newConstructionDemo(),ids=sites.filter(s=>controlledSite(initial,s.id)).map(s=>s.id),world=newConstructionDemo(ids);
 for(const id of ids)expect(world.holdings.cities[id],id).toBeDefined();
 for(const id of ['jiankang','chengdu','guangzhou','wuwei','ye','changan']){
  startDemoConstruction(world,id,'market');
  expect(campaignCityAppearance(world,siteById[id])).toMatchObject({project:0,progress:0});
 }
 advanceDemoConstruction(world,15);
 for(const id of ['jiankang','chengdu','guangzhou','wuwei','ye','changan'])expect(campaignCityAppearance(world,siteById[id])).toMatchObject({project:-1,levels:[1,0,0]});
 expect(world.holdings.cities.luoyang.levels.market).toBe(0);
 expect(newConstructionDemo(ids).holdings.cities.jiankang.levels.market).toBe(0);
});

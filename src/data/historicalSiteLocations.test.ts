import {it,expect} from 'vitest';
import {historicalSiteLocations} from './historicalSiteLocations';
import {sites,siteById,roads} from './scenario';
import {legDays,planRoute,newWorld} from '../core/world';
import {parseWorld,serializeWorld} from '../core/save';
import {campaignCityMeters} from '../map/campaignScenery';
it('uses sourced historical anchors without changing site identities or duplicating city points',()=>{
 expect(sites).toHaveLength(113);expect(new Set(sites.map(s=>s.id)).size).toBe(113);expect(new Set(sites.map(s=>s.lon+','+s.lat)).size).toBe(113);
 for(const [id,entry] of Object.entries(historicalSiteLocations)){expect(siteById[id]).toMatchObject({lon:entry.lon,lat:entry.lat});expect(entry.source).toMatch(/^https:\/\//);expect(entry.note.length).toBeGreaterThan(10);}
 expect(siteById.yubi.lat).toBeCloseTo(35.57083,4);expect(siteById.yubi.description).toContain('高台');expect(siteById.liyang.lon).toBeLessThan(119);expect(siteById.yinxian.lat).toBeLessThan(29.72);expect(siteById.luoyang.lon).toBeGreaterThan(112.6);expect(campaignCityMeters(siteById.yubi,false)).toBe(700);
});
it('keeps previously booked edge durations valid after moving an endpoint',()=>{
 const w=newWorld(),days=roads.find(r=>r.from==='changan'&&r.to==='luoyang')!.days!;
 expect(days).toBe(10);expect(legDays('changan','luoyang')).toBe(days);w.people[0].location='changan';w.people[0].journey={route:['changan','luoyang'],durations:[days],leg:0,elapsed:1,started:0};w.day=1;
 const loaded=parseWorld(serializeWorld(w));expect(loaded.people[0].journey).toEqual(w.people[0].journey);expect(loaded.people[0].food).toBe(w.people[0].food);expect(planRoute('changan','luoyang')!.route).toContain('hongnong');
});

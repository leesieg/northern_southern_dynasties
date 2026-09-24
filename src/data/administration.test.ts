import { describe,expect,it } from 'vitest';
import { administration, countyGroups, countySeats, historySources } from './administration';
import { sites,siteById } from './scenario';
import prefectures from './prefectures.json';
describe('546 gazetteer boundaries and references',()=>{
  it('separates contemporary evidence from older baselines and keeps references for every claim',()=>{
    expect(administration.ye.prefecture).toBe('魏尹');expect(administration.ye.province).toBe('司州');
    expect(administration.kuaiji.county).toBe('山阴县');expect(administration.kuaiji.province).toBe('东扬州');
    expect(administration.jiankang.status).toBe('earlier-source');
    for(const [id,a] of Object.entries(administration)){
      expect(siteById[id]).toBeDefined();expect(a.sources.length).toBeGreaterThan(0);
      for(const source of a.sources)expect(historySources[source].url).toMatch(/^https:/);
      expect(a.note.length).toBeGreaterThan(10);
    }
  });
  it('maps only documented county names, with missing seats kept out of the geometry',()=>{
    expect(countySeats).toHaveLength(19);expect(sites).toHaveLength(53);
    for(const [id] of countySeats){const a=administration[id];expect(countyGroups[a.group as keyof typeof countyGroups] as readonly string[]).toContain(a.county.replace(/县$/,''));}
    expect(countyGroups.weiyin).toHaveLength(13);
    expect(sites.some(s=>s.id==='yiyang-weiyin')).toBe(false);
    expect(prefectures.features).toHaveLength(new Set(Object.values(administration).map(a=>a.group)).size);
  });
});

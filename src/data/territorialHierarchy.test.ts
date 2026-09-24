import { describe,expect,it } from 'vitest';
import { territoryNodes,childrenOf,descendantSites,ancestorsOf,nodeForSite,nodesForYear,controlEvents,controlsRecordedBy } from './territorialHierarchy';
import { sites,siteById } from './scenario';
import geometry from './hierarchy-geometry.json';
describe('independent territorial hierarchy',()=>{
  it('has five distinct levels for researched cities and no cycles or missing parents',()=>{
    expect(ancestorsOf('city:jiankang').map(n=>n.level)).toEqual(['realm','province','prefecture','county','city']);
    for(const node of Object.values(territoryNodes)){
      if(node.parent)expect(territoryNodes[node.parent]).toBeDefined();
      const chain=ancestorsOf(node.id);expect(new Set(chain.map(n=>n.id)).size).toBe(chain.length);
      expect(descendantSites(node.id).length).toBeGreaterThan(0);
    }
  });
  it('keeps counties separate from construction cities and preserves parent membership',()=>{
    expect(childrenOf('county:jiankang').map(n=>n.id)).toEqual(['city:jiankang']);
    expect(descendantSites('prefecture:danyang')).toHaveLength(8);
    expect(nodeForSite('jurong','province').name).toBe('扬州');
    expect(nodeForSite('jurong','realm').name).toBe('梁');
    const ids=Object.values(territoryNodes).filter(n=>n.level==='city').map(n=>n.site);
    expect(new Set(ids).size).toBe(sites.length);
  });
  it('leaves unresolved hierarchy absent instead of inventing counties',()=>{
    expect(ancestorsOf('city:gaochang').map(n=>n.level)).toEqual(['realm','city']);
    expect(nodeForSite('gaochang','county').basis).toBe('unresolved');
    expect(nodesForYear(546).length).toBeGreaterThan(0);
    expect(nodesForYear(554)).toEqual([]);
  });
  it('only associates schematic geometry with actual administrative nodes',()=>{
    for(const feature of geometry.features){
      expect(territoryNodes[feature.properties.id].level).not.toBe('city');
      expect(feature.properties.geometryStatus).toBe('schematic');
    }
    expect(geometry.features).toHaveLength(Object.values(territoryNodes).filter(n=>n.level!=='city').length);
  });
  it('dates sourced capture records without implying county transfers or continuous control',()=>{
    expect(controlsRecordedBy(552)).toEqual([]);expect(controlsRecordedBy(553).map(e=>e.site)).toEqual(['chengdu']);
    expect(controlsRecordedBy(554)).toHaveLength(2);
    for(const event of controlEvents){expect(siteById[event.site]).toBeDefined();expect(event.source).toMatch(/^https:/);expect(event.precision).toBe('year');}
    expect(territoryNodes['city:jiangling'].parent).toBe('county:jiangling');
  });
});

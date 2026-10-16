import {describe,it,expect} from 'vitest';
import {assertScenarioMap,mapTemplate,scenarioMapIssues} from './scenarioMap';
import type {ContentPackage} from '../core/contentPackage';
const base={tables:{scenario:{sites:[{id:'jiankang',name:'建康',lon:118.8,lat:32,polity:'liang',terrain:'平原',description:''}],siteById:{jiankang:{id:'jiankang'}}},administration:{administration:{}},territorialHierarchy:{territoryNodes:{'realm:liang':{id:'realm:liang',name:'梁',level:'realm',parent:null,basis:'scenario',from:546,until:547},'city:jiankang':{id:'city:jiankang',name:'建康',level:'city',parent:'realm:liang',site:'jiankang',basis:'scenario',from:546,until:547}}},roadCorridors:{roadCorridors:{}}}} as unknown as ContentPackage;
const template=()=>mapTemplate({sites:{jiankang:{id:'jiankang',name:'建康',lon:118.8,lat:32,source:'测试'}},roads:{},geography:{map:{id:'map',boundaries:{mode:'retained',source:'测试',anchors:null,value:null}}}},base);
describe('scenario map contract',()=>{
 it('makes an independent snapshot and preserves node sources',()=>{const m=template();expect(()=>assertScenarioMap(m)).not.toThrow();m.nodes['city:jiankang'].name='新县治';expect((base.tables.territorialHierarchy.territoryNodes as any)['city:jiankang'].name).toBe('建康');});
 it('rejects prototype keys and nonfinite positions',()=>{const m=template();m.sites.jiankang.lon=NaN;expect(()=>assertScenarioMap(m)).toThrow();const p=template();p.templates=JSON.parse('{"__proto__":"jiankang"}');expect(()=>assertScenarioMap(p)).toThrow();});
 it('requires reviewed boundaries when adding sites',()=>{const m=template();m.sites.new={...m.sites.jiankang,id:'new',lon:119};m.templates.new='jiankang';expect(scenarioMapIssues(m,base,546).some(i=>i.message.includes('边界'))).toBe(true);});
 it('rejects invalid dates and parent cycles before compilation',()=>{const m=template();m.nodes['city:jiankang'].parent='city:jiankang';m.nodes['realm:liang'].from=545;m.nodes['realm:liang'].until=546;const errors=scenarioMapIssues(m,base,546);expect(errors.some(i=>i.message.includes('层级'))).toBe(true);expect(errors.some(i=>i.message.includes('有效期'))).toBe(true);});
 it('rejects roads with missing or repeated endpoints',()=>{const m=template();m.roads.bad={id:'bad',from:'jiankang',to:'unknown',factor:1,days:null,legacyOnly:false,source:'测试'};expect(scenarioMapIssues(m,base,546).some(i=>i.message.includes('道路端点'))).toBe(true);});
});

import {describe,it,expect} from 'vitest';
import {assertPolitics,validatePoliticalReferences,type PoliticalDefinition} from './politicalDefinition';
const definition=():PoliticalDefinition=>({realms:[{id:'realm-1',name:'甲',short:'甲',color:'#668b7b',template:'liang',capital:'a',ruler:'chief',executives:['minister'],source:'技术测试，不是史实'}],nativeEvents:[]});
const sites={a:{polity:'realm-1'}},people={chief:{polity:'realm-1'},minister:{polity:'realm-1'}},births={chief:{year:500},minister:{year:501}};
describe('declarative political initial state',()=>{
 it('preserves the default branch and accepts an explicit independent polity',()=>{expect(()=>assertPolitics(null)).not.toThrow();expect(()=>validatePoliticalReferences(definition(),sites,people,births,546)).not.toThrow();});
 it.each([
  (v:PoliticalDefinition)=>{v.realms[0].id='realm-99';},
  (v:PoliticalDefinition)=>{v.realms.push({...v.realms[0]});},
  (v:PoliticalDefinition)=>{v.realms[0].executives=[];},
  (v:PoliticalDefinition)=>{v.realms[0].executives=['minister','minister'];},
  (v:PoliticalDefinition)=>{v.realms[0].source='';},
  (v:PoliticalDefinition)=>{v.nativeEvents=['unknown'];},
 ])('rejects malformed or unsupported declarations',mutate=>{const v=definition();mutate(v);expect(()=>assertPolitics(v)).toThrow();});
 it('rejects foreign, missing or underage rulers and unconfigured affiliations',()=>{
  for(const roster of [{...people,chief:{polity:'east'}},{minister:people.minister}])expect(()=>validatePoliticalReferences(definition(),sites,roster,births,546)).toThrow();
  expect(()=>validatePoliticalReferences(definition(),sites,people,births,510)).toThrow();
  expect(()=>validatePoliticalReferences(definition(),{a:{polity:'east'}},people,births,546)).toThrow();
  expect(()=>validatePoliticalReferences(definition(),sites,{...people,ghost:{polity:'east'}},births,546)).toThrow();
 });
 it('allows a child ruler only with a separate adult executive',()=>{const b={...births,chief:{year:540}};expect(()=>validatePoliticalReferences(definition(),sites,people,b,546)).not.toThrow();const v=definition();v.realms[0].executives=['chief'];expect(()=>validatePoliticalReferences(v,sites,people,b,546)).toThrow();});
 it('rejects shared rulers and capitals across initial polities',()=>{const v=definition();v.realms.push({...v.realms[0],id:'realm-2'});expect(()=>assertPolitics(v)).toThrow('首都');v.realms[1].capital='b';expect(()=>assertPolitics(v)).toThrow('多个');});
 it('requires native event dependencies instead of inheriting the official story',()=>{const v=definition();v.nativeEvents=['hou-jing'];expect(()=>validatePoliticalReferences(v,sites,people,births,546)).toThrow('侯景');});
});
